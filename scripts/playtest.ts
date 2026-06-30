/**
 * GLOAMING — headless proof + balance sim.  `npm run playtest`
 *
 *  1. Pure assertions: WIN (crossed), LOSS (nightfell + all-lost) via the real
 *     effect helpers & checkGameover.
 *  2. Real-reducer simulation: a greedy bot plays full games through the actual
 *     boardgame.io reducer; we assert BOTH a win and a loss are reachable, and
 *     print win-rate / length (the seed of S2's balance loop).
 */
import { Client } from 'boardgame.io/client';
import { makeGloaming } from '../src/game/gloaming';
import {
  checkGameover,
  addBeaconEmber,
  drainLight,
  recomputeBeaconsLit,
  isCorrupted,
} from '../src/game/effects';
import { OMEN_DECK } from '../src/game/events';
import { THRESHOLD_ID } from '../src/game/board';
import { SEAT_NAMES, EMBERS_PER_BEACON } from '../src/game/constants';
import type { GState, GameoverState } from '../src/game/types';

let failures = 0;
function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    console.log(`  \x1b[31m✗ ${label}\x1b[0m`);
    failures++;
  }
}

// ── headless client ──────────────────────────────────────────────────────────
type AnyClient = ReturnType<typeof Client>;
function makeClient(names: string[]): AnyClient {
  const c = Client({ game: makeGloaming({ names }), numPlayers: names.length });
  c.start();
  return c;
}
const G = (c: AnyClient): GState => c.getState()!.G as GState;
const ctx = (c: AnyClient) => c.getState()!.ctx;

// ── pure WIN / LOSS / ALL-LOST ───────────────────────────────────────────────
function pureTests() {
  console.log('\n\x1b[1mPure rules\x1b[0m');
  const base = structuredClone(G(makeClient([...SEAT_NAMES.slice(0, 3)])));

  // WIN: 3 beacons lit + everyone on the Threshold
  {
    const g = structuredClone(base);
    g.beacons.forEach((b) => {
      b.lit = true;
      b.embers = 3;
    });
    recomputeBeaconsLit(g);
    Object.values(g.players).forEach((p) => (p.nodeId = THRESHOLD_ID));
    const over = checkGameover(g);
    assert(over?.winner === 'lanternbearers' && over.reason === 'crossed', 'all beacons lit + all at Threshold ⇒ survivors win');
  }

  // WIN must NOT trigger with only 2 beacons
  {
    const g = structuredClone(base);
    g.beacons[0].lit = true;
    g.beacons[1].lit = true;
    recomputeBeaconsLit(g);
    Object.values(g.players).forEach((p) => (p.nodeId = THRESHOLD_ID));
    assert(checkGameover(g) === undefined, 'Threshold is sealed until the 3rd beacon lights');
  }

  // kindle path: a full charge of embers lights a beacon (and under-feeding doesn't)
  {
    const g = structuredClone(base);
    addBeaconEmber(g, g.beacons[0].nodeId, EMBERS_PER_BEACON - 1);
    assert(!g.beacons[0].lit, 'an under-fed beacon stays dark');
    addBeaconEmber(g, g.beacons[0].nodeId, 1);
    assert(g.beacons[0].lit && g.beaconsLit === 1, `feeding ${EMBERS_PER_BEACON} embers lights a beacon`);
  }

  // LOSS: dread fills
  {
    const g = structuredClone(base);
    g.dread = g.dreadMax;
    const over = checkGameover(g);
    assert(over?.winner === 'gloaming' && over.reason === 'nightfell', 'Dread at max ⇒ night falls (loss)');
  }

  // dimmed → struck again → Lost → all-lost loss
  {
    const g = structuredClone(base);
    const roll = { Number: () => 0, Die: () => 1 };
    Object.values(g.players).forEach((p) => {
      drainLight(g, p, 99); // to 0 → dimmed (+ grace)
      drainLight(g, p, 1); // grace absorbs this one — still alive
    });
    assert(
      Object.values(g.players).every((p) => p.alive && p.dimmed),
      'grace: a freshly-dimmed bearer survives the next strike',
    );
    Object.values(g.players).forEach((p) => drainLight(g, p, 1)); // grace spent → lost
    const over = checkGameover(g);
    assert(over?.winner === 'gloaming' && over.reason === 'all-lost', 'every bearer lost ⇒ all-lost loss');
    void roll;
  }
}

// ── greedy bot ────────────────────────────────────────────────────────────────
function bfs(g: GState, from: number, goal: number): number[] | null {
  if (from === goal) return [];
  const prev = new Map<number, number>();
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of g.nodes[cur].neighbors) {
      if (seen.has(n)) continue;
      seen.add(n);
      prev.set(n, cur);
      if (n === goal) {
        const path: number[] = [];
        let x = n;
        while (x !== from) {
          path.unshift(x);
          x = prev.get(x)!;
        }
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

function nearest(g: GState, from: number, targets: number[]): number | null {
  let best: number | null = null;
  let bestLen = Infinity;
  for (const t of targets) {
    const p = bfs(g, from, t);
    if (p && p.length < bestLen) {
      bestLen = p.length;
      best = t;
    }
  }
  return best;
}

function chooseGoal(g: GState, nodeId: number, light: number, embers: number): number | null {
  if (g.beaconsLit < 3) {
    const wells = g.nodes.filter((n) => n.type === 'wellspring').map((n) => n.id);
    if (light <= 3) return nearest(g, nodeId, wells); // survive first
    const unlit = g.beacons.filter((b) => !b.lit).map((b) => b.nodeId);
    if (embers > 0 && unlit.length) return nearest(g, nodeId, unlit);
    return nearest(g, nodeId, wells);
  }
  return THRESHOLD_ID;
}

function resolvePending(c: AnyClient) {
  let g = G(c);
  let guard = 0;
  while (g.pendingEvent && guard++ < 5) {
    const card = OMEN_DECK[g.pendingEvent.cardId];
    let best = 0;
    let bestScore = -1e9;
    card.choices.forEach((ch, i) => {
      let sc = 0;
      for (const e of ch.effects) {
        if (e.kind === 'dread') sc -= (e.amount ?? 0) * 3;
        else if (e.kind === 'light') sc += e.amount ?? 0;
        else if (e.kind === 'embers') sc += (e.amount ?? 0) * 1.2;
        else if (e.kind === 'beaconEmber') sc += 4;
        else if (e.kind === 'grantItem') sc += 2;
        else if (e.kind === 'corruptEdge') sc -= 2;
        else if (e.kind === 'doubleNextDrain') sc -= 2;
      }
      if (sc > bestScore) {
        bestScore = sc;
        best = i;
      }
    });
    c.moves.resolveOmen(best);
    g = G(c);
  }
}

function playTurn(c: AnyClient) {
  const pid = ctx(c).currentPlayer;
  if (!G(c).players[pid].alive) {
    c.moves.endTurn();
    return;
  }
  resolvePending(c);
  if (ctx(c).gameover) return; // an omen can fill Dread and end the game
  if (G(c).players[pid].dimmed) {
    c.moves.endTurn();
    return;
  }

  // lift a co-located dimmed ally if we can
  {
    const g = G(c);
    const me = g.players[pid];
    const ally = Object.values(g.players).find(
      (p) => p.id !== pid && p.alive && p.dimmed && p.nodeId === me.nodeId,
    );
    if (ally && me.light > 2) c.moves.aid(ally.id, 'revive', 0);
  }

  c.moves.rollStride();

  for (let guard = 0; guard < 16; guard++) {
    if (ctx(c).gameover) return;
    const g = G(c);
    const me = g.players[pid];
    const node = g.nodes[me.nodeId];
    const budgetLeft = 1 + g.pressOns - g.actionsTaken;

    const beacon = g.beacons.find((b) => b.nodeId === me.nodeId && !b.lit);
    if (beacon && me.embers > 0 && budgetLeft > 0) {
      c.moves.kindle(Math.min(me.embers, EMBERS_PER_BEACON - beacon.embers));
      continue;
    }
    if (node.type === 'wellspring' && budgetLeft > 0) {
      if (me.light <= 4) {
        c.moves.gather('light');
        continue;
      }
      if (me.embers < EMBERS_PER_BEACON) {
        c.moves.gather('embers');
        continue;
      }
    }

    const goal = chooseGoal(g, me.nodeId, me.light, me.embers);
    if (goal == null) break;
    const path = bfs(g, me.nodeId, goal);
    if (!path || path.length === 0) break;
    const next = path[0];
    const cost = isCorrupted(g, me.nodeId, next) ? 2 : 1;
    if (g.stride >= cost) c.moves.moveTo(next);
    else break;
  }

  if (ctx(c).gameover) return;
  const g = G(c);
  const me = g.players[pid];
  if (me.alive && !me.dimmed && me.light <= 3 && 1 + g.pressOns - g.actionsTaken > 0) {
    c.moves.steady();
  }
  if (!ctx(c).gameover) c.moves.endTurn();
}

function simulate(numPlayers: number): { over: GameoverState; turns: number } {
  const c = makeClient(SEAT_NAMES.slice(0, numPlayers).map((n) => n));
  let turns = 0;
  while (!ctx(c).gameover && turns < 600) {
    playTurn(c);
    turns++;
  }
  return { over: ctx(c).gameover as GameoverState, turns };
}

function simTests() {
  console.log('\n\x1b[1mReal-reducer simulation (greedy bot)\x1b[0m');
  const N = 100;
  let wins = 0;
  let losses = 0;
  let totalTurns = 0;
  const reasons: Record<string, number> = {};
  for (let i = 0; i < N; i++) {
    const players = 2 + (i % 3); // 2,3,4
    const { over, turns } = simulate(players);
    totalTurns += turns;
    reasons[over?.reason ?? 'none'] = (reasons[over?.reason ?? 'none'] ?? 0) + 1;
    if (over?.winner === 'lanternbearers') wins++;
    else losses++;
  }
  console.log(`  ${N} games · win-rate ${((wins / N) * 100).toFixed(0)}% · avg ${(totalTurns / N).toFixed(0)} turns`);
  console.log(`  outcomes: ${JSON.stringify(reasons)}`);
  assert(wins > 0, 'the game is winnable through the real engine');
  assert(losses > 0, 'the game is losable through the real engine');
}

pureTests();
simTests();

console.log(
  failures === 0
    ? '\n\x1b[32m\x1b[1mAll proofs passed.\x1b[0m\n'
    : `\n\x1b[31m\x1b[1m${failures} proof(s) failed.\x1b[0m\n`,
);
process.exit(failures === 0 ? 0 : 1);
