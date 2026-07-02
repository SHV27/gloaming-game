import type {
  GState,
  Player,
  LogTone,
  GameoverState,
  FlashKind,
  EventCard,
  TileAction,
  Act,
} from './types';
import { RING_OF, OUTER_RING } from './board';
import type { HeroId } from './heroes';
import {
  TORCH_MAX,
  MOVE_DARK_COST,
  DARK_KNOCK,
  NIGHTMARE_SNUFF,
  RELIGHT_TORCH,
  LANTERN_CARRY_STRIDE_PEN,
  MIN_STRIDE,
  LANTERN_COUNT,
  darkBiteFor,
  actFromDeepestRing,
  ACT_NAMES,
} from './constants';

type Roll = { Number: () => number; Die: (n: number) => number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── logging / cues ──────────────────────────────────────────────────────────
export function log(G: GState, text: string, tone: LogTone = 'neutral'): void {
  G.log.push({ id: G.logSeq++, turn: G.round, text, tone });
  if (G.log.length > 60) G.log.shift();
}
export function flash(G: GState, kind: FlashKind, nodeId?: number): void {
  G.flash = { kind, nonce: G.flashSeq++, nodeId };
}

// ── The Torch (your life, a flame) ──────────────────────────────────────────
export function refuel(p: Player): void {
  if (p.wisp) return;
  p.torch = TORCH_MAX;
}
/** Burn the torch; at 0 the bearer becomes a Wisp (the softlock floor). */
export function burnTorch(G: GState, p: Player, amount: number): void {
  if (p.wisp || amount <= 0) return;
  p.torch = clamp(p.torch - amount, 0, TORCH_MAX);
  if (p.torch === 0) toWisp(G, p);
}
export function gainTorch(p: Player, amount: number): void {
  if (p.wisp) return;
  p.torch = clamp(p.torch + amount, 0, TORCH_MAX);
}
export function toWisp(G: GState, p: Player): void {
  if (p.wisp) return;
  p.wisp = true;
  p.torch = 0;
  dropCarried(G, p, p.nodeId); // a Wisp cannot carry — its Lanterns fall where it stood
  flash(G, 'wisp');
  log(G, `${p.name}'s torch gutters out — they drift now, a Wisp in the dark.`, 'dread');
}
export function relight(G: GState, rescuer: Player, wispId: string): boolean {
  const t = G.players[wispId];
  if (!t || !t.wisp || t.id === rescuer.id) return false;
  // THE EMBER-HEARTED reaches one tile over; everyone else must share the tile.
  const adjacent =
    rescuer.hero === 'emberheart' &&
    G.nodes[rescuer.nodeId].neighbors.includes(t.nodeId) &&
    !isVoid(G, t.nodeId);
  if (t.nodeId !== rescuer.nodeId && !adjacent) return false;
  t.wisp = false;
  t.torch = RELIGHT_TORCH;
  flash(G, 'relight', t.nodeId);
  log(G, `${rescuer.name} cups their hands and breathes ${t.name} back into the light.`, 'fellow');
  return true;
}

// ── The Lanterns (carried objects) ──────────────────────────────────────────
export function lanternOnNode(G: GState, nodeId: number) {
  return G.lanterns.find((l) => !l.delivered && l.carriedBy === null && l.nodeId === nodeId);
}
export function grabLantern(G: GState, p: Player): boolean {
  if (p.wisp) return false;
  const l = lanternOnNode(G, p.nodeId);
  if (!l) return false;
  l.nodeId = null;
  l.carriedBy = p.id;
  p.carrying.push(l.id);
  refuel(p); // a Lantern is a light source — hoisting it fills your torch (PLAN §B.2)
  flash(G, 'grab', p.nodeId);
  log(G, `${p.name} hoists a Lantern — its warmth fills their torch, though its weight drags.`, 'hope');
  return true;
}
/** Drop every Lantern a player carries onto `nodeId` (where they fell / were caught). */
export function dropCarried(G: GState, p: Player, nodeId: number): number[] {
  const dropped = [...p.carrying];
  for (const id of dropped) {
    const l = G.lanterns.find((x) => x.id === id)!;
    l.carriedBy = null;
    l.nodeId = nodeId;
  }
  p.carrying = [];
  return dropped;
}
export function deliverAtGate(G: GState, p: Player): boolean {
  if (p.wisp || p.nodeId !== G.gateId || p.carrying.length === 0) return false;
  const n = p.carrying.length;
  for (const id of p.carrying) {
    const l = G.lanterns.find((x) => x.id === id)!;
    l.carriedBy = null;
    l.nodeId = G.gateId;
    l.delivered = true;
  }
  p.carrying = [];
  refuel(p); // the Gate's warmth
  G.lanternsDelivered = G.lanterns.filter((l) => l.delivered).length;
  flash(G, 'deliver', G.gateId);
  log(
    G,
    `${p.name} sets ${n > 1 ? n + ' Lanterns' : 'a Lantern'} at the Gate — ${G.lanternsDelivered} of ${LANTERN_COUNT} home.`,
    'hope',
  );
  return true;
}

// ── The Dark (the doom clock, made spatial) ─────────────────────────────────
export const isVoid = (G: GState, id: number) => G.dark.includes(id);

/** The next `k` tiles the dark will eat: deepest surviving ring first (never the
 *  Gate until it is all that remains — then the Gate falls = loss). Deterministic. */
export function frontierTiles(G: GState, k: number): number[] {
  const survivors = G.nodes.filter((n) => !isVoid(G, n.id) && n.id !== G.gateId);
  if (survivors.length === 0) return isVoid(G, G.gateId) ? [] : [G.gateId];
  survivors.sort((a, b) => RING_OF[b.id] - RING_OF[a.id] || a.id - b.id);
  return survivors.slice(0, Math.max(0, k)).map((n) => n.id);
}
/** The deepest (outermost) surviving ring — drives the Act. */
export function deepestSurvivingRing(G: GState): number {
  let deepest = 0;
  for (const n of G.nodes) if (!isVoid(G, n.id) && RING_OF[n.id] > deepest) deepest = RING_OF[n.id];
  return deepest;
}
/** A surviving tile one ring OUTWARD (toward the dark) — the Nightmare shoves you
 *  here, away from the safe center. Falls back to staying put if the edge is void. */
export function sweepOutward(G: GState, fromId: number): number {
  const here = RING_OF[fromId];
  const neigh = G.nodes[fromId].neighbors.filter((m) => !isVoid(G, m) && m !== G.gateId);
  const outer = neigh.filter((m) => RING_OF[m] > here).sort((a, b) => RING_OF[b] - RING_OF[a]);
  if (outer.length) return outer[0];
  if (neigh.length) return neigh.sort((a, b) => RING_OF[b] - RING_OF[a])[0];
  return fromId; // ringed in by void — no shove
}
/** Nearest surviving tile one ring inward (used to sweep occupants of an eaten tile). */
export function sweepInward(G: GState, fromId: number): number {
  const here = RING_OF[fromId];
  const neigh = G.nodes[fromId].neighbors.filter((m) => !isVoid(G, m));
  const inner = neigh.filter((m) => RING_OF[m] < here).sort((a, b) => RING_OF[a] - RING_OF[b]);
  if (inner.length) return inner[0];
  if (neigh.length) return neigh.sort((a, b) => RING_OF[a] - RING_OF[b])[0];
  // fully surrounded by void → BFS to the nearest surviving tile, else the Gate
  const seen = new Set([fromId]);
  let frontier = [fromId];
  while (frontier.length) {
    const next: number[] = [];
    for (const c of frontier)
      for (const m of G.nodes[c].neighbors) {
        if (seen.has(m)) continue;
        if (!isVoid(G, m)) return m;
        seen.add(m);
        next.push(m);
      }
    frontier = next;
  }
  return G.gateId;
}
/** The dark eats `k` frontier tiles; sweeps caught players/lanterns/Nightmare inward. */
export function eatFrontier(G: GState, k: number): void {
  const toEat = frontierTiles(G, k);
  if (toEat.length === 0) return;
  for (const id of toEat) if (!isVoid(G, id)) G.dark.push(id);
  flash(G, 'dark-eat', toEat[0]);

  for (const p of Object.values(G.players)) {
    if (!isVoid(G, p.nodeId)) continue;
    const dest = sweepInward(G, p.nodeId);
    dropCarried(G, p, dest); // Lanterns are wrenched from you as the tile falls (dropped on solid ground)
    p.nodeId = dest;
    log(G, `The floor gives way beneath ${p.name} — they scramble inward as the dark pours through.`, 'dread');
    burnTorch(G, p, DARK_KNOCK);
  }
  for (const l of G.lanterns) {
    if (l.carriedBy === null && !l.delivered && l.nodeId != null && isVoid(G, l.nodeId)) {
      l.nodeId = sweepInward(G, l.nodeId);
    }
  }
  if (isVoid(G, G.nightmare.nodeId)) {
    const nm = sweepInward(G, G.nightmare.nodeId);
    // if swept to the warded Gate, hop to a surviving non-Gate neighbour of it instead
    G.nightmare.nodeId =
      nm === G.gateId
        ? G.nodes[G.gateId].neighbors.find((m) => !isVoid(G, m)) ?? nm
        : nm;
  }
}

// ── BFS over surviving tiles (the Nightmare and reachability) ────────────────
function bfsNextStep(
  G: GState,
  from: number,
  goals: Set<number>,
  blocked?: (id: number) => boolean,
): number | null {
  if (goals.has(from)) return null;
  const prev = new Map<number, number>();
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of G.nodes[cur].neighbors) {
      if (seen.has(n) || isVoid(G, n) || (blocked && blocked(n) && !goals.has(n))) continue;
      seen.add(n);
      prev.set(n, cur);
      if (goals.has(n)) {
        let x = n;
        while (prev.get(x) !== from) x = prev.get(x)!;
        return x;
      }
      q.push(n);
    }
  }
  return null;
}
/** Tiles reachable within `stride` graph-steps over surviving edges (for the glow). */
export function reachable(G: GState, from: number, stride: number): Set<number> {
  const out = new Set<number>();
  let frontier = [from];
  const dist = new Map([[from, 0]]);
  while (frontier.length) {
    const next: number[] = [];
    for (const c of frontier) {
      const d = dist.get(c)!;
      if (d >= stride) continue;
      for (const m of G.nodes[c].neighbors) {
        if (isVoid(G, m) || dist.has(m)) continue;
        dist.set(m, d + 1);
        out.add(m);
        next.push(m);
      }
    }
    frontier = next;
  }
  out.delete(from);
  return out;
}

// ── The Nightmare (embodied hunter) ─────────────────────────────────────────
const nonWisp = (G: GState) => Object.values(G.players).filter((p) => !p.wisp);
/** Who the Hollow One will hunt. The Gate's light is sanctuary (a bearer on the
 *  Gate is never a target, PLAN §B.4), and THE UNSEEN is overlooked *while empty-
 *  handed* — pick up a Lantern and its light gives you away (it can still be
 *  stumbled into en route — resolved on arrival, not here). In Pitch it prefers a
 *  Lantern-bearer (WS3 crowning); the fallback chain can never strand it (H13). */
function isHidden(p: Player): boolean {
  return p.hero === 'unseen' && p.carrying.length === 0;
}
function nightmareGoals(G: GState): Set<number> {
  const exposed = nonWisp(G).filter((p) => p.nodeId !== G.gateId && !isHidden(p));
  return new Set(exposed.map((p) => p.nodeId));
}
/** One step of the Nightmare toward the nearest exposed torch; resolves a catch on
 *  arrival. It can never step onto the Gate (the last light wards it). */
export function nightmareStep(G: GState): void {
  const wardsGate = (id: number) => id === G.gateId;
  const goals = nightmareGoals(G);
  if (goals.size === 0) {
    G.nightmare.nextNodeId = null;
    return; // everyone's home or a Wisp — the Nightmare has nothing to chase
  }
  const step = bfsNextStep(G, G.nightmare.nodeId, goals, wardsGate);
  if (step !== null && step !== G.gateId) G.nightmare.nodeId = step;
  flash(G, 'nightmare', G.nightmare.nodeId);
  for (const p of nonWisp(G).filter((q) => q.nodeId === G.nightmare.nodeId && q.nodeId !== G.gateId)) {
    const dropped = dropCarried(G, p, p.nodeId);
    burnTorch(G, p, NIGHTMARE_SNUFF);
    flash(G, 'snuff', p.nodeId);
    if (!p.wisp) p.nodeId = sweepOutward(G, p.nodeId); // shoved OUT toward the dark, away from home
    log(
      G,
      dropped.length
        ? `The Nightmare falls on ${p.name} — they drop everything and are flung back toward the dark.`
        : `The Nightmare falls on ${p.name} — the cold tears through them and flings them toward the dark.`,
      'dread',
    );
  }
  // telegraph the next footfall
  const g2 = nightmareGoals(G);
  G.nightmare.nextNodeId = g2.size ? bfsNextStep(G, G.nightmare.nodeId, g2, (id) => id === G.gateId) : null;
}

// ── Events (illustrated cards — a visible board effect) ──────────────────────
export function applyEventEffect(G: GState, card: EventCard, _roll: Roll): void {
  const e = card.effect;
  switch (e.kind) {
    case 'torchAll': {
      const a = e.amount ?? 0;
      for (const p of Object.values(G.players)) {
        if (p.wisp) continue;
        if (a >= 0) gainTorch(p, a);
        else burnTorch(G, p, -a);
      }
      break;
    }
    case 'nightmareStep':
      for (let i = 0; i < (e.amount ?? 1); i++) nightmareStep(G);
      break;
    case 'darkBite':
      eatFrontier(G, e.amount ?? 1);
      break;
    case 'lanternFlare': {
      // torches sharing a tile with an on-board Lantern flare back up
      const lit = new Set(G.lanterns.filter((l) => l.nodeId != null && !l.delivered).map((l) => l.nodeId!));
      for (const p of Object.values(G.players))
        if (!p.wisp && lit.has(p.nodeId)) gainTorch(p, e.amount ?? 2);
      break;
    }
    case 'falseDawn': {
      // the most-recently-eaten tile flickers back — a foothold of hope
      if (G.dark.length) {
        for (let i = 0; i < (e.amount ?? 1) && G.dark.length; i++) G.dark.pop();
        flash(G, 'event', G.dark[G.dark.length - 1]);
      }
      break;
    }
    case 'calm':
      break;
  }
}

// ── The ③ ACT button for the tile this bearer stands on (HUD + moves share it) ─
export function getTileAction(G: GState, p: Player): TileAction {
  const onGate = p.nodeId === G.gateId;
  const carrying = p.carrying.length;
  const delivered = G.lanternsDelivered >= LANTERN_COUNT;

  // 1 · WIN — only when the whole party is here, whole, and the Lanterns are home
  if (onGate && delivered && carrying === 0) {
    const everyoneReady = Object.values(G.players).every((q) => !q.wisp && q.nodeId === G.gateId);
    if (everyoneReady)
      return {
        kind: 'stepThrough',
        label: 'Step Through the Gate',
        enabled: true,
        preview: 'Escape into the dawn — together. You win.',
      };
  }
  // 2 · DELIVER what you carry
  if (onGate && carrying > 0)
    return {
      kind: 'deliver',
      label: `Deliver ${carrying > 1 ? carrying + ' Lanterns' : 'the Lantern'}`,
      enabled: true,
      preview: `${G.lanternsDelivered + carrying}/${LANTERN_COUNT} home · torch refills`,
    };
  // 3 · GRAB a Lantern sitting here
  if (lanternOnNode(G, p.nodeId))
    return {
      kind: 'grab',
      label: 'Grab the Lantern',
      enabled: true,
      preview: 'Carry it to the Gate · you move 1 slower',
    };
  // 4 · RELIGHT a fallen ally sharing this tile (rescue beats waiting). THE
  //     EMBER-HEARTED can also reach a Wisp one tile over (its whole ability).
  const sameTileWisp = Object.values(G.players).find((q) => q.wisp && q.nodeId === p.nodeId && q.id !== p.id);
  const adjWisp =
    !sameTileWisp && p.hero === 'emberheart'
      ? Object.values(G.players).find(
          (q) => q.wisp && q.id !== p.id && G.nodes[p.nodeId].neighbors.includes(q.nodeId) && !isVoid(G, q.nodeId),
        )
      : undefined;
  const wisp = sameTileWisp ?? adjWisp;
  if (wisp)
    return {
      kind: 'relight',
      label: `Relight ${wisp.name}`,
      enabled: true,
      targetId: wisp.id,
      preview: `Bring them back with ${RELIGHT_TORCH} torch${adjWisp ? ' — from the next tile' : ''}`,
    };
  // 5 · WARM your torch at the Gate
  if (onGate && p.torch < TORCH_MAX)
    return { kind: 'warm', label: 'Warm at the Gate', enabled: true, preview: 'Refill your torch' };
  // 6 · waiting to escape — informative disabled step-through (keeps the goal legible)
  if (onGate && delivered && carrying === 0)
    return {
      kind: 'stepThrough',
      label: 'Step Through the Gate',
      enabled: false,
      reason: 'Wait for everyone to reach the Gate, torches lit — no one is left behind.',
    };
  return { kind: 'endTurn', label: 'End Turn', enabled: true };
}

// ── stride helpers ──────────────────────────────────────────────────────────
/** Steps this roll grants. THE LAMPLIGHTER ignores Lantern weight; THE SWIFT
 *  always gains +1 (both abilities are visible right here in the reach glow). */
export function strideFor(roll: number, carrying: number, hero?: HeroId): number {
  const pen = hero === 'lamplighter' ? 0 : carrying * LANTERN_CARRY_STRIDE_PEN;
  const swift = hero === 'swift' ? 1 : 0;
  return Math.max(MIN_STRIDE, roll - pen) + swift;
}
/** Torch cost to step INTO a tile (frayed edge tiles bite). */
export function stepTorchCost(G: GState, toNodeId: number): number {
  return G.fraying.includes(toNodeId) ? MOVE_DARK_COST : 0;
}

// ── Act + telegraph refresh (called after the dark eats) ─────────────────────
export function refreshAct(G: GState): Act {
  const prev = G.act;
  G.act = actFromDeepestRing(deepestSurvivingRing(G));
  if (G.act > prev) {
    flash(G, 'act-change');
    log(G, `${ACT_NAMES[G.act]} falls. The dark comes faster now.`, 'dread');
  }
  return G.act;
}
export function retelegraphDark(G: GState, numPlayers: number): void {
  const perTurn = darkBiteFor(G.act, numPlayers) / numPlayers;
  G.fraying = frontierTiles(G, Math.max(2, Math.ceil(perTurn + 0.5)));
}

// ── win / lose (pure; gloaming.ts endIf wraps this) ─────────────────────────
export function checkGameover(G: GState): GameoverState | undefined {
  const players = Object.values(G.players);
  // WIN checked first (PLAN §H.6): every player non-Wisp, on the Gate, all Lanterns home.
  if (
    players.length > 0 &&
    G.lanternsDelivered >= LANTERN_COUNT &&
    players.every((p) => !p.wisp && p.nodeId === G.gateId)
  ) {
    return { winner: 'bearers', reason: 'escaped' };
  }
  if (isVoid(G, G.gateId)) return { winner: 'dark', reason: 'swallowed' };
  return undefined;
}

export { OUTER_RING };
