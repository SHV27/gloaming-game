/**
 * GLOAMING — game-state types.
 * Shaped now so Session 2 can drop in a hidden-traitor role via boardgame.io
 * `playerView` (strip `secret` + other players' `role`) with no refactor.
 */

export type NodeType =
  | 'hearth'
  | 'hollow'
  | 'wellspring'
  | 'shrine'
  | 'beacon'
  | 'threshold';

export interface BoardNode {
  id: number;
  x: number;
  y: number;
  type: NodeType;
  neighbors: number[];
  label?: string;
}

export type ItemId = 'ward' | 'oil' | 'mapfrag';

export interface ItemDef {
  id: ItemId;
  name: string;
  blurb: string;
}

/** Reserved for S2; present but unassigned this session. */
export type Role = 'bearer' | 'marked';

export interface Player {
  id: string;
  name: string;
  seat: number; // index → SEAT_COLORS
  nodeId: number;
  light: number;
  embers: number;
  items: ItemId[];
  alive: boolean;
  dimmed: boolean; // light hit 0 — downed but revivable
  graced: boolean; // freshly dimmed — survives one more strike (grace so allies can reach)
  warded: boolean; // next light-drain negated (brace via useItem 'ward')
  doubleDrain: boolean; // next light-drain doubled (telegraphed by a Stalker)
  role?: Role; // S2
}

export interface Beacon {
  nodeId: number;
  embers: number;
  lit: boolean;
}

// ── Event deck ────────────────────────────────────────────────────────────
export type EffectKind =
  | 'light'
  | 'embers'
  | 'dread'
  | 'corruptEdge'
  | 'cleanseEdge'
  | 'grantItem'
  | 'beaconEmber'
  | 'ward'
  | 'pullToDark'
  | 'doubleNextDrain';

export interface Effect {
  kind: EffectKind;
  amount?: number;
  item?: ItemId;
  note?: string; // short outcome fragment for the log
}

export type EventType = 'gift' | 'trap' | 'riddle' | 'bargain' | 'stalker';

export interface Choice {
  label: string;
  outcome: string; // narrator resolution text
  effects: Effect[];
}

export interface EventCard {
  id: number;
  type: EventType;
  title: string;
  narrator: string; // the omen text
  choices: Choice[]; // 1–3; a single "Continue" choice == auto-narration
  auto?: boolean; // resolve immediately at draw (no panel) — used for pure tide flavor
}

// ── Log ─────────────────────────────────────────────────────────────────
export type LogTone = 'neutral' | 'hope' | 'dread' | 'fellow';
export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  tone: LogTone;
}

// ── UI cue channel (drives shake / bloom / sound off pure state) ──────────
export type FlashKind =
  | 'dread-strike'
  | 'beacon-lit'
  | 'dice'
  | 'dimmed'
  | 'item'
  | 'kindle'
  | 'stalker';
export interface Flash {
  kind: FlashKind;
  nonce: number;
  nodeId?: number;
}

export type Winner = 'lanternbearers' | 'gloaming' | 'marked';
export interface GameoverState {
  winner: Winner;
  reason: 'crossed' | 'nightfell' | 'all-lost' | 'marked-triumph' | 'marked-foiled';
  markedId?: string | null; // revealed at game end
}

// ── The whole game state ──────────────────────────────────────────────────
export interface GState {
  players: Record<string, Player>;
  nodes: BoardNode[];
  corruptedEdges: Array<[number, number]>;
  beacons: Beacon[];
  beaconsLit: number;
  thresholdId: number;

  dread: number;
  dreadMax: number;

  deck: number[]; // indices into OMEN_DECK
  discard: number[];
  pendingEvent: { cardId: number } | null;

  // per-turn scratch (reset in turn.onBegin)
  stride: number;
  hasRolled: boolean;
  actionsTaken: number;
  pressOns: number;
  boardActed: boolean;
  lastRoll: number | null;

  log: LogEntry[];
  logSeq: number;
  flash: Flash | null;
  flashSeq: number;

  // The Stalker — a hunting entity the Gloaming spawns at higher Dread
  stalker: { active: boolean; nodeId: number } | null;

  // per-turn marker for the Marked's covert action
  sowedThisTurn: boolean;

  // The Marked / accusation (all public — not secret)
  hasMarked: boolean; // a Marked exists this game (the table knows the mode)
  castOutUsed: boolean; // the once-per-game accusation has been spent
  markedExposed: boolean; // a correct Cast Out has silenced the Marked's Sow

  // Secret State — hidden from every client via playerView (only your own
  // `role` survives the strip). `markedId` is nulled out for everyone.
  secret: { markedId: string | null };
}
