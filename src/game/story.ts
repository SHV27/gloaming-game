/**
 * GLOAMING v4 — THE MATCH STORY (S6, Pillar 2). Pure logic (no JSX) so the recap
 * screen and the Referee share it: the tiered named ending, the timeline of key
 * beats, the few numbers that matter, and — on a loss — what killed the run.
 */
import type { GState, GameoverState, Beat, BeatKind } from './types';
import { LANTERN_COUNT } from './constants';

export type EndingTier = 'flawless' | 'breath' | 'soclose' | 'swallowed';
export interface Verdict {
  tier: EndingTier;
  win: boolean;
  eyebrow: string;
  title: string;
  line: string;
  lossReason?: string;
}

const ordinal = (n: number): string => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n - 1] ?? `${n}th`;

/** The named ending — the verdict a game earns. */
export function matchVerdict(G: GState, go: GameoverState): Verdict {
  if (go.winner === 'bearers') {
    if (!G.everWisped)
      return {
        tier: 'flawless',
        win: true,
        eyebrow: 'A perfect escape',
        title: 'FLAWLESS DAWN',
        line: 'Not one torch ever guttered out. Three Lanterns home, every soul intact — you step into a morning no one promised you, unbroken. Together.',
      };
    return {
      tier: 'breath',
      win: true,
      eyebrow: 'You made it — barely',
      title: 'BY A BREATH',
      line: 'A light went out. The dark closed in. And still you dragged each other through the Gate as the last stones fell away. You made it — by a breath.',
    };
  }
  const soClose = G.lanternsDelivered >= LANTERN_COUNT;
  return {
    tier: soClose ? 'soclose' : 'swallowed',
    win: false,
    eyebrow: soClose ? 'So near the dawn' : 'The dark takes the middle',
    title: soClose ? 'SO CLOSE' : 'SWALLOWED',
    line: soClose
      ? 'All three Lanterns burned at the Gate — but you could not gather there in time. The dark reached the middle with the way home in sight.'
      : 'The edges came in and in, and the last warm stone goes under. The board closes over you. There is no more light to reach.',
    lossReason: lossTeacher(G),
  };
}

/** What killed the run — the dominant, teachable failure. */
export function lossTeacher(G: GState): string {
  const lost = G.lanterns.filter((l) => !l.delivered && l.droppedAtRound != null);
  if (lost.length) {
    const l = lost.sort((a, b) => (a.droppedAtRound ?? 0) - (b.droppedAtRound ?? 0))[0];
    return `The ${ordinal(l.id + 1)} Lantern fell on round ${l.droppedAtRound} and was never carried back.`;
  }
  const wisps = Object.values(G.players).filter((p) => p.wisp).length;
  if (wisps > 0)
    return `Torches guttered — ${wisps} of you drifted as ${wisps > 1 ? 'Wisps' : 'a Wisp'} when the end came. Refuel sooner; a lost hand is a lost run.`;
  if (G.lanternsDelivered < LANTERN_COUNT)
    return `The dark outran the Lanterns — only ${G.lanternsDelivered} of ${LANTERN_COUNT} reached the Gate. Split up and fetch in parallel.`;
  return 'Everyone must be on the Gate, torches lit, before the dark reaches the middle — you gathered a beat too late.';
}

const SIGNIFICANT = new Set<BeatKind>(['deliver', 'catch', 'wisp', 'rescue', 'gate-open', 'act', 'escape', 'swallowed']);

/** The game's key beats as a timeline (first couple + the decisive tail). */
export function matchTimeline(G: GState): Beat[] {
  const sig = G.beats.filter((b) => SIGNIFICANT.has(b.kind));
  if (sig.length <= 8) return sig;
  return [...sig.slice(0, 2), ...sig.slice(-6)];
}

/** The few numbers that matter (no stat soup). */
export function matchNumbers(G: GState): Array<{ label: string; value: string }> {
  return [
    { label: 'Rounds survived', value: String(G.round) },
    { label: 'Lanterns home', value: `${G.lanternsDelivered}/${LANTERN_COUNT}` },
    { label: 'Tiles lost to the dark', value: `${G.dark.length}/${G.nodes.length}` },
    { label: 'Caught by the Hollow One', value: String(G.stats.catches) },
    { label: 'Rescues', value: String(G.stats.rescues) },
    { label: 'Closest call', value: `${G.stats.minTilesLeft} tiles left` },
  ];
}
