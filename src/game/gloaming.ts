import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { GState, Player, GloamingIntent } from './types';
import { BOARD, HEARTH_ID, THRESHOLD_ID, BEACON_NODE_IDS } from './board';
import { OMEN_DECK } from './events';
import {
  EMBER_START,
  nightMaxFor,
  beaconNeedFor,
  actFor,
  emberDrainFor,
  intentCountFor,
  NIGHT_TIDE,
  ACT_NAMES,
  REKINDLE_COST,
  REKINDLE_TARGET_EMBER,
  SEAT_NAMES,
  MIN_MARKED_PLAYERS,
} from './constants';
import {
  log,
  flash,
  drainEmber,
  gainEmber,
  addNight,
  strideCostFor,
  executeIntent,
  chooseIntent,
  checkGameover,
  applyBrave,
  steadyEmberAt,
} from './effects';

interface RandomAPI {
  D6: () => number;
  Die: (spotvalue: number) => number;
  Number: () => number;
  Shuffle: <T>(deck: T[]) => T[];
}

function drawOmen(G: GState, random: RandomAPI): number | null {
  if (G.deck.length === 0) {
    if (G.discard.length === 0) return null;
    G.deck = random.Shuffle(G.discard);
    G.discard = [];
  }
  return G.deck.pop() ?? null;
}

/** Drift a Wisp one step toward the Hearth (the safe current). */
function driftToward(G: GState, p: Player, hearthId: number): void {
  if (p.nodeId === hearthId) return;
  const h = G.nodes[hearthId];
  let best = p.nodeId;
  let bestD = Infinity;
  for (const m of G.nodes[p.nodeId].neighbors) {
    const nm = G.nodes[m];
    const d = (nm.x - h.x) ** 2 + (nm.y - h.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  p.nodeId = best;
}

export interface GloamingConfig {
  names: string[]; // 2–6 names; length = numPlayers
  marked?: boolean; // seat one hidden Marked (4+ players)
}

export function makeGloaming(config: GloamingConfig): Game<GState> {
  const names = config.names;

  return {
    name: 'gloaming',

    setup: ({ random }): GState => {
      const nodes = BOARD.slice()
        .map((n) => ({ ...n, neighbors: [...n.neighbors] }))
        .sort((a, b) => a.id - b.id);

      let markedId: string | null = null;
      if (config.marked && names.length >= MIN_MARKED_PLAYERS) {
        markedId = String(random.Die(names.length) - 1);
      }

      const players: Record<string, Player> = {};
      names.forEach((nm, seat) => {
        players[String(seat)] = {
          id: String(seat),
          name: nm || SEAT_NAMES[seat] || `Bearer ${seat + 1}`,
          seat,
          nodeId: HEARTH_ID,
          ember: EMBER_START,
          wisp: false,
          role: String(seat) === markedId ? 'marked' : 'bearer',
        };
      });

      const ids = OMEN_DECK.map((c) => c.id);
      const deck = random && random.Shuffle ? random.Shuffle(ids) : ids.slice().reverse();
      const nightMax = nightMaxFor(names.length);

      return {
        players,
        nodes,
        sealedEdges: [],
        beacons: BEACON_NODE_IDS.map((nodeId) => ({ nodeId, progress: 0, lit: false })),
        beaconsLit: 0,
        thresholdId: THRESHOLD_ID,
        beaconNeed: beaconNeedFor(names.length),
        night: 0,
        nightMax,
        act: 0,
        deck,
        discard: [],
        turnOmen: null,
        intents: [],
        stalker: null,
        snuffCd: 0,
        stride: 0,
        hasRolled: false,
        movedThisTurn: false,
        acted: false,
        boardActed: false,
        lastRoll: null,
        autoWisp: false,
        log: [
          {
            id: 0,
            turn: 0,
            tone: 'neutral',
            text: 'Night is coming. Light the three Beacons, gather at the Threshold, and cross — before the dark drowns the world.',
          },
        ],
        logSeq: 1,
        flash: null,
        flashSeq: 1,
        hasMarked: markedId !== null,
        castOutUsed: false,
        markedExposed: false,
        sowedThisTurn: false,
        secret: { markedId },
      };
    },

    // Secret State: each client sees only its OWN role; `secret` is wiped.
    playerView: ({ G, playerID }) => ({
      ...G,
      players: Object.fromEntries(
        Object.entries(G.players).map(([id, p]) => [
          id,
          id === playerID ? p : { ...p, role: undefined },
        ]),
      ),
      secret: { markedId: null },
    }),

    turn: {
      onBegin: ({ G, ctx, random }) => {
        G.stride = 0;
        G.hasRolled = false;
        G.movedThisTurn = false;
        G.acted = false;
        G.boardActed = false;
        G.lastRoll = null;
        G.autoWisp = false;
        G.turnOmen = null;
        G.flash = null;
        G.sowedThisTurn = false;

        const p = G.players[ctx.currentPlayer];
        if (!p) return;

        // The night gnaws at the active bearer's lantern (the heartbeat drain).
        drainEmber(G, p, emberDrainFor(G.act));

        if (p.wisp) {
          // A Wisp's turn auto-resolves — it drifts and passes. Never a dead end.
          G.autoWisp = true;
          G.hasRolled = true;
          G.acted = true;
          driftToward(G, p, HEARTH_ID);
          log(G, `${p.name} drifts on the cold current — a Wisp, seeking the Hearth's warmth.`, 'dread');
          return;
        }

        G.turnOmen = drawOmen(G, random as RandomAPI);
      },

      onEnd: ({ G, random }) => {
        if (G.boardActed) return; // idempotency guard
        G.boardActed = true;

        // the turn's omen passes if it went unbraved
        if (G.turnOmen != null) {
          G.discard.push(G.turnOmen);
          G.turnOmen = null;
        }

        // 1 · the Gloaming carries out what it telegraphed last turn
        for (const it of G.intents) executeIntent(G, it, random as RandomAPI);
        G.intents = [];
        if (G.snuffCd > 0) G.snuffCd--; // the snuff cooldown ticks down each board phase

        // 2 · the tide always rises (the knowable clock)
        addNight(G, NIGHT_TIDE);

        // 3 · the night may deepen into the next Act
        const prevAct = G.act;
        G.act = actFor(G.night, G.nightMax);
        if (G.act > prevAct) {
          flash(G, 'act-change');
          log(G, `${ACT_NAMES[G.act]} falls. The Gloaming grows bolder.`, 'dread');
        }

        // 4 · choose + telegraph the next strike(s) (cunning, but you see it coming)
        const k = intentCountFor(G.act);
        const next: GloamingIntent[] = [];
        for (let i = 0; i < k; i++) {
          const it = chooseIntent(G, random as RandomAPI);
          // avoid telegraphing the same beacon-snuff twice in one breath
          if (next.some((q) => q.kind === it.kind && q.beaconNodeId === it.beaconNodeId && it.kind === 'snuff')) {
            next.push({ kind: 'surge', telegraph: 'The night gathers itself to surge.' });
          } else next.push(it);
        }
        G.intents = next;
      },
    },

    moves: {
      // — roll the Stride die (opens the turn) —
      rollStride: ({ G, ctx, random }) => {
        const p = G.players[ctx.currentPlayer];
        if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
        if (G.hasRolled || G.acted) return INVALID_MOVE;
        const r = random.D6();
        G.stride = r;
        G.lastRoll = r;
        G.hasRolled = true;
        flash(G, 'dice');
      },

      // — move one node along an edge, spending stride (sealed roads cost more) —
      moveTo: ({ G, ctx }, nodeId: number) => {
        const p = G.players[ctx.currentPlayer];
        if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
        if (!G.hasRolled || G.acted) return INVALID_MOVE;
        if (!G.nodes[p.nodeId].neighbors.includes(nodeId)) return INVALID_MOVE;
        const cost = strideCostFor(G, p.nodeId, nodeId);
        if (G.stride < cost) return INVALID_MOVE;
        G.stride -= cost;
        p.nodeId = nodeId;
        G.movedThisTurn = true;
      },

      // — BRAVE: the bold, contextual play (then the board takes its turn) —
      brave: {
        move: ({ G, ctx, events, random }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
          if (!G.hasRolled || G.acted) return INVALID_MOVE;
          const node = G.nodes[p.nodeId];

          if (node.type === 'threshold') {
            if (G.beaconsLit < 3) return INVALID_MOVE; // the gate is sealed
            log(G, `${p.name} steps to the very edge of the dawn and waits for the others.`, 'hope');
          } else {
            const ok = applyBrave(G, p, random as RandomAPI);
            if (!ok) return INVALID_MOVE;
          }
          G.acted = true;
          if (!checkGameover(G)) events.endTurn(); // let a winning move win before the board strikes
        },
        undoable: false,
      },

      // — STEADY: the always-legal safe floor (+Ember) — no turn can dead-end —
      steady: {
        move: ({ G, ctx, events }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
          if (!G.hasRolled || G.acted) return INVALID_MOVE;
          gainEmber(p, steadyEmberAt(G, p));
          G.acted = true;
          log(G, `${p.name} steadies the flame and breathes. The lantern holds.`, 'hope');
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // — REKINDLE a fallen ally on your node (fellowship; spends your Ember) —
      rekindle: {
        move: ({ G, ctx, events }, targetId: string) => {
          const p = G.players[ctx.currentPlayer];
          const t = G.players[targetId];
          if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
          if (!G.hasRolled || G.acted) return INVALID_MOVE;
          if (!t || t.id === p.id || !t.wisp) return INVALID_MOVE;
          if (t.nodeId !== p.nodeId) return INVALID_MOVE;
          if (p.ember < REKINDLE_COST + 1) return INVALID_MOVE; // keep enough to not gutter out yourself
          p.ember -= REKINDLE_COST;
          t.wisp = false;
          t.ember = REKINDLE_TARGET_EMBER;
          flash(G, 'rekindle', t.nodeId);
          log(G, `${p.name} cups their hands and breathes ${t.name} back into the light.`, 'fellow');
          G.acted = true;
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // — pass the turn (Wisp auto-drift, or an explicit skip after acting) —
      endTurn: ({ G, events }) => {
        if (!G.autoWisp && !G.acted) return INVALID_MOVE;
        events.endTurn();
      },

      // — the party's one accusation against a suspected Marked (4+) —
      castOut: {
        move: ({ G, ctx }, targetId: string) => {
          const p = G.players[ctx.currentPlayer];
          const t = G.players[targetId];
          if (!G.hasMarked || G.castOutUsed) return INVALID_MOVE;
          if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
          if (!t || t.id === p.id) return INVALID_MOVE;
          G.castOutUsed = true;
          if (t.role === 'marked') {
            G.markedExposed = true;
            addNight(G, -4);
            log(G, `The circle turns on ${t.name} — and the dark recoils. ${t.name} was Marked. Their hand is stilled.`, 'fellow');
          } else {
            addNight(G, 4);
            log(G, `${p.name} accuses ${t.name} — but the dark only laughs. No traitor, and the night gains.`, 'dread');
          }
        },
        undoable: false,
      },

      // — the Marked's covert sabotage (Marked-only; feeds the night) —
      sow: ({ G, ctx }) => {
        const p = G.players[ctx.currentPlayer];
        if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
        if (p.role !== 'marked' || G.markedExposed) return INVALID_MOVE;
        if (G.sowedThisTurn) return INVALID_MOVE;
        if (p.ember <= 2) return INVALID_MOVE; // can't sow yourself to a Wisp
        G.sowedThisTurn = true;
        addNight(G, 1);
        drainEmber(G, p, 1); // self-cost — sow too greedily and you gutter (a tell)
        log(G, 'A chill that belongs to no season deepens. The dark gains, somehow.', 'dread');
      },
    },

    endIf: ({ G }) => checkGameover(G),
  };
}
