/**
 * GLOAMING v3 — *Trapped Inside*. Every field is a THING YOU SEE (PLAN §B):
 * torches (flames), lanterns (carried objects), the dark (eaten tiles), the
 * Nightmare (a piece that walks). No abstract Ember, no Night meter, no omens.
 * Hidden-role (4+) scaffolding stays dormant on boardgame.io `playerView`.
 */

import type { HeroId } from './heroes';

export type NodeType = 'gate' | 'tile';

export interface BoardNode {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  neighbors: number[];
  label?: string;
}

/** Reserved for the 4+ hidden traitor (dormant this session). */
export type Role = 'bearer' | 'marked';

export interface Player {
  id: string;
  name: string;
  seat: number; // index → SEAT_COLORS
  nodeId: number;
  torch: number; // the flame, 0..TORCH_MAX — burns down each round
  wisp: boolean; // torch hit 0 — drifts to the Gate, cannot act, Relight-able
  carrying: number[]; // lantern ids held right now (weight → slower)
  hero?: HeroId; // S6 — one passive, always-on, visible ability (see heroes.ts)
  role?: Role;
}

// ── The three Acts, read straight off the shrinking board ────────────────────
export type Act = 0 | 1 | 2; // Dusk · The Gloaming · Pitch

// ── The Lanterns — physical objects you carry, drop, and deliver ─────────────
export interface Lantern {
  id: number;
  nodeId: number | null; // sitting on this tile, or null while carried
  carriedBy: string | null; // player id carrying it, or null
  delivered: boolean; // reached the Gate
}

// ── The Hollow One — an embodied hunter that walks toward the nearest torch ───
export interface Nightmare {
  nodeId: number;
  nextNodeId: number | null; // telegraphed next step (the glowing footprint) === path[0]
  path: number[]; // S6 — the full telegraphed route ahead (chess-legible menace)
}

// ── Events — illustrated cards (icon + ≤4 words + a visible board effect) ─────
export type EventEffectKind =
  | 'torchAll' // +/- every torch a notch
  | 'nightmareStep' // the Nightmare lurches extra step(s)
  | 'darkBite' // the dark eats extra tiles this round
  | 'lanternFlare' // torches near an on-board Lantern refuel
  | 'falseDawn' // one void tile flickers back
  | 'calm'; // a held breath — nothing
export interface EventEffect {
  kind: EventEffectKind;
  amount?: number;
}
export type EventTone = 'dread' | 'hope' | 'calm';
export interface EventCard {
  id: number;
  icon: string; // drawn-SVG glyph key (never a Unicode emoji) — resolved in UI
  words: string; // ≤4 words, all caps
  effect: EventEffect;
  tone: EventTone;
}

// ── The one ③ ACT button for the tile the current bearer stands on (computed) ─
export type TileActionKind =
  | 'grab'
  | 'deliver'
  | 'relight'
  | 'warm'
  | 'stepThrough'
  | 'endTurn';
export interface TileAction {
  kind: TileActionKind;
  label: string;
  enabled: boolean;
  reason?: string; // why disabled (shown to teach)
  preview?: string; // the consequence preview
  targetId?: string; // Relight target (a Wisp on this tile)
}

// ── Log ──────────────────────────────────────────────────────────────────────
export type LogTone = 'neutral' | 'hope' | 'dread' | 'fellow';
export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  tone: LogTone;
}

// ── UI cue channel (drives shake / bloom / sound off pure state) ─────────────
export type FlashKind =
  | 'dice'
  | 'step'
  | 'grab'
  | 'deliver'
  | 'dark-eat'
  | 'nightmare'
  | 'snuff'
  | 'wisp'
  | 'relight'
  | 'event'
  | 'act-change'
  | 'escape';
export interface Flash {
  kind: FlashKind;
  nonce: number;
  nodeId?: number;
}

export type Winner = 'bearers' | 'dark';
export interface GameoverState {
  winner: Winner;
  reason: 'escaped' | 'swallowed';
}

// ── The whole game state ─────────────────────────────────────────────────────
export interface GState {
  players: Record<string, Player>;
  nodes: BoardNode[];
  gateId: number;

  lanterns: Lantern[];
  lanternsDelivered: number;

  dark: number[]; // eaten node ids (the void)
  fraying: number[]; // telegraphed — the dark eats these next round

  nightmare: Nightmare;
  act: Act;
  round: number;
  /** Accumulators that normalise the world's per-round pace across player counts:
   *  each turn adds (per-round rate ÷ numPlayers); whole units resolve. */
  darkCharge: number;
  nmCharge: number;

  deck: number[]; // indices into EVENT_DECK
  discard: number[];
  lastEvent: number | null; // the card that flipped this round (for the animation)

  // per-turn scratch (reset in turn.onBegin)
  stride: number;
  hasRolled: boolean;
  movedThisTurn: boolean;
  acted: boolean; // a turn-ending action was taken — turn is resolving
  boardActed: boolean; // idempotency guard for the onEnd board phase
  lastRoll: number | null;
  autoWisp: boolean; // this turn is a Wisp's auto-drift — UI/sim just pass

  log: LogEntry[];
  logSeq: number;
  flash: Flash | null;
  flashSeq: number;

  // dormant hidden-role scaffolding (4+)
  hasMarked: boolean;
  secret: { markedId: string | null };
}
