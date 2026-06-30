import type { GState, Player, Effect, LogTone, GameoverState, FlashKind } from './types';
import { EDGES, edgeKey, BEACON_NODE_IDS } from './board';
import {
  LIGHT_MAX,
  EMBER_CAP,
  EMBERS_PER_BEACON,
  dreadStrikeBonus,
} from './constants';

/**
 * PURE state helpers. They mutate `G` in place (boardgame.io wraps moves in
 * immer) and are also exported for headless testing. No React, no RNG except
 * via an injected `roll`/`pick` so tests stay deterministic.
 */

type Roll = { Number: () => number; Die: (n: number) => number };

// ── logging ────────────────────────────────────────────────────────────────
export function log(G: GState, text: string, tone: LogTone = 'neutral'): void {
  G.log.push({ id: G.logSeq++, turn: 0, text, tone });
  if (G.log.length > 60) G.log.shift();
}

export function flash(G: GState, kind: FlashKind, nodeId?: number): void {
  G.flash = { kind, nonce: G.flashSeq++, nodeId };
}

// ── resource math ───────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function gainLight(p: Player, amount: number): void {
  p.light = clamp(p.light + amount, 0, LIGHT_MAX);
  if (p.light > 0 && p.dimmed) {
    p.dimmed = false; // restored
    p.graced = false;
  }
}

export function gainEmbers(p: Player, amount: number): void {
  p.embers = clamp(p.embers + amount, 0, EMBER_CAP);
}

/** Drain Light, honoring Ward (negate) and doubleDrain. Returns light actually lost. */
export function drainLight(G: GState, p: Player, amount: number): number {
  if (!p.alive) return 0;
  // Ward absorbs the hit first — it does NOT burn a telegraphed doubleDrain,
  // which stays armed for the next real drain (engineer fix).
  if (p.warded) {
    p.warded = false;
    log(G, `${p.name}'s warding charm flares and holds back the dark.`, 'fellow');
    return 0;
  }
  let a = amount;
  if (p.doubleDrain) {
    a *= 2;
    p.doubleDrain = false;
  }
  if (p.dimmed) {
    // grace gives allies one board phase to reach a fallen bearer before they're lost
    if (p.graced) {
      p.graced = false;
      log(G, `${p.name} clings on in the dark — barely.`, 'dread');
      return 0;
    }
    p.alive = false;
    p.dimmed = false;
    log(G, `${p.name} is lost to the Gloaming.`, 'dread');
    return a;
  }
  p.light = clamp(p.light - a, 0, LIGHT_MAX);
  if (p.light === 0) {
    p.dimmed = true;
    p.graced = true;
    log(G, `${p.name}'s lantern gutters out — they fall, dimmed.`, 'dread');
  }
  return a;
}

export function addDread(G: GState, amount: number): void {
  G.dread = clamp(G.dread + amount, 0, G.dreadMax);
}

// ── board / edges ─────────────────────────────────────────────────────────
export function isCorrupted(G: GState, a: number, b: number): boolean {
  const k = edgeKey(a, b);
  return G.corruptedEdges.some(([x, y]) => edgeKey(x, y) === k);
}

export function corruptRandomEdge(G: GState, roll: Roll): boolean {
  const clean = EDGES.filter(([a, b]) => !isCorrupted(G, a, b));
  if (clean.length === 0) return false;
  const pick = clean[Math.floor(roll.Number() * clean.length) % clean.length];
  G.corruptedEdges.push([pick[0], pick[1]]);
  return true;
}

export function cleanseEdgeNear(G: GState, nodeId: number): boolean {
  // prefer a corrupted edge touching the player; else any
  let idx = G.corruptedEdges.findIndex(([a, b]) => a === nodeId || b === nodeId);
  if (idx === -1 && G.corruptedEdges.length > 0) idx = 0;
  if (idx === -1) return false;
  G.corruptedEdges.splice(idx, 1);
  return true;
}

// ── beacons ─────────────────────────────────────────────────────────────────
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

/** Add embers to a beacon; light it (and announce) when it reaches the threshold. */
export function addBeaconEmber(G: GState, beaconNodeId: number, amount: number): void {
  const b = G.beacons.find((x) => x.nodeId === beaconNodeId);
  if (!b || b.lit) return;
  b.embers = clamp(b.embers + amount, 0, EMBERS_PER_BEACON);
  if (b.embers >= EMBERS_PER_BEACON) {
    b.lit = true;
    recomputeBeaconsLit(G);
    log(G, `A Beacon roars to light — ${G.beaconsLit} of 3 now burn against the dark.`, 'hope');
    flash(G, 'beacon-lit', beaconNodeId);
  }
}

// ── effect application (from event choices) ──────────────────────────────────
export function applyEffect(G: GState, p: Player, e: Effect, roll: Roll): void {
  switch (e.kind) {
    case 'light':
      if (e.amount! >= 0) gainLight(p, e.amount!);
      else drainLight(G, p, -e.amount!);
      break;
    case 'embers':
      gainEmbers(p, e.amount!);
      break;
    case 'dread':
      addDread(G, e.amount!);
      break;
    case 'corruptEdge':
      corruptRandomEdge(G, roll);
      break;
    case 'cleanseEdge':
      cleanseEdgeNear(G, p.nodeId);
      break;
    case 'grantItem':
      if (e.item) p.items.push(e.item);
      break;
    case 'beaconEmber': {
      const target = nearestUnlitBeacon(G, p.nodeId);
      if (target !== null) addBeaconEmber(G, target, e.amount ?? 1);
      break;
    }
    case 'ward':
      p.warded = true;
      break;
    case 'doubleNextDrain':
      p.doubleDrain = true;
      break;
    case 'pullToDark': {
      const n = G.nodes[p.nodeId];
      if (n.neighbors.length) {
        p.nodeId = n.neighbors[Math.floor(roll.Number() * n.neighbors.length) % n.neighbors.length];
      }
      break;
    }
  }
}

// ── the Gloaming strikes (one automatic board action) ─────────────────────────
export function gloamingStrike(G: GState, roll: Roll): void {
  const alive = Object.values(G.players).filter((p) => p.alive);
  if (alive.length === 0) return;
  const r = roll.Number();
  const ratio = G.dread / G.dreadMax;
  // Early strikes mostly twist the map; as night deepens they turn to draining
  // Light, and bite for 2 — the squeeze is felt tightening (CLAUDE §6).
  const drainProb = 0.22 + 0.45 * ratio; // ~0.22 dawn → ~0.67 dusk
  const drainAmt = ratio >= 0.78 ? 2 : 1;
  if (r < drainProb) {
    // drain the most-exposed bearer (lowest light, prefer not-yet-dimmed)
    const sorted = [...alive].sort((a, b) => {
      if (a.dimmed !== b.dimmed) return a.dimmed ? 1 : -1; // hit standing bearers first
      return a.light - b.light;
    });
    drainLight(G, sorted[0], drainAmt);
  } else if (r < drainProb + 0.2) {
    if (corruptRandomEdge(G, roll)) {
      log(G, 'A road unravels into the dark — the way grows harder.', 'dread');
    } else {
      addDread(G, 1);
    }
  } else {
    addDread(G, 1);
    log(G, 'The Dread tide swells.', 'dread');
  }
}

/** How many Gloaming strikes fire at the end of this turn. */
export function strikeCount(G: GState, baseStrikes: number): number {
  return baseStrikes + dreadStrikeBonus(G.dread, G.dreadMax) + G.pressOns;
}

// ── win / lose (pure; gloaming.ts endIf wraps this) ───────────────────────────
export function checkGameover(G: GState): GameoverState | undefined {
  const alive = Object.values(G.players).filter((p) => p.alive);
  // Win is checked FIRST: a party that crosses on the same turn-end the tide
  // peaks has escaped — they don't lose to it (engineer fix).
  if (alive.length > 0 && G.beaconsLit >= 3 && alive.every((p) => p.nodeId === G.thresholdId)) {
    return { winner: 'lanternbearers', reason: 'crossed' };
  }
  if (alive.length === 0) return { winner: 'gloaming', reason: 'all-lost' };
  if (G.dread >= G.dreadMax) return { winner: 'gloaming', reason: 'nightfell' };
  return undefined;
}

export { BEACON_NODE_IDS };
