import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { GState, Player, ItemId, LogTone, EventType } from './types';
import { BOARD, HEARTH_ID, THRESHOLD_ID, BEACON_NODE_IDS } from './board';
import { OMEN_DECK, eventById } from './events';
import {
  AP_BASE,
  PRESS_ON_MAX,
  LIGHT_START,
  EMBER_START,
  GATHER_AMOUNT,
  STEADY_LIGHT,
  REVIVE_LIGHT_COST,
  REVIVE_TARGET_LIGHT,
  CORRUPT_EDGE_COST,
  EMBERS_PER_BEACON,
  BASE_STRIKES,
  DREAD_TIDE_RISE,
  SEAT_NAMES,
  dreadMaxFor,
} from './constants';
import {
  log,
  flash,
  applyEffect,
  gainLight,
  gainEmbers,
  isCorrupted,
  cleanseEdgeNear,
  addBeaconEmber,
  gloamingStrike,
  strikeCount,
  recomputeBeaconsLit,
  checkGameover,
} from './effects';

/** Minimal shapes for the boardgame.io plugin APIs we use (kept local & honest). */
interface RandomAPI {
  D6: () => number;
  Die: (spotvalue: number) => number;
  Number: () => number;
  Shuffle: <T>(deck: T[]) => T[];
}

const toneFor = (t: EventType): LogTone =>
  t === 'gift' ? 'hope' : t === 'trap' || t === 'stalker' ? 'dread' : 'neutral';

function drawOmen(G: GState, random: RandomAPI): number | null {
  if (G.deck.length === 0) {
    if (G.discard.length === 0) return null;
    G.deck = random.Shuffle(G.discard);
    G.discard = [];
  }
  return G.deck.pop() ?? null;
}

const actionBudget = (G: GState) => AP_BASE + G.pressOns;

export interface GloamingConfig {
  names: string[]; // 2–6 names; length = numPlayers
}

export function makeGloaming(config: GloamingConfig): Game<GState> {
  const names = config.names;

  return {
    name: 'gloaming',

    setup: ({ random }): GState => {
      const nodes = BOARD.slice()
        .map((n) => ({ ...n, neighbors: [...n.neighbors] }))
        .sort((a, b) => a.id - b.id); // index === id

      const players: Record<string, Player> = {};
      names.forEach((nm, seat) => {
        players[String(seat)] = {
          id: String(seat),
          name: nm || SEAT_NAMES[seat] || `Bearer ${seat + 1}`,
          seat,
          nodeId: HEARTH_ID,
          light: LIGHT_START,
          embers: EMBER_START,
          items: [],
          alive: true,
          dimmed: false,
          graced: false,
          warded: false,
          doubleDrain: false,
          role: 'bearer',
        };
      });

      const ids = OMEN_DECK.map((c) => c.id);
      const deck = random && random.Shuffle ? random.Shuffle(ids) : ids.slice().reverse();

      return {
        players,
        nodes,
        corruptedEdges: [],
        beacons: BEACON_NODE_IDS.map((nodeId) => ({ nodeId, embers: 0, lit: false })),
        beaconsLit: 0,
        thresholdId: THRESHOLD_ID,
        dread: 0,
        dreadMax: dreadMaxFor(names.length),
        deck,
        discard: [],
        pendingEvent: null,
        stride: 0,
        hasRolled: false,
        actionsTaken: 0,
        pressOns: 0,
        boardActed: false,
        lastRoll: null,
        log: [
          {
            id: 0,
            turn: 0,
            tone: 'neutral' as LogTone,
            text: 'The Gloaming deepens. Light the three Beacons and cross the Threshold — before night falls.',
          },
        ],
        logSeq: 1,
        flash: null,
        flashSeq: 1,
        secret: {},
      };
    },

    turn: {
      // The Gloaming plays back at the end of every turn (idempotent).
      onBegin: ({ G, ctx, random }) => {
        G.stride = 0;
        G.hasRolled = false;
        G.actionsTaken = 0;
        G.pressOns = 0;
        G.boardActed = false;
        G.lastRoll = null;
        G.pendingEvent = null;
        G.flash = null;

        const p = G.players[ctx.currentPlayer];
        if (!p || !p.alive) {
          if (p) log(G, `${p.name}'s seat lies empty. The dark presses on.`, 'dread');
          return;
        }
        if (p.dimmed) {
          log(G, `${p.name} lies dimmed — they can only wait to be lifted.`, 'dread');
          return;
        }

        const cardId = drawOmen(G, random as RandomAPI);
        if (cardId === null) return;
        const card = eventById(cardId);
        if (card.auto) {
          for (const e of card.choices[0].effects) applyEffect(G, p, e, random as RandomAPI);
          log(G, `${card.title} — ${card.choices[0].outcome}`, toneFor(card.type));
          G.discard.push(cardId);
        } else {
          G.pendingEvent = { cardId };
          log(G, `An omen rises: ${card.title}.`, toneFor(card.type));
        }
      },

      onEnd: ({ G, random }) => {
        if (G.boardActed) return; // idempotency guard (RESEARCH §2)
        G.boardActed = true;

        addDreadTide(G);
        const strikes = strikeCount(G, BASE_STRIKES);
        for (let i = 0; i < strikes; i++) gloamingStrike(G, random as RandomAPI);
        recomputeBeaconsLit(G);
        flash(G, 'dread-strike');
      },
    },

    moves: {
      // — resolve the active omen (gates all other moves while pending) —
      resolveOmen: {
        move: ({ G, ctx, random }, optionIndex: number) => {
          if (!G.pendingEvent) return INVALID_MOVE;
          const p = G.players[ctx.currentPlayer];
          if (!p || !p.alive || p.dimmed) return INVALID_MOVE;
          const card = eventById(G.pendingEvent.cardId);
          const choice = card.choices[optionIndex];
          if (!choice) return INVALID_MOVE;
          for (const e of choice.effects) applyEffect(G, p, e, random as RandomAPI);
          log(G, `${card.title} — ${choice.outcome}`, toneFor(card.type));
          G.discard.push(G.pendingEvent.cardId);
          G.pendingEvent = null;
        },
        undoable: false,
      },

      // — roll the movement die (once per turn) —
      rollStride: ({ G, ctx, random }) => {
        if (G.pendingEvent) return INVALID_MOVE;
        const p = G.players[ctx.currentPlayer];
        if (!p.alive || p.dimmed) return INVALID_MOVE;
        if (G.hasRolled) return INVALID_MOVE;
        const r = random.D6();
        G.stride = r;
        G.lastRoll = r;
        G.hasRolled = true;
        flash(G, 'dice');
      },

      // — move one node along an edge, spending stride —
      moveTo: ({ G, ctx }, nodeId: number) => {
        if (G.pendingEvent) return INVALID_MOVE;
        const p = G.players[ctx.currentPlayer];
        if (!p.alive || p.dimmed) return INVALID_MOVE;
        if (!G.hasRolled) return INVALID_MOVE;
        const cur = G.nodes[p.nodeId];
        if (!cur.neighbors.includes(nodeId)) return INVALID_MOVE;
        const cost = isCorrupted(G, p.nodeId, nodeId) ? CORRUPT_EDGE_COST : 1;
        if (G.stride < cost) return INVALID_MOVE;
        G.stride -= cost;
        p.nodeId = nodeId;
      },

      // — wellspring: gain embers OR light (a real tradeoff) —
      gather: {
        move: ({ G, ctx }, pick: 'embers' | 'light') => {
          const p = G.players[ctx.currentPlayer];
          if (!p.alive || p.dimmed) return INVALID_MOVE;
          if (G.nodes[p.nodeId].type !== 'wellspring') return INVALID_MOVE;
          if (G.actionsTaken >= actionBudget(G)) return INVALID_MOVE;
          if (pick === 'light') gainLight(p, GATHER_AMOUNT);
          else gainEmbers(p, GATHER_AMOUNT);
          G.actionsTaken++;
          log(G, `${p.name} draws ${pick === 'light' ? 'warmth' : 'embers'} from the well.`, 'hope');
        },
        undoable: false,
      },

      // — beacon: deposit embers; lights at the threshold —
      kindle: {
        move: ({ G, ctx }, amount: number) => {
          const p = G.players[ctx.currentPlayer];
          if (!p.alive || p.dimmed) return INVALID_MOVE;
          const node = G.nodes[p.nodeId];
          if (node.type !== 'beacon') return INVALID_MOVE;
          const beacon = G.beacons.find((b) => b.nodeId === p.nodeId);
          if (!beacon || beacon.lit) return INVALID_MOVE;
          if (G.actionsTaken >= actionBudget(G)) return INVALID_MOVE;
          const need = EMBERS_PER_BEACON - beacon.embers;
          const give = Math.min(amount, p.embers, need);
          if (give <= 0) return INVALID_MOVE;
          p.embers -= give;
          G.actionsTaken++;
          flash(G, 'kindle', p.nodeId);
          log(G, `${p.name} feeds ${give} ember${give > 1 ? 's' : ''} to the Beacon.`, 'fellow');
          addBeaconEmber(G, p.nodeId, give);
        },
        undoable: false,
      },

      // — shrine: gamble for a boon (draw an extra omen now) —
      commune: {
        move: ({ G, ctx, random }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p.alive || p.dimmed) return INVALID_MOVE;
          if (G.nodes[p.nodeId].type !== 'shrine') return INVALID_MOVE;
          if (G.actionsTaken >= actionBudget(G)) return INVALID_MOVE;
          if (G.pendingEvent) return INVALID_MOVE;
          const cardId = drawOmen(G, random as RandomAPI);
          G.actionsTaken++;
          if (cardId === null) {
            log(G, `${p.name} kneels at the shrine, but the dark has nothing left to say.`, 'neutral');
            return;
          }
          const card = eventById(cardId);
          log(G, `${p.name} communes at the shrine…`, 'neutral');
          if (card.auto) {
            for (const e of card.choices[0].effects) applyEffect(G, p, e, random as RandomAPI);
            log(G, `${card.title} — ${card.choices[0].outcome}`, toneFor(card.type));
            G.discard.push(cardId);
          } else {
            G.pendingEvent = { cardId };
          }
        },
        undoable: false,
      },

      // — rest: recover light, spend tempo —
      steady: {
        move: ({ G, ctx }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p.alive || p.dimmed) return INVALID_MOVE;
          if (G.actionsTaken >= actionBudget(G)) return INVALID_MOVE;
          gainLight(p, STEADY_LIGHT);
          G.actionsTaken++;
          log(G, `${p.name} steadies the flame and breathes.`, 'hope');
        },
        undoable: false,
      },

      // — help an ally on the same node: give / revive —
      aid: {
        move: ({ G, ctx }, targetId: string, kind: 'embers' | 'light' | 'revive', amount: number) => {
          const p = G.players[ctx.currentPlayer];
          const t = G.players[targetId];
          if (!p.alive || p.dimmed) return INVALID_MOVE;
          if (!t || t.id === p.id || !t.alive) return INVALID_MOVE;
          if (t.nodeId !== p.nodeId) return INVALID_MOVE;

          if (kind === 'revive') {
            if (!t.dimmed) return INVALID_MOVE;
            if (G.actionsTaken >= actionBudget(G)) return INVALID_MOVE;
            if (p.light <= REVIVE_LIGHT_COST) return INVALID_MOVE;
            p.light -= REVIVE_LIGHT_COST;
            t.dimmed = false;
            t.graced = false;
            t.light = REVIVE_TARGET_LIGHT;
            G.actionsTaken++;
            log(G, `${p.name} lifts ${t.name} back into the light.`, 'fellow');
            return;
          }
          if (kind === 'embers') {
            const give = Math.min(amount, p.embers);
            if (give <= 0) return INVALID_MOVE;
            p.embers -= give;
            gainEmbers(t, give);
            log(G, `${p.name} shares ${give} ember${give > 1 ? 's' : ''} with ${t.name}.`, 'fellow');
            return;
          }
          // light
          const give = Math.min(amount, p.light - 1);
          if (give <= 0) return INVALID_MOVE;
          p.light -= give;
          gainLight(t, give);
          log(G, `${p.name} shares warmth with ${t.name}.`, 'fellow');
        },
        undoable: false,
      },

      // — one-shot tools (free) —
      useItem: {
        move: ({ G, ctx }, itemId: ItemId) => {
          const p = G.players[ctx.currentPlayer];
          if (!p.alive || p.dimmed) return INVALID_MOVE;
          const idx = p.items.indexOf(itemId);
          if (idx === -1) return INVALID_MOVE;
          if (itemId === 'ward') {
            p.warded = true;
            log(G, `${p.name} braces behind a warding charm.`, 'fellow');
          } else if (itemId === 'oil') {
            gainEmbers(p, 2);
            log(G, `${p.name} pours out lantern-oil — embers flare.`, 'hope');
          } else if (itemId === 'mapfrag') {
            if (!cleanseEdgeNear(G, p.nodeId)) return INVALID_MOVE;
            log(G, `${p.name} reads the map fragment; a corrupted path mends.`, 'hope');
          }
          p.items.splice(idx, 1);
          flash(G, 'item');
        },
        undoable: false,
      },

      // — push your luck: another action this turn, at the cost of a Gloaming strike —
      pressOn: ({ G, ctx }) => {
        const p = G.players[ctx.currentPlayer];
        if (!p.alive || p.dimmed) return INVALID_MOVE;
        if (G.pendingEvent) return INVALID_MOVE;
        if (G.pressOns >= PRESS_ON_MAX) return INVALID_MOVE;
        G.pressOns++;
        log(G, `${p.name} presses deeper into the dark — the Gloaming will answer.`, 'dread');
      },

      // — end the turn (the board then plays back) —
      endTurn: ({ G, events }) => {
        if (G.pendingEvent) return INVALID_MOVE;
        events.endTurn();
      },
    },

    endIf: ({ G }) => checkGameover(G),

    // S2 will add: playerView to strip `secret` + others' role, and client:false role moves.
  };
}

// keep dread-tide rise local so onEnd reads cleanly
function addDreadTide(G: GState): void {
  G.dread = Math.min(G.dread + DREAD_TIDE_RISE, G.dreadMax);
}
