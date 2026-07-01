/**
 * GLOAMING v2 — headless Playtester (seed of WS5).
 * Drives the REAL reducer via a local boardgame.io client with a greedy co-op
 * bot, and reports the fun metrics: win-rate, length, dead-turn rate, comebacks.
 * Also the first softlock guard: every game must terminate.
 *
 * Run with the Vite resolver:  npm run playtest
 */
import { Client } from 'boardgame.io/client';
import { makeGloaming } from '../src/game/gloaming';
import type { GState } from '../src/game/types';
import { isSealed } from '../src/game/effects';
import { SEAL_STRIDE_COST, REKINDLE_COST, SEAT_NAMES } from '../src/game/constants';

type AnyClient = ReturnType<typeof Client>;

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

function moveToward(client: AnyClient, pid: string, goals: number[]): void {
  const goalSet = new Set(goals);
  for (let i = 0; i < 10; i++) {
    const st = client.getState()!;
    if (st.ctx.gameover) return;
    const G = st.G as GState;
    const me = G.players[pid];
    if (goalSet.has(me.nodeId)) return;
    const next = bfsNextStep(G, me.nodeId, goalSet);
    if (next === null) return;
    const cost = isSealed(G, me.nodeId, next) ? SEAL_STRIDE_COST : 1;
    if (G.stride < cost) return;
    client.moves.moveTo(next);
  }
}

const over = (client: AnyClient) => !!client.getState()!.ctx.gameover;

interface TurnStat {
  meaningful: boolean; // did the bot make a real choice (not a forced auto-pass)?
}

function takeTurn(client: AnyClient, pid: string, stats: TurnStat[]): void {
  let G = client.getState()!.G as GState;
  if (G.autoWisp) {
    client.moves.endTurn();
    stats.push({ meaningful: false }); // a Wisp drift — a forced, contentless turn
    return;
  }

  client.moves.rollStride();
  G = client.getState()!.G as GState;
  const goals = G.beaconsLit >= 3 ? [G.thresholdId] : G.beacons.filter((b) => !b.lit).map((b) => b.nodeId);
  moveToward(client, pid, goals);
  if (over(client)) {
    stats.push({ meaningful: true });
    return;
  }

  G = client.getState()!.G as GState;
  const me = G.players[pid];
  const node = G.nodes[me.nodeId];

  // fellowship: lift a fallen ally if we can
  const wispAlly = Object.values(G.players).find((p) => p.wisp && p.id !== pid && p.nodeId === me.nodeId);
  if (wispAlly && me.ember >= REKINDLE_COST + 1) {
    client.moves.rekindle(wispAlly.id);
    stats.push({ meaningful: true });
    return;
  }

  // Survival-first greedy: never pour yourself toward a Wisp — bank Ember, and
  // only kindle a beacon when flush. A "reasonable human" plays this way.
  const SAFE = 5;
  let move: 'brave' | 'steady' = 'steady';
  if (node.type === 'beacon') {
    const b = G.beacons.find((x) => x.nodeId === node.id);
    move = b && !b.lit && me.ember >= SAFE ? 'brave' : 'steady';
  } else if (node.type === 'wellspring') {
    move = me.ember <= 7 ? 'brave' : 'steady';
  } else if (node.type === 'threshold') {
    move = G.beaconsLit >= 3 ? 'brave' : 'steady';
  } else {
    // hollow / hearth / shrine — steady is usually the wise play; braving random
    // omens tends to feed the night. Only gamble with a healthy surplus.
    move = me.ember >= 10 ? 'brave' : 'steady';
  }
  client.moves[move]();
  stats.push({ meaningful: true });
}

interface Result {
  winner: string;
  reason: string;
  turns: number;
  night: number;
  nightMax: number;
  beaconsLit: number;
  deadTurns: number;
  totalTurns: number;
  softlock: boolean;
}

function playGame(numPlayers: number): Result {
  const names = SEAT_NAMES.slice(0, numPlayers) as unknown as string[];
  const client = Client({ game: makeGloaming({ names }), numPlayers });
  client.start();

  const stats: TurnStat[] = [];
  let guard = 0;
  let softlock = false;
  while (!client.getState()!.ctx.gameover) {
    if (guard++ > 4000) {
      softlock = true;
      break;
    }
    const ctx = client.getState()!.ctx;
    const pid = ctx.currentPlayer;
    client.updatePlayerID(pid);
    takeTurn(client, pid, stats);
  }

  const s = client.getState()!;
  const go = s.ctx.gameover ?? { winner: 'none', reason: 'softlock' };
  const G = s.G as GState;
  const deadTurns = stats.filter((t) => !t.meaningful).length;
  return {
    winner: go.winner ?? 'none',
    reason: go.reason ?? 'softlock',
    turns: s.ctx.turn,
    night: G.night,
    nightMax: G.nightMax,
    beaconsLit: G.beaconsLit,
    deadTurns,
    totalTurns: stats.length,
    softlock,
  };
}

function run(numPlayers: number, games: number) {
  const results: Result[] = [];
  for (let i = 0; i < games; i++) results.push(playGame(numPlayers));

  const wins = results.filter((r) => r.winner === 'lanternbearers').length;
  const softlocks = results.filter((r) => r.softlock).length;
  const avgTurns = results.reduce((s, r) => s + r.turns, 0) / games;
  const avgBeacons = results.reduce((s, r) => s + r.beaconsLit, 0) / games;
  const totalTurns = results.reduce((s, r) => s + r.totalTurns, 0);
  const deadTurns = results.reduce((s, r) => s + r.deadTurns, 0);
  const nailBiters = results.filter((r) => Math.abs(r.night - r.nightMax) <= 3 && r.beaconsLit >= 2).length;

  console.log(`\n── ${numPlayers} players · ${games} games ─────────────────────`);
  console.log(`  win-rate      ${((wins / games) * 100).toFixed(0)}%  (target 45-55%)`);
  console.log(`  avg turns     ${avgTurns.toFixed(1)}  (~${(avgTurns / numPlayers).toFixed(1)} rounds)`);
  console.log(`  avg beacons   ${avgBeacons.toFixed(2)} / 3 lit at end`);
  console.log(`  dead-turn     ${((deadTurns / totalTurns) * 100).toFixed(1)}%  (target ~0)`);
  console.log(`  nail-biters   ${((nailBiters / games) * 100).toFixed(0)}%`);
  console.log(`  SOFTLOCKS     ${softlocks}  (MUST be 0)`);
  const reasons: Record<string, number> = {};
  for (const r of results) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  console.log(`  outcomes     `, reasons);
  return { softlocks };
}

let softlockTotal = 0;
for (const n of [2, 3, 4]) softlockTotal += run(n, 60).softlocks;
console.log(`\n${softlockTotal === 0 ? 'OK: no softlocks across all games' : `FAIL: ${softlockTotal} SOFTLOCKS`}`);
process.exit(softlockTotal === 0 ? 0 : 1);
