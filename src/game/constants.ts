/**
 * GLOAMING v2 — *The Deepening*. All tuning knobs, one place.
 * Numbers exist to be tuned against the headless Playtester sim until the game
 * hits its bands (PLAN §I): ~25–35 min, win-rate 45–55%, dead-turn ≈ 0.
 *
 * v2 collapses Light + Embers into a SINGLE resource — Ember — and replaces the
 * multi-action budget with one decision: Brave or Steady (PLAN §B).
 */

import type { Act } from './types';

export const STRIDE_DIE = 6; // the movement die

// ── Ember: life + fuel + currency, the single resource ──────────────────────
export const EMBER_START = 7;
export const EMBER_MAX = 12;

/** Steady (the always-legal safe floor) banks this much Ember. */
export const STEADY_EMBER = 3;
/** The Hearth is home — Steady there warms a little extra. */
export const HEARTH_STEADY_BONUS = 1;
/** Wellspring · Draw Deep: a big refuel, but you linger and the night gains. */
export const DEEP_EMBER = 4;
export const DEEP_NIGHT_COST = 1;

// ── Beacons: the tug-of-war ─────────────────────────────────────────────────
export const BEACON_COUNT = 3;
/** Ember to light one beacon — scales with table size (more bearers, more fuel). */
export function beaconNeedFor(numPlayers: number): number {
  return 3 + numPlayers; // 2p→5, 4p→7, 6p→9
}
/** Most Ember a single Kindle pours in — so a beacon is a multi-visit effort
 *  (the tug-of-war), never a one-shot dump. */
export const KINDLE_MAX = 4;
/** Kindling always leaves you this much Ember — you can never pour yourself to a
 *  Wisp at a beacon (removes a griefy self-softlock; you still choose to spend). */
export const KINDLE_KEEP = 1;
/** A SNUFF knocks a beacon back by ~half its need — a setback (the Rhino), not a wipe.
 *  The trailing side always keeps a fighting chance (PLAN §B.3). */
export function snuffAmountFor(need: number): number {
  return Math.ceil(need * 0.5);
}
/** Rounds the Gloaming waits between snuffs (multiplied by player count in
 *  effects to get a turn-count) — so a beacon CAN be pushed home in the gap,
 *  and snuff frequency stays ~constant per round at any table size. */
export const SNUFF_COOLDOWN = 1;
export const REKINDLE_COST = 2; // Ember an ally spends to lift a Wisp
export const REKINDLE_TARGET_EMBER = 3; // Ember a Rekindled Wisp returns with

// ── The Night clock + the three Acts ────────────────────────────────────────
/** Night to fill. The Gloaming acts every player-turn, so the tide (+1/turn) is
 *  the main clock; nightMax scales sublinearly with table size — small parties
 *  get relatively more time (they cover less ground), large parties less
 *  (they're powerful), flattening win-rate toward ~50% across counts. */
export function nightMaxFor(numPlayers: number): number {
  return 22 + 8 * numPlayers; // 2p→38, 3p→46, 4p→54, 5p→62, 6p→70
}
export const NIGHT_TIDE = 1; // the night always rises this much per turn (the knowable clock)
export const SURGE_AMT = 1; // extra Night from a SURGE intent (the fallback strike)

/** Act thresholds as fractions of nightMax. Below ACT_RATIOS[0] = Dusk(0),
 *  between = Gloaming(1), at/above ACT_RATIOS[1] = Pitch(2). */
export const ACT_RATIOS = [0.34, 0.67] as const;
export const ACT_NAMES = ['Dusk', 'The Gloaming', 'Pitch'] as const;

export function actFor(night: number, nightMax: number): Act {
  const r = nightMax > 0 ? night / nightMax : 0;
  if (r >= ACT_RATIOS[1]) return 2;
  if (r >= ACT_RATIOS[0]) return 1;
  return 0;
}

/** Ember the night gnaws from a bearer at the start of their turn — grows as
 *  night deepens (the heartbeat drain). Gentle in Dusk so the open is teachable. */
export function emberDrainFor(act: Act): number {
  return [0, 1, 1][act];
}

// ── The Gloaming automa (WS3) ───────────────────────────────────────────────
/** How many intents the Gloaming telegraphs each board phase, by Act. */
export function intentCountFor(act: Act): number {
  return [1, 1, 2][act];
}
/** Which intent kinds the Gloaming may use, by Act (powers unlock as it deepens). */
export const ACT_POWERS: Record<Act, ReadonlyArray<'surge' | 'seal' | 'stalk' | 'snuff'>> = {
  0: ['surge', 'seal'],
  1: ['surge', 'seal', 'stalk', 'snuff'],
  2: ['surge', 'seal', 'stalk', 'snuff'],
};

export const STALK_DRAIN = 2; // Ember torn away when the Stalker catches a bearer

/** A sealed ("thorned") road stays passable but costs this much stride — a
 *  setback that impedes routing without ever making the board impassable
 *  (so SEAL can never cause a softlock; Steady is always legal regardless). */
export const SEAL_STRIDE_COST = 2;

// ── Seats ───────────────────────────────────────────────────────────────────
export const MIN_MARKED_PLAYERS = 4; // the hidden Marked is only offered at 4+ seats

export const SEAT_COLORS = [
  'var(--color-seat-1)',
  'var(--color-seat-2)',
  'var(--color-seat-3)',
  'var(--color-seat-4)',
  'var(--color-seat-5)',
  'var(--color-seat-6)',
] as const;

export const SEAT_NAMES = ['Ash', 'Wren', 'Ivo', 'Mara', 'Coll', 'Senna'] as const;
