/**
 * GLOAMING v4 — THE HEROES (Session 6, Pillar 3).
 *
 * Each Hero is ONE passive, always-on, rule-breaking ability, stated in one line,
 * always visible in play. No activation, no cooldown, no new turn step → zero
 * rules-budget cost (CLAUDE §0 rules-budget law), massive strategy. The abilities
 * are *complementary* — no single hero can solve the board alone, which is the fix
 * for the open-co-op "one player does everything" trap.
 *
 * Pure data (no JSX) so the engine, the headless sims, and the UI all share it.
 * The engine hooks live in `effects.ts`/`gloaming.ts`; the silhouette art lives in
 * `HeroSelect.tsx` keyed by `motif`.
 */

export type HeroId = 'swift' | 'lamplighter' | 'emberheart' | 'unseen' | 'stubborn';

export interface Hero {
  id: HeroId;
  name: string; // "THE SWIFT" — shown on the token/panel
  epithet: string; // a short poetic tag for the select card
  ability: string; // ONE line — the whole rule, always visible
  play: string; // the team-role hint (why you'd pick it)
  motif: string; // silhouette key drawn in HeroSelect
  accent: string; // token color var for the card
}

export const HEROES: Hero[] = [
  {
    id: 'swift',
    name: 'THE SWIFT',
    epithet: 'fleet of foot',
    ability: 'Your stride is always +1.',
    play: 'Cover ground, reach the far Lantern, run the rescue.',
    motif: 'swift',
    accent: 'var(--color-seat-2)', // glacier — cool speed
  },
  {
    id: 'lamplighter',
    name: 'THE LAMPLIGHTER',
    epithet: 'the burden-bearer',
    ability: 'Carrying Lanterns never slows you.',
    play: 'You take the Lanterns — full speed, always.',
    motif: 'lamplighter',
    accent: 'var(--color-ember)',
  },
  {
    id: 'emberheart',
    name: 'THE EMBER-HEARTED',
    epithet: 'the warm hand',
    ability: 'You can Relight a friend on the next tile over.',
    play: 'Pull fallen friends back without stacking up on the danger.',
    motif: 'emberheart',
    accent: 'var(--color-seat-5)', // coral — warmth
  },
  {
    id: 'unseen',
    name: 'THE UNSEEN',
    epithet: 'the overlooked',
    ability: 'The Hollow One overlooks you — until you carry a Lantern.',
    play: 'Empty-handed, walk the dark freely — scout, bait, and rescue.',
    motif: 'unseen',
    accent: 'var(--color-seat-3)', // orchid — the shadow
  },
  {
    id: 'stubborn',
    name: 'THE STUBBORN FLAME',
    epithet: 'slow to gutter',
    ability: 'Your torch burns half as slow (every other round).',
    play: 'Take the deep, slow route the others cannot survive.',
    motif: 'stubborn',
    accent: 'var(--color-seat-6)', // brass — endurance
  },
];

export const HERO_IDS: HeroId[] = HEROES.map((h) => h.id);

export function heroById(id: HeroId | undefined): Hero | undefined {
  return id ? HEROES.find((h) => h.id === id) : undefined;
}

/** A safe default roster (cycles the five) so the engine always has valid heroes
 *  even when a caller (an old sim, a bare client) doesn't pass a selection. */
export function defaultHeroes(numPlayers: number): HeroId[] {
  return Array.from({ length: numPlayers }, (_, i) => HERO_IDS[i % HERO_IDS.length]);
}
