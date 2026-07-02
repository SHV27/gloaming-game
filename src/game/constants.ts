/**
 * GLOAMING v3 — *Trapped Inside*. Every knob, one place. Tuned against the headless
 * Playtester (PLAN §I): ~20–30 min, win-rate ~45–55% per count, dead-turn ≈ 0.
 *
 * v3 kills the abstract Ember/Night economy. The clock is the shrinking board; life
 * is a torch flame; progress is three Lanterns you physically carry to the Gate.
 */

import type { Act } from './types';

export const STRIDE_DIE = 6; // the movement die

// ── The Torch: your life, a flame with notches ──────────────────────────────
export const TORCH_START = 8;
export const TORCH_MAX = 8;
/** The night burns one notch off the active bearer's torch each round. */
export const TORCH_BURN_PER_ROUND = 1;
/** Extra torch spent to step INTO a frayed tile (the dark's cold edge). */
export const MOVE_DARK_COST = 1;
/** Torch snuffed when the Nightmare catches you / the dark knocks you inward. */
export const DARK_KNOCK = 2;
export const NIGHTMARE_SNUFF = 2; // a catch bites — and shoves you OUT into the dark

// ── Relight (fellowship — the softlock cure + rescue drama) ──────────────────
/** Torch a Relit ally comes back with. Relighting is free (presence is the cost). */
export const RELIGHT_TORCH = 4;

// ── The Lanterns: carried objects ───────────────────────────────────────────
export const LANTERN_COUNT = 3;
/** Each Lantern you carry shortens your stride by this (weight = tension). */
export const LANTERN_CARRY_STRIDE_PEN = 1;
export const MIN_STRIDE = 1; // never fully immobilised by carrying

// ── The Dark: how many frontier tiles it eats each round, by Act (may be fractional;
//    the reducer accumulates it and resolves whole tiles). Accelerates each Act.
export function darkBiteFor(act: Act, numPlayers: number): number {
  const base = [2.7, 3.7, 4.7][act];
  const byTable = numPlayers === 2 ? 0.87 : numPlayers === 3 ? 0.95 : numPlayers >= 5 ? 1.2 : 1.08;
  return base * byTable; // small tables gentler; big tables eat faster (they have more hands)
}
/** Delivered Lanterns are a growing light at the Gate that holds the dark back a
 *  little — rewards delivery and makes the climactic final gather winnable. */
export function darkSlowdownFor(delivered: number): number {
  return Math.max(0.82, 1 - 0.06 * delivered); // 0→1.0, 3→0.82 (gentle — the gather stays a race)
}

// ── The Nightmare: steps toward the nearest torch each round, by Act ──────────
export function nightmareStepsFor(act: Act): number {
  return [1, 1.5, 2][act];
}

// ── The three Acts — read off the deepest surviving ring (PLAN §D) ───────────
export const ACT_NAMES = ['Dusk', 'The Gloaming', 'Pitch'] as const;
/** Act from how far the dark has eaten: outer ring alive → Dusk; eating ring 2 →
 *  Gloaming; eating ring 1 (only the Gate + inner tiles left) → Pitch. */
export function actFromDeepestRing(deepestSurvivingRing: number): Act {
  if (deepestSurvivingRing <= 1) return 2; // only ring 1 + Gate remain
  if (deepestSurvivingRing === 2) return 1;
  return 0;
}

// ── Seats ───────────────────────────────────────────────────────────────────
export const MIN_MARKED_PLAYERS = 4; // hidden Marked only offered at 4+ (dormant this session)

export const SEAT_COLORS = [
  'var(--color-seat-1)',
  'var(--color-seat-2)',
  'var(--color-seat-3)',
  'var(--color-seat-4)',
  'var(--color-seat-5)',
  'var(--color-seat-6)',
] as const;

export const SEAT_NAMES = ['Ash', 'Wren', 'Ivo', 'Mara', 'Coll', 'Senna'] as const;
