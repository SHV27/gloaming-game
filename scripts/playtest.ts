/**
 * GLOAMING v4 — *Trapped Inside*. Headless Playtester over the REAL reducer.
 * A greedy co-op bot (≈ a reasonable human: fetch Lanterns, deliver, rescue,
 * gather, escape) plays many full games per player count and reports the fun
 * metrics (PLAN §I): win-rate ~45–55%, length ~20–30 min, dead-turn ≈ 0,
 * comebacks + nail-biters present. Also the softlock guard: every game terminates.
 *
 * S6: every game assigns RANDOM heroes (Pillar 3), and we report the per-hero
 * win-rate spread (must stay ≤ ±8 pts — no mandatory pick, no trap pick).
 * The Grandmaster gap (a smart bot vs this greedy one, ≥ +15 pts) lives in
 * `scripts/grandmaster.ts`.
 *
 * Run with the Vite resolver:  npm run playtest
 */
import { Client } from 'boardgame.io/client';
import { makeGloaming } from '../src/game/gloaming';
import type { GState } from '../src/game/types';
import { getTileAction, isVoid } from '../src/game/effects';
import { LANTERN_COUNT, SEAT_NAMES } from '../src/game/constants';
import { HERO_IDS, type HeroId } from '../src/game/heroes';
import { RING_OF } from '../src/game/board';

type AnyClient = ReturnType<typeof Client>;
const over = (c: AnyClient) => !!c.getState()!.ctx.gameover;

function bfsNextStep(G: GState, from: number, goals: Set<number>): number | null {
  if (goals.has(from)) return null;
  const prev = new Map<number, number>();
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of G.nodes[cur].neighbors) {
      if (seen.has(n) || isVoid(G, n)) continue;
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

/** What this bot wants to reach: deliver if carrying, else fetch a Lantern,
 *  else rescue a Wisp, else gather at the Gate. */
function chooseGoals(G: GState, pid: string): number[] {
  const me = G.players[pid];
  if (me.carrying.length > 0) return [G.gateId];
  const onBoard = G.lanterns
    .filter((l) => !l.delivered && l.carriedBy === null && l.nodeId != null)
    .map((l) => l.nodeId!);
  if (onBoard.length) return onBoard;
  const wisps = Object.values(G.players).filter((p) => p.wisp && p.id !== pid).map((p) => p.nodeId);
  if (wisps.length && G.lanternsDelivered >= LANTERN_COUNT) return wisps;
  return [G.gateId];
}

function moveToward(client: AnyClient, pid: string, goals: number[]): void {
  const set = new Set(goals);
  for (let i = 0; i < 12; i++) {
    const st = client.getState()!;
    if (st.ctx.gameover) return;
    const G = st.G as GState;
    const me = G.players[pid];
    if (set.has(me.nodeId) || G.stride < 1) return;
    const next = bfsNextStep(G, me.nodeId, set);
    if (next === null) return;
    // don't walk your torch out on frayed tiles unless you must
    if (G.fraying.includes(next) && me.torch <= 1 && me.nodeId !== next) return;
    client.moves.moveTo(next);
  }
}

interface TurnStat {
  meaningful: boolean;
  wisp: boolean;
}

function takeTurn(client: AnyClient, pid: string, stats: TurnStat[]): void {
  let G = client.getState()!.G as GState;
  if (G.autoWisp) {
    client.moves.endTurn();
    stats.push({ meaningful: false, wisp: true });
    return;
  }

  client.moves.rollStride();
  moveToward(client, pid, chooseGoals(G, pid));
  if (over(client)) {
    stats.push({ meaningful: true, wisp: false });
    return;
  }

  G = client.getState()!.G as GState;
  const me = G.players[pid];
  if (!me || me.wisp) {
    // guttered out mid-move — the turn auto-passes
    if (!over(client)) client.moves.endTurn();
    stats.push({ meaningful: false, wisp: true });
    return;
  }
  const a = getTileAction(G, me);
  if (a.enabled && a.kind === 'stepThrough') client.moves.stepThrough();
  else if (a.enabled && a.kind === 'grab') client.moves.grab();
  else if (a.enabled && a.kind === 'deliver') client.moves.deliver();
  else if (a.enabled && a.kind === 'relight' && a.targetId) client.moves.relight(a.targetId);
  else if (a.enabled && a.kind === 'warm') client.moves.warm();
  else client.moves.endTurn();
  stats.push({ meaningful: true, wisp: false });
}

interface Result {
  winner: string;
  reason: string;
  rounds: number;
  delivered: number;
  darkFrac: number; // fraction of the board eaten at the end
  deadTurns: number;
  totalTurns: number;
  nailBiter: boolean;
  softlock: boolean;
  perPlayer: { hero: HeroId; won: boolean }[];
}

const rndHero = (): HeroId => HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)];

function playGame(numPlayers: number): Result {
  const names = SEAT_NAMES.slice(0, numPlayers) as unknown as string[];
  const heroes = Array.from({ length: numPlayers }, rndHero);
  const client = Client({ game: makeGloaming({ names, heroes }), numPlayers });
  client.start();

  const stats: TurnStat[] = [];
  let guard = 0;
  let softlock = false;
  let minLightIslandLate = Infinity; // how small the surviving island got near the end
  while (!client.getState()!.ctx.gameover) {
    if (guard++ > 6000) {
      softlock = true;
      break;
    }
    const ctx = client.getState()!.ctx;
    const pid = ctx.currentPlayer;
    client.updatePlayerID(pid);
    takeTurn(client, pid, stats);
    const G = client.getState()!.G as GState;
    const alive = G.nodes.filter((n) => !isVoid(G, n.id)).length;
    if (G.lanternsDelivered >= 2) minLightIslandLate = Math.min(minLightIslandLate, alive);
  }

  const s = client.getState()!;
  const go = s.ctx.gameover ?? { winner: 'none', reason: 'softlock' };
  const G = s.G as GState;
  const total = G.nodes.length;
  const darkFrac = G.dark.length / total;
  const won = go.winner === 'bearers';
  // a nail-biter: decided with the dark deep into the inner rings (few tiles left)
  const innerLeft = G.nodes.filter((n) => !isVoid(G, n.id) && RING_OF[n.id] <= 1).length;
  const nailBiter = (won || go.reason === 'swallowed') && (darkFrac >= 0.6 || innerLeft <= 3) && minLightIslandLate <= 10;

  return {
    winner: go.winner ?? 'none',
    reason: go.reason ?? 'softlock',
    rounds: G.round,
    delivered: G.lanternsDelivered,
    darkFrac,
    deadTurns: stats.filter((t) => !t.meaningful).length,
    totalTurns: stats.length,
    nailBiter,
    softlock,
    perPlayer: heroes.map((h) => ({ hero: h, won })),
  };
}

const heroTally: Record<HeroId, { games: number; wins: number }> = Object.fromEntries(
  HERO_IDS.map((h) => [h, { games: 0, wins: 0 }]),
) as Record<HeroId, { games: number; wins: number }>;

function run(numPlayers: number, games: number) {
  const results: Result[] = [];
  for (let i = 0; i < games; i++) results.push(playGame(numPlayers));

  const wins = results.filter((r) => r.winner === 'bearers').length;
  const softlocks = results.filter((r) => r.softlock).length;
  const avgRounds = results.reduce((s, r) => s + r.rounds, 0) / games;
  const avgDelivered = results.reduce((s, r) => s + r.delivered, 0) / games;
  const totalTurns = results.reduce((s, r) => s + r.totalTurns, 0);
  const deadWisp = results.reduce((s, r) => s + r.deadTurns, 0);
  const nail = results.filter((r) => r.nailBiter).length;

  for (const r of results)
    for (const pp of r.perPlayer) {
      heroTally[pp.hero].games++;
      if (pp.won) heroTally[pp.hero].wins++;
    }

  console.log(`\n── ${numPlayers} players · ${games} games ─────────────────────`);
  console.log(`  win-rate      ${((wins / games) * 100).toFixed(0)}%  (target 45-55%)`);
  console.log(`  avg rounds    ${avgRounds.toFixed(1)}  (~${(avgRounds * numPlayers * 0.4).toFixed(0)} min est.)`);
  console.log(`  avg delivered ${avgDelivered.toFixed(2)} / ${LANTERN_COUNT}`);
  console.log(`  dead-turn     ${((deadWisp / totalTurns) * 100).toFixed(1)}%  (Wisp drifts; target low)`);
  console.log(`  nail-biters   ${((nail / games) * 100).toFixed(0)}%`);
  console.log(`  SOFTLOCKS     ${softlocks}  (MUST be 0)`);
  const reasons: Record<string, number> = {};
  for (const r of results) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  console.log(`  outcomes     `, reasons);
  return { softlocks, winRate: wins / games };
}

let softlockTotal = 0;
for (const n of [2, 3, 4]) softlockTotal += run(n, 150).softlocks;

// ── per-hero balance (spread must stay ≤ ±8 pts) ─────────────────────────────
console.log(`\n── per-hero win-rate (random hero assignment, all counts) ──`);
const heroRates = HERO_IDS.map((h) => ({
  h,
  rate: heroTally[h].games ? (heroTally[h].wins / heroTally[h].games) * 100 : 0,
  n: heroTally[h].games,
}));
const mean = heroRates.reduce((s, x) => s + x.rate, 0) / heroRates.length;
let maxDev = 0;
for (const x of heroRates) {
  const dev = x.rate - mean;
  maxDev = Math.max(maxDev, Math.abs(dev));
  console.log(`  ${x.h.padEnd(12)} ${x.rate.toFixed(0)}%  (${x.n} games, ${dev >= 0 ? '+' : ''}${dev.toFixed(1)} vs mean)`);
}
const spreadOk = maxDev <= 8;
console.log(`  mean ${mean.toFixed(0)}% · max deviation ${maxDev.toFixed(1)} pts  (${spreadOk ? 'OK ≤±8' : 'FAIL >±8'})`);

console.log(`\n${softlockTotal === 0 ? 'OK: no softlocks across all games' : `FAIL: ${softlockTotal} SOFTLOCKS`}`);
process.exit(softlockTotal === 0 ? 0 : 1);
