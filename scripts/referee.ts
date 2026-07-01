/**
 * GLOAMING v2 — THE REFEREE (turn-flow integrity, top priority per CLAUDE §3).
 *
 * Proves the hard invariant: the current player ALWAYS has a legal action, or the
 * turn auto-resolves — NEVER a softlock (the bug a real player hit). Covers the
 * PLAN §H edge cases with automated assertions over the REAL reducer + the pure
 * helpers. Exits non-zero on any failure.
 *
 *   npm run referee
 */
import { Client } from 'boardgame.io/client';
import { makeGloaming } from '../src/game/gloaming';
import type { GState, Player } from '../src/game/types';
import {
  checkGameover,
  drainEmber,
  gainEmber,
  kindlePour,
  chooseIntent,
  isSealed,
  strideCostFor,
} from '../src/game/effects';
import { SEAL_STRIDE_COST, KINDLE_KEEP } from '../src/game/constants';

type AnyClient = ReturnType<typeof Client>;

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
}
function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// A fresh initial G to clone for pure-function scenarios.
function freshG(numPlayers = 2): GState {
  const names = ['Ash', 'Wren', 'Ivo', 'Mara', 'Coll', 'Senna'].slice(0, numPlayers);
  const c = Client({ game: makeGloaming({ names }), numPlayers });
  c.start();
  return structuredClone(c.getState()!.G as GState);
}

// ── §H.1 & §H.7 — Ember → 0 becomes a Wisp (single & simultaneous) ───────────
section('Ember → 0 becomes a Wisp (H1, H7)');
{
  const G = freshG(2);
  const p = G.players['0'];
  p.ember = 1;
  drainEmber(G, p, 5);
  assert(p.wisp === true, 'draining below 0 sets wisp');
  assert(p.ember === 0, 'wisp ember clamps at 0');

  // simultaneous: draining two players to 0 in one board phase both become Wisps
  const G2 = freshG(2);
  G2.players['0'].ember = 2;
  G2.players['1'].ember = 2;
  drainEmber(G2, G2.players['0'], 2);
  drainEmber(G2, G2.players['1'], 2);
  assert(G2.players['0'].wisp && G2.players['1'].wisp, 'two simultaneous 0-Ember → both Wisp');
}

// ── a Wisp cannot be topped up except by Rekindle (H1 recovery contract) ──────
section('Wisp economy (only Rekindle lifts a Wisp)');
{
  const G = freshG(2);
  const p = G.players['0'];
  p.ember = 0;
  p.wisp = true;
  gainEmber(p, 5);
  assert(p.wisp === true && p.ember === 0, 'gainEmber does not silently un-Wisp');
}

// ── §H.10 — win is checked BEFORE loss (crossing as the tide peaks escapes) ───
section('Win beats a simultaneous loss (H10)');
{
  const G = freshG(2);
  G.beaconsLit = 3;
  G.night = G.nightMax; // loss condition ALSO true
  for (const p of Object.values(G.players)) {
    p.wisp = false;
    p.nodeId = G.thresholdId;
  }
  const go = checkGameover(G);
  assert(go?.winner === 'lanternbearers', 'all on Threshold + 3 lit wins even at nightMax');
}

// ── §H — a Wisp on the Threshold does NOT win (must be Rekindled first) ───────
section('A Wisp cannot cross');
{
  const G = freshG(2);
  G.beaconsLit = 3;
  for (const p of Object.values(G.players)) p.nodeId = G.thresholdId;
  G.players['1'].wisp = true;
  assert(checkGameover(G) === undefined, 'a Wisp on the Threshold blocks the win');
}

// ── §H.5 — Night maxing is a clean loss ──────────────────────────────────────
section('Night fills → clean loss (H5)');
{
  const G = freshG(2);
  G.night = G.nightMax;
  const go = checkGameover(G);
  assert(go?.winner === 'gloaming' && go.reason === 'nightfell', 'nightMax → gloaming/nightfell');
}

// ── Kindle can never pour you to a Wisp (removes a self-softlock) ─────────────
section('Kindle keeps your last Ember');
{
  assert(kindlePour(5, 0, 1) === 0, 'ember 1 → pour 0 (keeps last ember)');
  assert(kindlePour(5, 0, KINDLE_KEEP) === 0, 'ember == KINDLE_KEEP → pour 0');
  assert(kindlePour(5, 0, 8) > 0 && kindlePour(5, 0, 8) <= 8 - KINDLE_KEEP, 'flush → pours, keeps buffer');
}

// ── §H.6 — SNUFF only touches LIT beacons in Pitch (Act 2) ────────────────────
section('Snuff gating: lit beacons only in Pitch (H6)');
{
  // a single lit beacon, no unlit progress, cooldown ready, powers include snuff (Act 1+)
  const mk = (act: 0 | 1 | 2): GState => {
    const G = freshG(2);
    G.act = act;
    G.snuffCd = 0;
    G.beacons.forEach((b, i) => {
      b.progress = i === 0 ? G.beaconNeed : 0;
      b.lit = i === 0;
    });
    G.beaconsLit = 1;
    return G;
  };
  const roll = { Number: () => 0.5, Die: (n: number) => 1 } as never;
  const g1 = mk(1);
  const i1 = chooseIntent(g1, roll);
  assert(i1.kind !== 'snuff', 'Gloaming (Act 1) will not snuff a LIT beacon');
  const g2 = mk(2);
  const i2 = chooseIntent(g2, roll);
  assert(i2.kind === 'snuff', 'Pitch (Act 2) CAN snuff a LIT beacon');
}

// ── SEAL never blocks the board (passable at +stride → never a softlock, H3) ──
section('Sealed roads stay passable (H3)');
{
  const G = freshG(2);
  const a = 0;
  const b = G.nodes[0].neighbors[0];
  G.sealedEdges.push([Math.min(a, b), Math.max(a, b)]);
  assert(isSealed(G, a, b), 'edge reads as sealed');
  assert(strideCostFor(G, a, b) === SEAL_STRIDE_COST, 'sealed edge costs extra but is finite/passable');
}

// ── THE BIG ONE: softlock fuzz — random & chaotic bots, every game terminates ─
section('Softlock fuzz: every game reaches a terminal state (H2, H3, H4, H8)');
{
  function chaosTurn(client: AnyClient, pid: string, rng: () => number) {
    const st0 = client.getState()!;
    const G0 = st0.G as GState;
    if (G0.autoWisp) {
      client.moves.endTurn(); // a Wisp's forced, always-legal pass
      return;
    }
    // INVARIANT CHECK: at turn start a non-Wisp can always begin.
    assert(!G0.hasRolled, 'turn starts un-rolled');
    client.moves.rollStride();

    // random wandering (respecting stride), then a random legal action
    for (let steps = 0; steps < 3 && rng() < 0.6; steps++) {
      if (client.getState()!.ctx.gameover) return;
      const G = client.getState()!.G as GState;
      const me = G.players[pid];
      const opts = G.nodes[me.nodeId].neighbors.filter((n) => G.stride >= strideCostFor(G, me.nodeId, n));
      if (!opts.length) break;
      client.moves.moveTo(opts[Math.floor(rng() * opts.length) % opts.length]);
    }
    if (client.getState()!.ctx.gameover) return;

    const G = client.getState()!.G as GState;
    const me = G.players[pid];
    const wispHere = Object.values(G.players).find(
      (p: Player) => p.wisp && p.id !== pid && p.nodeId === me.nodeId,
    );
    const r = rng();
    // Whatever the state, at least one of these is ALWAYS legal (Steady always is).
    if (wispHere && me.ember >= 3 && r < 0.3) client.moves.rekindle(wispHere.id);
    else if (r < 0.5 && getReactionEnabled(G, me)) client.moves.brave();
    else client.moves.steady();
  }

  // brave enabled? mirror getReaction's contract cheaply (Steady is the fallback).
  function getReactionEnabled(G: GState, me: Player): boolean {
    const t = G.nodes[me.nodeId].type;
    if (t === 'beacon') {
      const b = G.beacons.find((x) => x.nodeId === me.nodeId)!;
      return !b.lit && kindlePour(G.beaconNeed, b.progress, me.ember) >= 1;
    }
    if (t === 'threshold') return G.beaconsLit >= 3;
    if (t === 'hollow' || t === 'hearth') return G.turnOmen != null;
    return true; // wellspring / shrine
  }

  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  let terminated = 0;
  const GAMES = 120;
  for (let g = 0; g < GAMES; g++) {
    const n = 2 + (g % 5); // 2..6 players
    const names = ['Ash', 'Wren', 'Ivo', 'Mara', 'Coll', 'Senna'].slice(0, n);
    const client = Client({ game: makeGloaming({ names }), numPlayers: n });
    client.start();
    let guard = 0;
    while (!client.getState()!.ctx.gameover) {
      if (guard++ > 6000) break; // a softlock would spin here forever
      const pid = client.getState()!.ctx.currentPlayer;
      client.updatePlayerID(pid);
      chaosTurn(client, pid, rng);
    }
    if (client.getState()!.ctx.gameover) terminated++;
  }
  assert(terminated === GAMES, `all ${GAMES} chaos games terminated (got ${terminated}) — NO SOFTLOCK`);
  console.log(`  · ${terminated}/${GAMES} chaos games reached a terminal state`);
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? '✓ REFEREE PASS — the turn can never dead-end.' : `✗ REFEREE FAIL — ${failures} assertion(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
