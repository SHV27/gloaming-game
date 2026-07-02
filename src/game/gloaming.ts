import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { GState, Player } from './types';
import { BOARD, GATE_ID, OUTER_RING_IDS, spreadOuter } from './board';
import { EVENT_DECK, eventById, eventEffectText } from './events';
import { defaultHeroes, type HeroId } from './heroes';
import {
  TORCH_START,
  TORCH_BURN_PER_ROUND,
  LANTERN_COUNT,
  darkBiteFor,
  darkSlowdownFor,
  nightmareStepsFor,
  SEAT_NAMES,
  MIN_MARKED_PLAYERS,
} from './constants';
import {
  log,
  flash,
  beat,
  burnTorch,
  refuel,
  grabLantern,
  deliverAtGate,
  relight,
  getTileAction,
  eatFrontier,
  nightmareStep,
  applyEventEffect,
  refreshAct,
  retelegraphDark,
  frontierTiles,
  isVoid,
  strideFor,
  stepTorchCost,
  checkGameover,
} from './effects';

interface RandomAPI {
  D6: () => number;
  Die: (spotvalue: number) => number;
  Number: () => number;
  Shuffle: <T>(deck: T[]) => T[];
}

function drawEvent(G: GState, random: RandomAPI): number | null {
  if (G.deck.length === 0) {
    if (G.discard.length === 0) return null;
    G.deck = random.Shuffle(G.discard);
    G.discard = [];
  }
  return G.deck.pop() ?? null;
}

/** One step of a Wisp's drift toward the Gate, over surviving tiles. */
function driftToGate(G: GState, p: Player): void {
  if (p.nodeId === GATE_ID) return;
  const seen = new Set([p.nodeId]);
  const prev = new Map<number, number>();
  const q = [p.nodeId];
  while (q.length) {
    const cur = q.shift()!;
    for (const m of G.nodes[cur].neighbors) {
      if (seen.has(m) || isVoid(G, m)) continue;
      seen.add(m);
      prev.set(m, cur);
      if (m === GATE_ID) {
        let x = m;
        while (prev.get(x) !== p.nodeId) x = prev.get(x)!;
        p.nodeId = x;
        return;
      }
      q.push(m);
    }
  }
}

export interface GloamingConfig {
  names: string[]; // 2–6 names; length = numPlayers
  heroes?: HeroId[]; // S6 — one per seat (falls back to a valid default roster)
  marked?: boolean; // dormant this session (4+)
}

export function makeGloaming(config: GloamingConfig): Game<GState> {
  const names = config.names;
  const heroes =
    config.heroes && config.heroes.length === names.length ? config.heroes : defaultHeroes(names.length);

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
          nodeId: GATE_ID, // the party begins at home, in the light
          torch: TORCH_START,
          wisp: false,
          carrying: [],
          hero: heroes[seat],
          role: String(seat) === markedId ? 'marked' : 'bearer',
        };
      });

      const lanternNodes = spreadOuter(LANTERN_COUNT);
      const lanterns = lanternNodes.map((nodeId, id) => ({
        id,
        nodeId,
        carriedBy: null,
        delivered: false,
        droppedAtRound: null,
      }));

      // the Nightmare wakes on the outer ring, away from the Lanterns, and walks in
      const taken = new Set(lanternNodes);
      const nmPool = OUTER_RING_IDS.filter((id) => !taken.has(id));
      const nmStart = nmPool[Math.floor(random.Number() * nmPool.length) % nmPool.length] ?? OUTER_RING_IDS[0];

      const deck = random.Shuffle(EVENT_DECK.map((c) => c.id));

      const G: GState = {
        players,
        nodes,
        gateId: GATE_ID,
        lanterns,
        lanternsDelivered: 0,
        dark: [],
        fraying: [],
        nightmare: { nodeId: nmStart, nextNodeId: null, path: [] },
        act: 0,
        round: 1,
        darkCharge: 0,
        nmCharge: 0,
        deck,
        discard: [],
        lastEvent: null,
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
            turn: 1,
            tone: 'neutral',
            text: 'You are trapped inside. The dark eats the edges. Bring the three Lanterns to the Gate — and get everyone out.',
          },
        ],
        logSeq: 1,
        beats: [],
        beatSeq: 0,
        flash: null,
        flashSeq: 1,
        everWisped: false,
        stats: { catches: 0, rescues: 0, grabs: 0, darkEaten: 0, minTilesLeft: nodes.length },
        hasMarked: markedId !== null,
        secret: { markedId },
      };
      G.fraying = frontierTiles(G, 3); // telegraph the first bite
      return G;
    },

    // Secret State scaffolding (dormant): each client sees only its OWN role.
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
      onBegin: ({ G, ctx }) => {
        G.stride = 0;
        G.hasRolled = false;
        G.movedThisTurn = false;
        G.acted = false;
        G.boardActed = false;
        G.lastRoll = null;
        G.autoWisp = false;
        G.flash = null;

        const p = G.players[ctx.currentPlayer];
        if (!p) return;

        // the night burns a notch off the active torch (may gutter it to a Wisp).
        // THE STUBBORN FLAME burns half as slow — it skips the burn on even rounds.
        if (!p.wisp) {
          const skipBurn = p.hero === 'stubborn' && G.round % 2 === 0;
          if (!skipBurn) burnTorch(G, p, TORCH_BURN_PER_ROUND);
        }

        if (p.wisp) {
          // a Wisp's turn auto-resolves — it drifts to the Gate and passes. Never a dead end.
          G.autoWisp = true;
          G.hasRolled = true;
          G.acted = true;
          driftToGate(G, p);
          log(G, `${p.name} drifts on the cold current, seeking the Gate's light.`, 'dread');
        }
      },

      onEnd: ({ G, ctx, random }) => {
        if (G.boardActed) return; // idempotency guard
        G.boardActed = true;
        const n = Object.keys(G.players).length;

        // 1 · the dark eats the edge inward (normalised per round; delivered Lanterns
        //     hold it back near the Gate → the climactic gather is winnable)
        G.darkCharge += (darkBiteFor(G.act, n) * darkSlowdownFor(G.lanternsDelivered)) / n;
        const eat = Math.floor(G.darkCharge);
        if (eat > 0) {
          G.darkCharge -= eat;
          eatFrontier(G, eat);
        }

        // 2 · the Nightmare walks toward the nearest torch (normalised)
        G.nmCharge += nightmareStepsFor(G.act) / n;
        const steps = Math.floor(G.nmCharge);
        if (steps > 0) {
          G.nmCharge -= steps;
          for (let i = 0; i < steps; i++) nightmareStep(G);
        } else if (G.nightmare.nextNodeId === null) {
          // no telegraph yet (bootstrap / everyone home) — refresh it WITHOUT consuming charge
          nightmareStep(G);
        }

        refreshAct(G);
        retelegraphDark(G, n);

        // 3 · one Event card flips per round (at the round boundary)
        if (ctx.playOrderPos === n - 1) {
          const id = drawEvent(G, random as RandomAPI);
          if (id !== null) {
            G.lastEvent = id;
            const card = eventById(id);
            applyEventEffect(G, card, random as RandomAPI);
            flash(G, 'event');
            log(G, `The dark plays a card: ${card.words}.`, card.tone === 'hope' ? 'hope' : 'dread');
            beat(G, {
              icon: card.icon,
              cause: card.words,
              effect: eventEffectText(card),
              tone: card.tone === 'hope' ? 'hope' : card.tone === 'calm' ? 'neutral' : 'dread',
              kind: 'event',
            });
            G.discard.push(id);
            refreshAct(G);
            retelegraphDark(G, n);
          }
          G.round += 1;
        }
      },
    },

    moves: {
      // ① ROLL — opens the turn (carrying Lanterns shortens the stride) —
      rollStride: ({ G, ctx, random }) => {
        const p = G.players[ctx.currentPlayer];
        if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
        if (G.hasRolled || G.acted) return INVALID_MOVE;
        const r = random.D6();
        G.lastRoll = r;
        G.stride = strideFor(r, p.carrying.length, p.hero);
        G.hasRolled = true;
        flash(G, 'dice');
      },

      // ② MOVE — one tile along a surviving edge; frayed tiles bite your torch —
      moveTo: ({ G, ctx }, nodeId: number) => {
        const p = G.players[ctx.currentPlayer];
        if (!p || p.wisp || G.autoWisp) return INVALID_MOVE;
        if (!G.hasRolled || G.acted) return INVALID_MOVE;
        if (!G.nodes[p.nodeId].neighbors.includes(nodeId)) return INVALID_MOVE;
        if (isVoid(G, nodeId)) return INVALID_MOVE; // the dark is not a path
        if (G.stride < 1) return INVALID_MOVE;
        G.stride -= 1;
        p.nodeId = nodeId;
        G.movedThisTurn = true;
        burnTorch(G, p, stepTorchCost(G, nodeId, p)); // stepping the cold edge costs warmth (not the Unseen)
        flash(G, 'step', nodeId);
        if (p.wisp) {
          // guttered out mid-move → becomes a Wisp; turn will pass
          G.autoWisp = true;
          G.acted = true;
        }
      },

      // ③ ACT — Grab a Lantern here (then the board takes its turn) —
      grab: {
        move: ({ G, ctx, events }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp || !G.hasRolled || G.acted) return INVALID_MOVE;
          if (!grabLantern(G, p)) return INVALID_MOVE;
          G.acted = true;
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // ③ ACT — Deliver carried Lanterns at the Gate —
      deliver: {
        move: ({ G, ctx, events }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp || !G.hasRolled || G.acted) return INVALID_MOVE;
          if (!deliverAtGate(G, p)) return INVALID_MOVE;
          G.acted = true;
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // ③ ACT — Relight a fallen ally sharing your tile (fellowship) —
      relight: {
        move: ({ G, ctx, events }, targetId: string) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp || !G.hasRolled || G.acted) return INVALID_MOVE;
          if (!relight(G, p, targetId)) return INVALID_MOVE;
          G.acted = true;
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // ③ ACT — Warm your torch at the Gate (the always-there refuel) —
      warm: {
        move: ({ G, ctx, events }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp || !G.hasRolled || G.acted) return INVALID_MOVE;
          if (p.nodeId !== G.gateId) return INVALID_MOVE;
          refuel(p);
          log(G, `${p.name} warms their torch at the Gate — the flame stands tall again.`, 'hope');
          G.acted = true;
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // ③ ACT — Step Through the Gate (the win, when the party is whole) —
      stepThrough: {
        move: ({ G, ctx, events }) => {
          const p = G.players[ctx.currentPlayer];
          if (!p || p.wisp || G.autoWisp || !G.hasRolled || G.acted) return INVALID_MOVE;
          const a = getTileAction(G, p);
          if (a.kind !== 'stepThrough' || !a.enabled) return INVALID_MOVE;
          flash(G, 'escape', G.gateId);
          log(G, 'Hand in hand, the bearers step through the Gate — into the dawn. You made it. Together.', 'hope');
          beat(G, { icon: 'dawn', cause: 'DAWN', effect: 'you all step through — escaped!', tone: 'hope', kind: 'escape' });
          G.acted = true;
          if (!checkGameover(G)) events.endTurn();
        },
        undoable: false,
      },

      // pass the turn (Wisp auto-drift, or an explicit skip after rolling) —
      endTurn: ({ G, ctx, events }) => {
        const p = G.players[ctx.currentPlayer];
        if (!G.autoWisp) {
          if (!p || p.wisp) return INVALID_MOVE;
          if (!G.hasRolled) return INVALID_MOVE; // roll first — keeps the ①②③ order honest
        }
        G.acted = true;
        events.endTurn();
      },
    },

    endIf: ({ G }) => checkGameover(G),
  };
}
