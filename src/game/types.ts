/**
 * GLOAMING v2 — game-state types.
 * One resource (Ember), one decision (Brave/Steady), a telegraphing Gloaming.
 * Hidden-role (4+) still rides boardgame.io `playerView` (strip other seats'
 * `role` + null `secret.markedId`) — no refactor needed.
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

/** Reserved for the 4+ hidden traitor. */
export type Role = 'bearer' | 'marked';

export interface Player {
  id: string;
  name: string;
  seat: number; // index → SEAT_COLORS
  nodeId: number;
  ember: number; // THE resource — life + fuel + currency
  wisp: boolean; // ember hit 0 — drifts toward the Hearth, can't Brave, can be Rekindled
  role?: Role;
}

export interface Beacon {
  nodeId: number;
  progress: number; // 0..need — a tug-of-war (the Gloaming can SNUFF it down)
  lit: boolean;
}

// ── The three Acts of the deepening night ───────────────────────────────────
export type Act = 0 | 1 | 2; // Dusk · The Gloaming · Pitch

// ── The Gloaming's telegraphed intents (the living automa) ───────────────────
export type IntentKind = 'surge' | 'seal' | 'stalk' | 'snuff';
export interface GloamingIntent {
  kind: IntentKind;
  beaconNodeId?: number; // SNUFF target
  edge?: [number, number]; // SEAL target
  telegraph: string; // the warning shown to the party this turn
}

// ── The Omen deck (the place reacting) ──────────────────────────────────────
// An omen defines what BRAVING it does (the bold/risky outcome). STEADY is the
// universal safe option (+Ember), so omen cards carry only the brave branch.
export type EffectKind =
  | 'ember' // +/- to the actor
  | 'night' // +/- the Night track
  | 'beaconProgress' // + to the nearest unlit beacon
  | 'sealEdge'
  | 'cleanseEdge'
  | 'drift'; // shoved to a random neighbor (a setback)

export interface Effect {
  kind: EffectKind;
  amount?: number;
  note?: string; // short outcome fragment for the log
}

export type OmenTone = 'gift' | 'trap' | 'bargain' | 'riddle' | 'stalker';

export interface OmenBrave {
  label: string; // the Brave button text
  outcome: string; // narrator resolution
  effects: Effect[];
}

export interface OmenCard {
  id: number;
  tone: OmenTone;
  title: string;
  narration: string; // the omen text (the place reacting)
  brave: OmenBrave;
}

// ── The live reaction shown when a bearer settles on a tile (computed) ───────
export interface ReactionAction {
  label: string;
  enabled: boolean;
  reason?: string; // why disabled (shown to teach)
  preview?: string; // the consequence preview (cost/reward)
}
export interface Reaction {
  tile: NodeType;
  tone: OmenTone | 'calm';
  title: string;
  narration: string;
  brave: ReactionAction;
  steady: ReactionAction;
}

// ── Log ─────────────────────────────────────────────────────────────────────
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
  | 'kindle'
  | 'beacon-lit'
  | 'snuff'
  | 'stalker'
  | 'surge'
  | 'act-change'
  | 'wisp'
  | 'rekindle'
  | 'cross';
export interface Flash {
  kind: FlashKind;
  nonce: number;
  nodeId?: number;
}

export type Winner = 'lanternbearers' | 'gloaming' | 'marked';
export interface GameoverState {
  winner: Winner;
  reason: 'crossed' | 'nightfell' | 'marked-triumph' | 'marked-foiled';
  markedId?: string | null;
}

// ── The whole game state ─────────────────────────────────────────────────────
export interface GState {
  players: Record<string, Player>;
  nodes: BoardNode[];
  sealedEdges: Array<[number, number]>; // the Gloaming has blocked these paths
  beacons: Beacon[];
  beaconsLit: number;
  thresholdId: number;
  beaconNeed: number;

  night: number;
  nightMax: number;
  act: Act;

  deck: number[]; // indices into OMEN_DECK
  discard: number[];
  turnOmen: number | null; // the omen hanging over this turn (resolves iff you settle on a hollow/hearth)

  // The Gloaming automa
  intents: GloamingIntent[]; // telegraphed now, executed at the next board phase
  stalker: { active: boolean; nodeId: number } | null;
  snuffCd: number; // turns until the Gloaming may snuff a beacon again

  // per-turn scratch (reset in turn.onBegin)
  stride: number;
  hasRolled: boolean;
  movedThisTurn: boolean;
  acted: boolean; // a Brave/Steady/Rekindle has been taken — turn is resolving
  boardActed: boolean; // idempotency guard for the onEnd board phase
  lastRoll: number | null;
  autoWisp: boolean; // this turn is a Wisp's auto-drift — UI/sim just pass

  log: LogEntry[];
  logSeq: number;
  flash: Flash | null;
  flashSeq: number;

  // The Marked (hidden role, 4+) — public mode flags + Secret State
  hasMarked: boolean;
  castOutUsed: boolean;
  markedExposed: boolean;
  sowedThisTurn: boolean;
  secret: { markedId: string | null };
}
