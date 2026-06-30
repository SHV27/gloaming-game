/**
 * GLOAMING — tuning knobs. One place. Numbers exist to be tuned against the
 * running build until it is tense-but-winnable (PLAN §11).
 */

export const AP_BASE = 1; // base node-actions per turn
export const PRESS_ON_MAX = 2; // extra actions you may push-your-luck for
export const STRIDE_DIE = 6; // the movement die

export const EMBERS_PER_BEACON = 4; // embers to light one beacon — forces pooling across bearers/turns
export const BEACON_COUNT = 3;

export const LIGHT_START = 6;
export const LIGHT_MAX = 8;
export const EMBER_START = 2;
export const EMBER_CAP = 6;

export const GATHER_AMOUNT = 3; // wellspring yield (embers OR light) — keeps the action economy moving
export const STEADY_LIGHT = 2; // rest recovery — < wellspring so the well stays worth a detour
export const REVIVE_LIGHT_COST = 1; // light spent to revive an ally
export const REVIVE_TARGET_LIGHT = 3; // light a revived ally comes back with

export const CORRUPT_EDGE_COST = 2; // stride cost across a corrupted edge

// The tide always rises (a knowable clock); harmful strikes only begin once
// Dread crosses ratio thresholds — so the early game is survivable and the
// pressure visibly tightens (CLAUDE §6). Tuned via the balance sim.
export const BASE_STRIKES = 1; // the board ALWAYS acts once — the menace is constant
export const DREAD_TIDE_RISE = 1; // dread always +1 per turn end

/** Fractions of dreadMax at which the Gloaming gains an extra strike per turn —
 *  three accelerations so the back third genuinely closes in (CLAUDE §6). */
export const DREAD_STRIKE_RATIOS = [0.33, 0.6, 0.85] as const;

/** Dread the night needs to fall — scaled to table size, with room for ~10 rounds. */
export function dreadMaxFor(numPlayers: number): number {
  return 11 * numPlayers;
}

/** Number of *extra* Gloaming strikes from the current Dread ratio. */
export function dreadStrikeBonus(dread: number, dreadMax: number): number {
  return DREAD_STRIKE_RATIOS.reduce((n, r) => (dread >= r * dreadMax ? n + 1 : n), 0);
}

export const SEAT_COLORS = [
  'var(--color-seat-1)',
  'var(--color-seat-2)',
  'var(--color-seat-3)',
  'var(--color-seat-4)',
  'var(--color-seat-5)',
  'var(--color-seat-6)',
] as const;

export const SEAT_NAMES = ['Ash', 'Wren', 'Ivo', 'Mara', 'Coll', 'Senna'] as const;
