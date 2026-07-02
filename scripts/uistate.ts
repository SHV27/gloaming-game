/**
 * GLOAMING v4 — THE UI-STATE CONTRACT (S6, §7 / Referee H16).
 *
 * Proves that the turn's interaction state machine is honest: at every phase exactly
 * the right controls are live, AND the engine ENFORCES that order (you cannot move
 * or act or pass before rolling; you cannot roll twice). Button-sequence bugs become
 * structurally impossible — the reducer itself rejects out-of-order input.
 *
 *   npm run uistate
 */
import { Client } from 'boardgame.io/client';
import { makeGloaming } from '../src/game/gloaming';
import type { GState } from '../src/game/types';
import { turnControls, type TurnControls } from '../src/game/phase';
import { isVoid, getTileAction } from '../src/game/effects';
import { SEAT_NAMES } from '../src/game/constants';

type AnyClient = ReturnType<typeof Client>;
let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.log(`  ✗ ${msg}`); }
};

/** The exact enabled-control contract per phase — the heart of the guarantee. */
function checkContract(c: TurnControls): void {
  switch (c.phase) {
    case 'watch':
    case 'resolving':
      assert(!c.canRoll && !c.canMove && !c.canAct && !c.canEndTurn, `${c.phase}: no controls are enabled`);
      break;
    case 'roll':
      assert(c.canRoll && !c.canMove && !c.canAct && !c.canEndTurn, 'roll: ONLY Roll is enabled');
      break;
    case 'move':
      assert(!c.canRoll && c.canMove && c.canAct && c.canEndTurn, 'move: tap-tile + ③ action + End Turn (no Roll)');
      break;
    case 'act':
      assert(!c.canRoll && !c.canMove && c.canAct && c.canEndTurn, 'act: ③ action + End Turn (no Roll, no move)');
      break;
  }
  // the softlock invariant, at the control level: a playable phase always exposes a
  // control, or the turn auto-resolves (watch/resolving).
  assert(
    c.canRoll || c.canAct || c.canEndTurn || c.phase === 'watch' || c.phase === 'resolving',
    'every state exposes a legal control OR auto-resolves',
  );
}

/** Assert the ENGINE rejects out-of-order input in the roll phase, then re-roll. */
function verifyOrderEnforced(client: AnyClient, pid: string): void {
  const G0 = client.getState()!.G as GState;
  if (G0.autoWisp) return; // a Wisp's turn auto-resolves — nothing to order
  const me = G0.players[pid];
  const turn0 = client.getState()!.ctx.turn;

  // ① before rolling: a move is rejected
  const nbr = G0.nodes[me.nodeId].neighbors.find((n) => !isVoid(G0, n));
  if (nbr != null) client.moves.moveTo(nbr);
  assert(!(client.getState()!.G as GState).movedThisTurn, 'a move BEFORE rolling is rejected');

  // ① before rolling: the ③ action is rejected (turn does not resolve)
  const a = getTileAction(G0, me);
  if (a.kind === 'grab') client.moves.grab();
  else if (a.kind === 'deliver') client.moves.deliver();
  else if (a.kind === 'warm') client.moves.warm();
  assert(!(client.getState()!.G as GState).acted, 'a ③ action BEFORE rolling is rejected');

  // ① before rolling: End Turn is rejected (roll first keeps ①②③ honest)
  client.moves.endTurn();
  assert(client.getState()!.ctx.turn === turn0, 'End Turn BEFORE rolling is rejected');

  // now roll — it works
  client.moves.rollStride();
  const G1 = client.getState()!.G as GState;
  assert(G1.hasRolled, 'Roll works in the roll phase');

  // a SECOND roll is rejected (no re-roll)
  const roll = G1.lastRoll;
  client.moves.rollStride();
  assert((client.getState()!.G as GState).lastRoll === roll, 'a second Roll is rejected (no re-roll)');
}

/** A minimal legal bot to advance a turn after the order checks. */
function finishTurn(client: AnyClient, pid: string): void {
  const G = client.getState()!.G as GState;
  const me = G.players[pid];
  if (me.wisp || G.autoWisp) { client.moves.endTurn(); return; }
  const a = getTileAction(G, me);
  if (a.enabled && a.kind === 'grab') client.moves.grab();
  else if (a.enabled && a.kind === 'deliver') client.moves.deliver();
  else if (a.enabled && a.kind === 'relight' && a.targetId) client.moves.relight(a.targetId);
  else if (a.enabled && a.kind === 'warm') client.moves.warm();
  else if (a.enabled && a.kind === 'stepThrough') client.moves.stepThrough();
  else client.moves.endTurn();
}

const NAMES = SEAT_NAMES.slice(0, 6) as unknown as string[];
console.log('\nTHE UI-STATE CONTRACT — the engine enforces ①②③ order at every phase\n');

let turnsChecked = 0;
for (const n of [2, 3, 4]) {
  for (let g = 0; g < 12; g++) {
    const client = Client({ game: makeGloaming({ names: NAMES.slice(0, n) }), numPlayers: n });
    client.start();
    let guard = 0;
    while (!client.getState()!.ctx.gameover && guard++ < 400) {
      const ctx = client.getState()!.ctx;
      const pid = ctx.currentPlayer;
      client.updatePlayerID(pid);
      const G = client.getState()!.G as GState;

      // WATCH: another seat sees no controls
      const other = String((Number(pid) + 1) % n);
      checkContract(turnControls(G, pid, other));
      // the current seat's contract, at the top of the turn (roll or resolving)
      checkContract(turnControls(G, pid, pid));

      verifyOrderEnforced(client, pid);

      // after rolling: contract is move/act, and re-roll stays rejected
      checkContract(turnControls(client.getState()!.G as GState, pid, pid));
      turnsChecked++;
      finishTurn(client, pid);
    }
  }
}

console.log(`  · checked the contract across ${turnsChecked} turns (2–4 players)`);
console.log(`\n${failures === 0 ? '✓ UI-STATE PASS — controls match the phase everywhere; out-of-order input is impossible.' : `✗ UI-STATE FAIL — ${failures} contract violation(s).`}`);
process.exit(failures === 0 ? 0 : 1);
