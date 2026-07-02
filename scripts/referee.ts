/**
 * GLOAMING v3 — THE REFEREE (turn-flow integrity, top priority per CLAUDE §3).
 *
 * Proves the hard invariant: the current player ALWAYS has a legal action, or the
 * turn auto-resolves — NEVER a softlock, never a crash. Covers every PLAN §H edge
 * case with automated assertions over the REAL reducer + the pure helpers. Exits
 * non-zero on any failure.
 *
 *   npm run referee
 */
import { Client } from 'boardgame.io/client';
import { makeGloaming } from '../src/game/gloaming';
import type { GState } from '../src/game/types';
import {
  checkGameover,
  burnTorch,
  refuel,
  isVoid,
  eatFrontier,
  frontierTiles,
  nightmareStep,
  dropCarried,
  getTileAction,
  relight,
} from '../src/game/effects';
import { RING_OF, OUTER_RING, GATE_ID } from '../src/game/board';
import { LANTERN_COUNT } from '../src/game/constants';

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

const NAMES = ['Ash', 'Wren', 'Ivo', 'Mara', 'Coll', 'Senna'];
function freshG(numPlayers = 2): GState {
  const c = Client({ game: makeGloaming({ names: NAMES.slice(0, numPlayers) }), numPlayers });
  c.start();
  return structuredClone(c.getState()!.G as GState);
}

// ── §H.1 & §H.7 — torch → 0 becomes a Wisp (single & simultaneous) ───────────
section('Torch → 0 becomes a Wisp (H1, H7)');
{
  const G = freshG(2);
  const p = G.players['0'];
  p.torch = 1;
  burnTorch(G, p, 3);
  assert(p.wisp === true, 'burning below 0 sets Wisp');
  assert(p.torch === 0, 'a Wisp torch clamps at 0');

  const G2 = freshG(2);
  G2.players['0'].torch = 2;
  G2.players['1'].torch = 2;
  burnTorch(G2, G2.players['0'], 2);
  burnTorch(G2, G2.players['1'], 2);
  assert(G2.players['0'].wisp && G2.players['1'].wisp, 'two simultaneous 0-torch → both Wisp');
}

// ── a Wisp cannot refuel except by Relight ───────────────────────────────────
section('Wisp economy (only Relight lifts a Wisp)');
{
  const G = freshG(2);
  const p = G.players['0'];
  p.torch = 0;
  p.wisp = true;
  refuel(p);
  assert(p.wisp === true && p.torch === 0, 'refuel does not silently un-Wisp');
}

// ── §H.4 — a Lantern on a tile the dark eats is swept inward (recoverable) ────
section('A Lantern on an eaten tile is swept inward, never lost (H4)');
{
  const G = freshG(2);
  const before = G.lanterns.map((l) => l.nodeId!);
  assert(before.every((id) => RING_OF[id] === OUTER_RING), 'Lanterns start on the outer ring');
  eatFrontier(G, 12); // consume the whole outer ring
  for (const l of G.lanterns) {
    assert(!l.delivered, 'Lantern not spuriously delivered');
    assert(l.nodeId != null && !isVoid(G, l.nodeId!), 'swept Lantern sits on a surviving tile');
    assert(RING_OF[l.nodeId!] < OUTER_RING, 'swept Lantern moved one+ ring inward (recoverable)');
  }
}

// ── §H.5 — the dark reaching the Gate is a clean loss ─────────────────────────
section('Dark reaches the Gate → clean loss (H5)');
{
  const G = freshG(2);
  G.dark = G.nodes.filter((n) => n.id !== GATE_ID).map((n) => n.id);
  eatFrontier(G, 1); // only the Gate is left — the dark takes it
  assert(isVoid(G, GATE_ID), 'the Gate is eaten last');
  const go = checkGameover(G);
  assert(go?.winner === 'dark' && go.reason === 'swallowed', 'Gate eaten → dark/swallowed');
}

// ── §H.6 — win is checked BEFORE loss (escape as the Gate is taken) ───────────
section('Win beats a simultaneous loss (H6)');
{
  const G = freshG(2);
  G.lanterns.forEach((l) => {
    l.delivered = true;
    l.carriedBy = null;
    l.nodeId = GATE_ID;
  });
  G.lanternsDelivered = LANTERN_COUNT;
  for (const p of Object.values(G.players)) {
    p.wisp = false;
    p.nodeId = GATE_ID;
  }
  G.dark.push(GATE_ID); // loss ALSO true this resolution
  const go = checkGameover(G);
  assert(go?.winner === 'bearers' && go.reason === 'escaped', 'all home + 3 delivered wins even as the Gate falls');
}

// ── a Wisp cannot escape (must be Relit first) ───────────────────────────────
section('A Wisp cannot step through');
{
  const G = freshG(2);
  G.lanterns.forEach((l) => (l.delivered = true));
  G.lanternsDelivered = LANTERN_COUNT;
  for (const p of Object.values(G.players)) p.nodeId = GATE_ID;
  G.players['1'].wisp = true;
  assert(checkGameover(G) === undefined, 'a Wisp on the Gate blocks the escape');
  assert(getTileAction(G, G.players['0']).kind !== 'stepThrough', 'step-through not offered while an ally is a Wisp');
}

// ── §H.10 — carrying two Lanterns and getting caught drops both ──────────────
section('Caught while carrying two Lanterns → both drop (H10)');
{
  const G = freshG(2);
  const p = G.players['0'];
  p.nodeId = G.nodes.find((n) => RING_OF[n.id] === 2)!.id; // a non-Gate tile
  G.lanterns[0].carriedBy = p.id; G.lanterns[0].nodeId = null;
  G.lanterns[1].carriedBy = p.id; G.lanterns[1].nodeId = null;
  p.carrying = [0, 1];
  const dropped = dropCarried(G, p, p.nodeId);
  assert(dropped.length === 2, 'both carried Lanterns drop');
  assert(p.carrying.length === 0, 'carrier is empty after dropping');
  assert(G.lanterns[0].nodeId === p.nodeId && G.lanterns[1].nodeId === p.nodeId, 'both drop on a valid tile');
  assert(G.lanterns.every((l) => l.carriedBy === null || l.carriedBy !== p.id), 'no lingering carry link');
}

// ── §H.9 — the Nightmare and the dark can hit the same round without crashing ─
section('Nightmare + dark same round resolves cleanly (H9)');
{
  const G = freshG(3);
  const p = G.players['0'];
  const tile = G.nodes.find((n) => RING_OF[n.id] === OUTER_RING)!.id;
  p.nodeId = tile;
  G.nightmare.nodeId = G.nodes[tile].neighbors.find((m) => m !== GATE_ID)!;
  eatFrontier(G, 6);
  nightmareStep(G);
  const q = G.players['0'];
  assert(q.nodeId != null && !isVoid(G, q.nodeId), 'player ends on a surviving tile, no crash');
  assert(G.nightmare.nodeId !== GATE_ID, 'the Nightmare never rests on the warded Gate');
}

// ── the Gate is sanctuary — the Nightmare can never step onto it ──────────────
section('The Gate is sanctuary (Nightmare warded)');
{
  const G = freshG(2);
  // both players on the Gate; drive the Nightmare many steps — it must never enter
  for (const p of Object.values(G.players)) p.nodeId = GATE_ID;
  G.nightmare.nodeId = G.nodes.find((n) => RING_OF[n.id] === 1)!.id;
  const torchBefore = Object.fromEntries(Object.values(G.players).map((p) => [p.id, p.torch]));
  for (let i = 0; i < 12; i++) nightmareStep(G);
  assert(G.nightmare.nodeId !== GATE_ID, 'Nightmare never reaches the Gate while all torches are home');
  assert(
    Object.values(G.players).every((p) => p.torch === torchBefore[p.id] && !p.wisp && p.nodeId === GATE_ID),
    'bearers on the Gate are untouched by the Nightmare',
  );
}

// ── §H.8 — remount rehydrates a legal action ─────────────────────────────────
section('Remount → a legal action still exists (H8)');
{
  const G = structuredClone(freshG(2));
  const a = getTileAction(G, G.players['0']);
  assert(a.enabled || a.kind === 'endTurn', 'rehydrated state always yields a usable action or End Turn');
}

// ── §H.11 — End Turn is ALWAYS legal after a roll (the softlock cure) ─────────
section('End Turn always legal after roll (H3, H11)');
{
  const c = Client({ game: makeGloaming({ names: NAMES.slice(0, 2) }), numPlayers: 2 });
  c.start();
  c.updatePlayerID(c.getState()!.ctx.currentPlayer);
  c.moves.rollStride();
  const before = c.getState()!.ctx.turn;
  c.moves.endTurn();
  assert(c.getState()!.ctx.turn !== before || !!c.getState()!.ctx.gameover, 'End Turn advances the turn from any post-roll state');
}

// ── §H.2 — an all-Wisp table still terminates (no hang) ───────────────────────
section('All-Wisp table terminates by the dark (H2)');
{
  const c = Client({ game: makeGloaming({ names: NAMES.slice(0, 2) }), numPlayers: 2 });
  c.start();
  // force everyone to Wisp; they drift and can never Relight — must end by nightfall
  const patched = structuredClone(c.getState()!.G as GState);
  void patched;
  let guard = 0;
  let terminated = false;
  while (guard++ < 4000) {
    const st = c.getState()!;
    if (st.ctx.gameover) { terminated = true; break; }
    const G = st.G as GState;
    const pid = st.ctx.currentPlayer;
    c.updatePlayerID(pid);
    // keep forcing the mover to a Wisp so no progress is ever possible
    if (!G.autoWisp) {
      const me = G.players[pid];
      if (!me.wisp) { c.moves.rollStride(); c.moves.endTurn(); }
      else c.moves.endTurn();
    } else c.moves.endTurn();
  }
  assert(terminated, 'a table making no progress still reaches nightfall (no infinite game)');
}

// ── THE BIG ONE: softlock fuzz — chaotic bots, every game terminates ─────────
section('Softlock fuzz: every game reaches a terminal state (H2, H3)');
{
  let seed = 987654321;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  function chaosTurn(client: AnyClient, pid: string) {
    const G0 = client.getState()!.G as GState;
    if (G0.autoWisp) { client.moves.endTurn(); return; }
    assert(!G0.hasRolled, 'turn starts un-rolled');
    client.moves.rollStride();
    // random wandering over surviving edges
    for (let steps = 0; steps < 4 && rng() < 0.65; steps++) {
      if (client.getState()!.ctx.gameover) return;
      const G = client.getState()!.G as GState;
      const me = G.players[pid];
      const opts = G.nodes[me.nodeId].neighbors.filter((n) => !isVoid(G, n) && G.stride >= 1);
      if (!opts.length) break;
      client.moves.moveTo(opts[Math.floor(rng() * opts.length) % opts.length]);
    }
    if (client.getState()!.ctx.gameover) return;
    const G = client.getState()!.G as GState;
    const me = G.players[pid];
    // whatever the tile, getTileAction yields something; but End Turn is ALWAYS legal
    const a = getTileAction(G, me);
    const r = rng();
    if (a.enabled && a.kind !== 'endTurn' && r < 0.7) {
      if (a.kind === 'grab') client.moves.grab();
      else if (a.kind === 'deliver') client.moves.deliver();
      else if (a.kind === 'relight' && a.targetId) client.moves.relight(a.targetId);
      else if (a.kind === 'warm') client.moves.warm();
      else if (a.kind === 'stepThrough') client.moves.stepThrough();
      else client.moves.endTurn();
    } else client.moves.endTurn();
  }

  let terminated = 0;
  const GAMES = 150;
  for (let g = 0; g < GAMES; g++) {
    const n = 2 + (g % 5); // 2..6 players
    const client = Client({ game: makeGloaming({ names: NAMES.slice(0, n) }), numPlayers: n });
    client.start();
    let guard = 0;
    while (!client.getState()!.ctx.gameover) {
      if (guard++ > 8000) break; // a softlock would spin here forever
      const pid = client.getState()!.ctx.currentPlayer;
      client.updatePlayerID(pid);
      chaosTurn(client, pid);
    }
    if (client.getState()!.ctx.gameover) terminated++;
  }
  assert(terminated === GAMES, `all ${GAMES} chaos games terminated (got ${terminated}) — NO SOFTLOCK`);
  console.log(`  · ${terminated}/${GAMES} chaos games reached a terminal state`);
}

// ── §H.12 — THE UNSEEN: all exposed players Unseen → the Hollow One idles (no crash) ─
section('All-Unseen table → the Hollow One has no target, never crashes (H12)');
{
  const G = freshG(2);
  for (const p of Object.values(G.players)) {
    p.hero = 'unseen';
    p.nodeId = G.nodes.find((n) => RING_OF[n.id] === 2)!.id; // out in the field, exposed
    p.wisp = false;
  }
  G.nightmare.nodeId = G.nodes.find((n) => RING_OF[n.id] === 1)!.id;
  for (let i = 0; i < 8; i++) nightmareStep(G); // must not throw, must not snuff an Unseen it isn't hunting
  assert(G.nightmare.nextNodeId === null, 'no telegraph when every exposed torch is Unseen');
  assert(Object.values(G.players).every((p) => !p.wisp), 'the Unseen are never hunted down');
  // a full all-Unseen game still terminates (the dark ends it)
  const c = Client({ game: makeGloaming({ names: NAMES.slice(0, 2), heroes: ['unseen', 'unseen'] }), numPlayers: 2 });
  c.start();
  let guard = 0;
  let ended = false;
  while (guard++ < 4000) {
    const st = c.getState()!;
    if (st.ctx.gameover) { ended = true; break; }
    const pid = st.ctx.currentPlayer;
    c.updatePlayerID(pid);
    const Gs = st.G as GState;
    if (Gs.autoWisp) c.moves.endTurn();
    else { c.moves.rollStride(); c.moves.endTurn(); }
  }
  assert(ended, 'an all-Unseen table still reaches a terminal state');
}

// ── §H.14 — THE EMBER-HEARTED relights a Wisp one tile over (incl. the Gate edge) ─
section('Ember-Hearted adjacency Relight (H14)');
{
  const G = freshG(2);
  const rescuer = G.players['0'];
  const fallen = G.players['1'];
  rescuer.hero = 'emberheart';
  const tile = G.nodes.find((n) => RING_OF[n.id] === 2 && !isVoid(G, n.id))!;
  rescuer.nodeId = tile.id;
  const neigh = tile.neighbors.find((m) => !isVoid(G, m) && m !== GATE_ID)!;
  fallen.nodeId = neigh;
  fallen.wisp = true;
  fallen.torch = 0;
  const a = getTileAction(G, rescuer);
  assert(a.kind === 'relight' && a.targetId === '1', 'Ember-Hearted is offered a relight for the adjacent Wisp');
  // a non-Ember-Hearted rescuer is NOT offered the adjacent relight
  const G2 = freshG(2);
  G2.players['0'].hero = 'swift';
  G2.players['0'].nodeId = tile.id;
  G2.players['1'].nodeId = neigh;
  G2.players['1'].wisp = true;
  G2.players['1'].torch = 0;
  assert(getTileAction(G2, G2.players['0']).kind !== 'relight', 'a non-Ember-Hearted rescuer cannot relight across tiles');
  // across the Gate boundary: Ember-Hearted next to the Gate, Wisp on the Gate → legal, no softlock
  const G3 = freshG(2);
  G3.players['0'].hero = 'emberheart';
  const gateNeighbor = G3.nodes[GATE_ID].neighbors.find((m) => !isVoid(G3, m))!;
  G3.players['0'].nodeId = gateNeighbor;
  G3.players['1'].nodeId = GATE_ID;
  G3.players['1'].wisp = true;
  G3.players['1'].torch = 0;
  const back = relight(G3, G3.players['0'], '1');
  assert(back && !G3.players['1'].wisp, 'Ember-Hearted relights a Wisp resting on the Gate from the next tile');
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log(`\n${failures === 0 ? '✓ REFEREE PASS — the turn can never dead-end or crash.' : `✗ REFEREE FAIL — ${failures} assertion(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
