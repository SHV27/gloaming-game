/**
 * GLOAMING v4 — THE TURN'S INTERACTION STATE MACHINE (S6, §7). A single pure
 * source of truth for which controls are live, so the UI and the tests agree and
 * button-order bugs become structurally impossible (asserted in `scripts/uistate.ts`).
 *
 * Phases: WATCH (not your turn) → ROLL → MOVE (stride + a reachable tile) / ACT
 * (no move left, but the ③ action + End Turn) → RESOLVING (a Wisp auto-drift, or
 * the turn has acted and is resolving). The hard invariant: in every playable
 * phase there is at least one legal control, or the turn auto-resolves.
 */
import type { GState } from './types';
import { reachable } from './effects';

export type TurnPhase = 'watch' | 'roll' | 'move' | 'act' | 'resolving';

export interface TurnControls {
  phase: TurnPhase;
  canRoll: boolean; // ① Roll
  canMove: boolean; // ② tap a glowing tile (stride left AND a reachable tile)
  canAct: boolean; // ③ the single tile action
  canEndTurn: boolean; // pass
}

const NONE = { canRoll: false, canMove: false, canAct: false, canEndTurn: false };

export function turnControls(G: GState, currentPlayer: string, playerID: string | null): TurnControls {
  const me = G.players[currentPlayer];
  if (!me || playerID !== currentPlayer) return { phase: 'watch', ...NONE };
  // a Wisp's drift, or a turn already resolved into the board's phase → auto-resolves
  if (me.wisp || G.autoWisp || G.acted) return { phase: 'resolving', ...NONE };
  if (!G.hasRolled) return { phase: 'roll', canRoll: true, canMove: false, canAct: false, canEndTurn: false };
  const canMove = G.stride > 0 && reachable(G, me.nodeId, G.stride).size > 0;
  return { phase: canMove ? 'move' : 'act', canRoll: false, canMove, canAct: true, canEndTurn: true };
}
