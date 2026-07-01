import type {
  GState,
  Player,
  Effect,
  LogTone,
  GameoverState,
  FlashKind,
  GloamingIntent,
  Reaction,
  ReactionAction,
  IntentKind,
  OmenTone,
} from './types';
import { EDGES, edgeKey } from './board';
import { eventById } from './events';
import {
  EMBER_MAX,
  STEADY_EMBER,
  HEARTH_STEADY_BONUS,
  DEEP_EMBER,
  DEEP_NIGHT_COST,
  SURGE_AMT,
  SEAL_STRIDE_COST,
  STALK_DRAIN,
  ACT_POWERS,
  KINDLE_MAX,
  KINDLE_KEEP,
  SNUFF_COOLDOWN,
  snuffAmountFor,
} from './constants';

/** How much Ember a Kindle would pour here: bounded, and never to a Wisp. */
export function kindlePour(need: number, progress: number, ember: number): number {
  return Math.min(need - progress, KINDLE_MAX, Math.max(0, ember - KINDLE_KEEP));
}

/**
 * PURE state helpers. They mutate `G` in place (boardgame.io wraps moves in
 * immer) and are exported for headless testing. RNG only via an injected
 * `random` so tests stay deterministic.
 */

type Roll = { Number: () => number; Die: (n: number) => number };

// ── logging / cues ──────────────────────────────────────────────────────────
export function log(G: GState, text: string, tone: LogTone = 'neutral'): void {
  G.log.push({ id: G.logSeq++, turn: 0, text, tone });
  if (G.log.length > 60) G.log.shift();
}
export function flash(G: GState, kind: FlashKind, nodeId?: number): void {
  G.flash = { kind, nonce: G.flashSeq++, nodeId };
}

// ── Ember (the one resource) ────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function gainEmber(p: Player, amount: number): void {
  if (p.wisp) return; // only Rekindle lifts a Wisp
  p.ember = clamp(p.ember + amount, 0, EMBER_MAX);
}

/** Drain Ember; at 0 the bearer becomes a Wisp (the softlock floor). */
export function drainEmber(G: GState, p: Player, amount: number): void {
  if (p.wisp || amount <= 0) return;
  p.ember = clamp(p.ember - amount, 0, EMBER_MAX);
  if (p.ember === 0) {
    p.wisp = true;
    flash(G, 'wisp');
    log(G, `${p.name}'s last ember gutters out — they drift now, a Wisp in the dark.`, 'dread');
  }
}

export function addNight(G: GState, amount: number): void {
  G.night = clamp(G.night + amount, 0, G.nightMax);
}

// ── edges (the Gloaming seals roads into thorned, costly paths) ──────────────
export function isSealed(G: GState, a: number, b: number): boolean {
  const k = edgeKey(a, b);
  return G.sealedEdges.some(([x, y]) => edgeKey(x, y) === k);
}
export function strideCostFor(G: GState, a: number, b: number): number {
  return isSealed(G, a, b) ? SEAL_STRIDE_COST : 1;
}
export function sealEdge(G: GState, edge: [number, number]): boolean {
  if (isSealed(G, edge[0], edge[1])) return false;
  G.sealedEdges.push([Math.min(edge[0], edge[1]), Math.max(edge[0], edge[1])]);
  return true;
}
export function sealRandomEdgeNear(G: GState, nodeId: number, roll: Roll): boolean {
  const touching = EDGES.filter(([a, b]) => (a === nodeId || b === nodeId) && !isSealed(G, a, b));
  const pool = touching.length ? touching : EDGES.filter(([a, b]) => !isSealed(G, a, b));
  if (pool.length === 0) return false;
  return sealEdge(G, pool[Math.floor(roll.Number() * pool.length) % pool.length]);
}
export function cleanseEdgeNear(G: GState, nodeId: number): boolean {
  let idx = G.sealedEdges.findIndex(([a, b]) => a === nodeId || b === nodeId);
  if (idx === -1 && G.sealedEdges.length > 0) idx = 0;
  if (idx === -1) return false;
  G.sealedEdges.splice(idx, 1);
  return true;
}

// ── beacons (the tug-of-war) ─────────────────────────────────────────────────
export function recomputeBeaconsLit(G: GState): void {
  G.beaconsLit = G.beacons.filter((b) => b.lit).length;
}
function nearestUnlitBeacon(G: GState, fromNodeId: number): number | null {
  const from = G.nodes[fromNodeId];
  const unlit = G.beacons.filter((b) => !b.lit);
  if (unlit.length === 0) return null;
  let best = unlit[0];
  let bestD = Infinity;
  for (const b of unlit) {
    const n = G.nodes[b.nodeId];
    const d = (n.x - from.x) ** 2 + (n.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best.nodeId;
}
export function addBeaconProgress(G: GState, beaconNodeId: number, amount: number): void {
  const b = G.beacons.find((x) => x.nodeId === beaconNodeId);
  if (!b || b.lit) return;
  b.progress = clamp(b.progress + amount, 0, G.beaconNeed);
  if (b.progress >= G.beaconNeed) {
    b.lit = true;
    recomputeBeaconsLit(G);
    flash(G, 'beacon-lit', beaconNodeId);
    log(G, `A Beacon roars alight — ${G.beaconsLit} of 3 now burn against the dark.`, 'hope');
  }
}
export function snuffBeacon(G: GState, beaconNodeId: number): boolean {
  const b = G.beacons.find((x) => x.nodeId === beaconNodeId);
  if (!b || b.progress <= 0) return false;
  const back = snuffAmountFor(G.beaconNeed);
  const was = b.lit;
  b.progress = clamp(b.progress - back, 0, G.beaconNeed);
  b.lit = b.progress >= G.beaconNeed;
  recomputeBeaconsLit(G);
  flash(G, 'snuff', beaconNodeId);
  log(
    G,
    was
      ? 'The dark reaches up and crushes a lit Beacon — its fire chokes and dies back.'
      : 'A half-built Beacon shudders as the Gloaming drags it back toward cold.',
    'dread',
  );
  return true;
}

// ── omen effects (the brave branch of a drawn card) ─────────────────────────
export function applyEffect(G: GState, p: Player, e: Effect, roll: Roll): void {
  switch (e.kind) {
    case 'ember':
      if ((e.amount ?? 0) >= 0) gainEmber(p, e.amount ?? 0);
      else drainEmber(G, p, -(e.amount ?? 0));
      break;
    case 'night':
      addNight(G, e.amount ?? 0);
      break;
    case 'beaconProgress': {
      const t = nearestUnlitBeacon(G, p.nodeId);
      if (t !== null) addBeaconProgress(G, t, e.amount ?? 1);
      break;
    }
    case 'sealEdge':
      sealRandomEdgeNear(G, p.nodeId, roll);
      break;
    case 'cleanseEdge':
      cleanseEdgeNear(G, p.nodeId);
      break;
    case 'drift': {
      const n = G.nodes[p.nodeId];
      if (n.neighbors.length)
        p.nodeId = n.neighbors[Math.floor(roll.Number() * n.neighbors.length) % n.neighbors.length];
      break;
    }
  }
}

// ── BFS over the graph (sealed edges are costlier but still passable) ────────
function bfsNextStep(G: GState, from: number, goals: Set<number>): number | null {
  if (goals.has(from)) return null;
  const prev = new Map<number, number>();
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of G.nodes[cur].neighbors) {
      if (seen.has(n)) continue;
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
function bfsHops(G: GState, from: number, goals: Set<number>): number {
  if (goals.has(from)) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let d = 0;
  while (frontier.length) {
    d++;
    const next: number[] = [];
    for (const cur of frontier)
      for (const n of G.nodes[cur].neighbors) {
        if (seen.has(n)) continue;
        if (goals.has(n)) return d;
        seen.add(n);
        next.push(n);
      }
    frontier = next;
  }
  return Infinity;
}

// ── The Gloaming automa: choose + telegraph, then execute ────────────────────
const livingBearers = (G: GState): Player[] =>
  Object.values(G.players).filter((p) => p.role !== 'marked');
const nonWispBearers = (G: GState): Player[] => livingBearers(G).filter((p) => !p.wisp);

/** The party's goal nodes right now: unlit beacons, or the Threshold once 3 burn. */
function partyGoals(G: GState): Set<number> {
  if (G.beaconsLit >= 3) return new Set([G.thresholdId]);
  return new Set(G.beacons.filter((b) => !b.lit).map((b) => b.nodeId));
}

/** Choose the single most threatening intent available this Act, and telegraph it.
 *  Cunning but legible — it targets whatever best slows the party's win. */
export function chooseIntent(G: GState, _roll: Roll): GloamingIntent {
  const powers = ACT_POWERS[G.act];
  const can = (k: IntentKind) => powers.includes(k);
  const name = (p?: Player) => p?.name ?? 'the party';

  // 1 · SNUFF — drag a Beacon back. In Dusk/Gloaming it can only claw at UNLIT
  //     progress (so the party can bank beacons); only in PITCH can it crush a
  //     LIT beacon — the finale gut-punch (PLAN §B.3, §4.2). Cooldown-gated.
  if (can('snuff') && G.snuffCd <= 0) {
    const canHitLit = G.act >= 2;
    const threat = G.beacons
      .filter((b) => b.progress > 0 && (canHitLit || !b.lit))
      .sort((a, b) => Number(b.lit) - Number(a.lit) || b.progress - a.progress)[0];
    if (threat && (threat.lit || threat.progress >= G.beaconNeed - 2)) {
      // cooldown in *turns* scales with table size so snuff frequency is ~constant
      // per ROUND (the Gloaming acts every turn — otherwise big tables get crushed).
      G.snuffCd = SNUFF_COOLDOWN * Object.keys(G.players).length;
      return {
        kind: 'snuff',
        beaconNodeId: threat.nodeId,
        telegraph: threat.lit
          ? 'The dark coils around a LIT Beacon — it means to crush its fire out.'
          : 'The dark gathers to drag a half-built Beacon back toward cold.',
      };
    }
  }

  // 2 · STALK — hunt the most exposed bearer when one is faltering.
  if (can('stalk')) {
    const prey = [...nonWispBearers(G)].sort((a, b) => a.ember - b.ember)[0];
    if (prey && (G.stalker || prey.ember <= 3)) {
      return {
        kind: 'stalk',
        telegraph: G.stalker
          ? `The Stalker fixes on ${name(prey)} and quickens.`
          : `Something vast stirs in the dark, scenting ${name(prey)}.`,
      };
    }
  }

  // 3 · SEAL — thorn the road ahead of whoever leads the push.
  if (can('seal')) {
    const goals = partyGoals(G);
    const leader = [...nonWispBearers(G)].sort(
      (a, b) => bfsHops(G, a.nodeId, goals) - bfsHops(G, b.nodeId, goals),
    )[0];
    if (leader) {
      const step = bfsNextStep(G, leader.nodeId, goals);
      if (step !== null && !isSealed(G, leader.nodeId, step)) {
        return {
          kind: 'seal',
          edge: [leader.nodeId, step],
          telegraph: `Thorns gather across the road ahead of ${name(leader)}.`,
        };
      }
    }
  }

  // 4 · SURGE — the tide simply swells.
  return { kind: 'surge', telegraph: 'The night gathers itself to surge.' };
}

function spawnStalkerFar(G: GState): number {
  const bearers = nonWispBearers(G).length ? nonWispBearers(G) : livingBearers(G);
  const cx = bearers.reduce((s, p) => s + G.nodes[p.nodeId].x, 0) / Math.max(1, bearers.length);
  const cy = bearers.reduce((s, p) => s + G.nodes[p.nodeId].y, 0) / Math.max(1, bearers.length);
  let best = 0;
  let bestD = -1;
  for (const n of G.nodes) {
    const d = (n.x - cx) ** 2 + (n.y - cy) ** 2;
    if (d > bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}

/** Carry out a telegraphed intent at the board phase. */
export function executeIntent(G: GState, intent: GloamingIntent, roll: Roll): void {
  switch (intent.kind) {
    case 'surge':
      addNight(G, SURGE_AMT);
      flash(G, 'surge');
      log(G, 'The night surges — the dark gains a hand-span on you all.', 'dread');
      break;
    case 'seal': {
      const edge = intent.edge && !isSealed(G, intent.edge[0], intent.edge[1]) ? intent.edge : null;
      const did = edge ? sealEdge(G, edge) : sealRandomEdgeNear(G, G.thresholdId, roll);
      if (did) log(G, 'A road snarls shut with thorns — the way grows harder.', 'dread');
      else addNight(G, 1);
      break;
    }
    case 'snuff': {
      const canHitLit = G.act >= 2;
      const eligible = (b: (typeof G.beacons)[number]) =>
        b.progress > 0 && (canHitLit || !b.lit);
      const named =
        intent.beaconNodeId != null
          ? G.beacons.find((b) => b.nodeId === intent.beaconNodeId && eligible(b))
          : undefined;
      const target =
        named?.nodeId ??
        G.beacons.filter(eligible).sort((a, b) => b.progress - a.progress)[0]?.nodeId;
      if (target != null) snuffBeacon(G, target);
      else addNight(G, 1); // nothing to snuff — the tide swells instead
      break;
    }
    case 'stalk': {
      if (!G.stalker) {
        G.stalker = { active: true, nodeId: spawnStalkerFar(G) };
        flash(G, 'stalker');
        log(G, 'Something tall and patient unfolds from the dark and begins to walk.', 'dread');
        break;
      }
      const prey = nonWispBearers(G);
      if (prey.length === 0) break;
      const goals = new Set(prey.map((p) => p.nodeId));
      const next = bfsNextStep(G, G.stalker.nodeId, goals);
      if (next !== null) G.stalker.nodeId = next;
      flash(G, 'stalker');
      for (const p of prey.filter((q) => q.nodeId === G.stalker!.nodeId)) {
        drainEmber(G, p, STALK_DRAIN);
        log(G, `The Stalker reaches ${p.name} — a cold beyond cold tears the warmth from them.`, 'dread');
      }
      break;
    }
  }
}

// ── reaction: what BRAVE / STEADY mean where this bearer now stands ──────────
const TILE_FLAVOR: Record<string, { title: string; narration: string }> = {
  beacon: { title: 'A Beacon', narration: 'Cold iron and dead ash, hungry for ember. Feed it and it will burn back the night.' },
  wellspring: { title: 'A Wellspring', narration: 'Pale water that still remembers warmth. Drink deep and you will be filled — but the dark will gain on you while you linger.' },
  shrine: { title: 'A Shrine', narration: 'Something here will answer, if you dare ask it. What it gives is its own to choose.' },
  threshold: { title: 'The Threshold', narration: 'The gate to the dawn. It will only open for those who carry three lit Beacons behind them.' },
  hearth: { title: 'The Hearth', narration: 'Home, and the last warm stone in the world. Rest here and the fire gives a little more.' },
};

export function steadyEmberAt(G: GState, p: Player): number {
  return STEADY_EMBER + (G.nodes[p.nodeId].type === 'hearth' ? HEARTH_STEADY_BONUS : 0);
}

export function previewEffects(effects: Effect[]): string {
  const parts: string[] = [];
  for (const e of effects) {
    const a = e.amount ?? 0;
    if (e.kind === 'ember') parts.push(`${a >= 0 ? '+' : ''}${a} Ember`);
    else if (e.kind === 'night') parts.push(`${a >= 0 ? '+' : ''}${a} Night`);
    else if (e.kind === 'beaconProgress') parts.push(`+${a} to a Beacon`);
    else if (e.kind === 'sealEdge') parts.push('a road thorns over');
    else if (e.kind === 'cleanseEdge') parts.push('a road clears');
    else if (e.kind === 'drift') parts.push('you are shoved aside');
  }
  return parts.join(' · ');
}

/** Pure: the live reaction for the tile this bearer stands on. UI + moves share it. */
export function getReaction(G: GState, p: Player): Reaction {
  const node = G.nodes[p.nodeId];
  const steadyAmt = steadyEmberAt(G, p);
  const steady: ReactionAction = {
    label: 'Steady',
    enabled: true,
    preview: `+${steadyAmt} Ember · no risk`,
  };
  const flavor = TILE_FLAVOR[node.type];

  if (node.type === 'beacon') {
    const b = G.beacons.find((x) => x.nodeId === node.id)!;
    const pour = kindlePour(G.beaconNeed, b.progress, p.ember);
    const willLight = b.progress + pour >= G.beaconNeed;
    return {
      tile: 'beacon',
      tone: 'calm',
      title: flavor.title,
      narration: flavor.narration,
      brave: b.lit
        ? { label: 'Kindle the Beacon', enabled: false, reason: 'This Beacon already blazes.' }
        : {
            label: `Kindle (−${Math.max(1, pour)} Ember)`,
            enabled: pour >= 1,
            reason: pour >= 1 ? undefined : 'You must keep your last ember — Steady to gather more.',
            preview: `Beacon ${b.progress + pour}/${G.beaconNeed}${willLight ? ' — it LIGHTS!' : ''}`,
          },
      steady,
    };
  }

  if (node.type === 'wellspring') {
    return {
      tile: 'wellspring',
      tone: 'calm',
      title: flavor.title,
      narration: flavor.narration,
      brave: {
        label: 'Draw Deep',
        enabled: true,
        preview: `+${DEEP_EMBER} Ember · +${DEEP_NIGHT_COST} Night`,
      },
      steady: { ...steady, label: 'Sip', preview: `+${steadyAmt} Ember · no risk` },
    };
  }

  if (node.type === 'shrine') {
    return {
      tile: 'shrine',
      tone: 'riddle',
      title: flavor.title,
      narration: flavor.narration,
      brave: {
        label: 'Commune',
        enabled: true,
        preview: 'Draw an omen and brave whatever it brings — gift or trap.',
      },
      steady: { ...steady, label: 'Pray' },
    };
  }

  if (node.type === 'threshold') {
    const ready = G.beaconsLit >= 3;
    return {
      tile: 'threshold',
      tone: 'calm',
      title: flavor.title,
      narration: flavor.narration,
      brave: {
        label: ready ? 'Cross into the Dawn' : 'Cross the Threshold',
        enabled: ready,
        reason: ready ? undefined : `The gate is sealed — light ${3 - G.beaconsLit} more Beacon${3 - G.beaconsLit === 1 ? '' : 's'}.`,
        preview: ready ? 'Gather every bearer here to win.' : undefined,
      },
      steady: { ...steady, label: 'Hold the Gate' },
    };
  }

  // hollow / hearth → the omen hanging over this turn
  if (G.turnOmen != null) {
    const card = eventById(G.turnOmen);
    return {
      tile: node.type,
      tone: card.tone,
      title: card.title,
      narration: card.narration,
      brave: {
        label: card.brave.label,
        enabled: true,
        preview: previewEffects(card.brave.effects),
      },
      steady,
    };
  }

  return {
    tile: node.type,
    tone: 'calm',
    title: flavor?.title ?? 'The Road',
    narration: flavor?.narration ?? 'The dusk is quiet here, for a moment. You catch your breath.',
    brave: { label: 'Press On', enabled: false, reason: 'Nothing here to brave — Steady and move on.' },
    steady,
  };
}

/** Apply a BRAVE for non-threshold tiles. Returns false if it was not legal. */
export function applyBrave(G: GState, p: Player, roll: Roll): boolean {
  const node = G.nodes[p.nodeId];
  const tone: OmenTone = 'gift';
  void tone;

  if (node.type === 'beacon') {
    const b = G.beacons.find((x) => x.nodeId === node.id)!;
    if (b.lit) return false;
    const pour = kindlePour(G.beaconNeed, b.progress, p.ember);
    if (pour < 1) return false;
    p.ember -= pour;
    flash(G, 'kindle', node.id);
    log(G, `${p.name} pours ${pour} ember${pour > 1 ? 's' : ''} of their own life into the Beacon.`, 'fellow');
    addBeaconProgress(G, node.id, pour);
    return true;
  }

  if (node.type === 'wellspring') {
    gainEmber(p, DEEP_EMBER);
    addNight(G, DEEP_NIGHT_COST);
    log(G, `${p.name} drinks deep at the well — warmth floods back, but the night gains.`, 'hope');
    return true;
  }

  if (node.type === 'shrine') {
    if (G.deck.length === 0 && G.discard.length === 0) {
      gainEmber(p, STEADY_EMBER);
      log(G, `${p.name} kneels at the shrine; the dark has nothing left to say.`, 'neutral');
      return true;
    }
    if (G.deck.length === 0) {
      G.deck = shuffleInPlace(G.discard, roll);
      G.discard = [];
    }
    const id = G.deck.pop()!;
    const card = eventById(id);
    log(G, `${p.name} communes at the shrine — and braves what answers.`, 'neutral');
    for (const e of card.brave.effects) applyEffect(G, p, e, roll);
    log(G, `${card.title} — ${card.brave.outcome}`, toneToLog(card.tone));
    G.discard.push(id);
    return true;
  }

  // hollow / hearth → the turn's omen
  if (G.turnOmen != null) {
    const card = eventById(G.turnOmen);
    for (const e of card.brave.effects) applyEffect(G, p, e, roll);
    log(G, `${card.title} — ${card.brave.outcome}`, toneToLog(card.tone));
    return true;
  }
  return false;
}

function shuffleInPlace<T>(arr: T[], roll: Roll): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(roll.Number() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function toneToLog(t: OmenTone): LogTone {
  return t === 'gift' ? 'hope' : t === 'trap' || t === 'stalker' ? 'dread' : 'neutral';
}

// ── win / lose (pure; gloaming.ts endIf wraps this) ─────────────────────────
export function checkGameover(G: GState): GameoverState | undefined {
  const marked = G.secret?.markedId ?? null;
  const bearers = livingBearers(G);

  // WIN checked first (PLAN §H.10): every bearer non-Wisp, on the Threshold, 3 lit.
  if (
    bearers.length > 0 &&
    G.beaconsLit >= 3 &&
    bearers.every((p) => !p.wisp && p.nodeId === G.thresholdId)
  ) {
    return marked
      ? { winner: 'lanternbearers', reason: 'marked-foiled', markedId: marked }
      : { winner: 'lanternbearers', reason: 'crossed' };
  }
  if (G.night >= G.nightMax) {
    return marked
      ? { winner: 'marked', reason: 'marked-triumph', markedId: marked }
      : { winner: 'gloaming', reason: 'nightfell' };
  }
  return undefined;
}
