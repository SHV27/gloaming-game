import type { EventCard } from './types';

/**
 * GLOAMING v3 — Events are **illustrated cards**, never paragraphs (PLAN §B.5).
 * Each is an icon key (drawn as SVG in the UI — never a Unicode emoji) + ≤4 words
 * (all caps) + one *visible board effect*. One flips each round; the player watches
 * the board change. This is the whole narrator — no LLM, no prose.
 *
 * `icon` keys the UI resolves to a drawn glyph:
 *   frost · eye · crack · lantern · dawn · wind · calm
 */
export const EVENT_DECK: EventCard[] = [
  { id: 0, icon: 'frost', words: 'COLD SNAP', effect: { kind: 'torchAll', amount: -1 }, tone: 'dread' },
  { id: 1, icon: 'eye', words: 'THE SWARM', effect: { kind: 'nightmareStep', amount: 1 }, tone: 'dread' },
  { id: 2, icon: 'crack', words: 'THE BRIDGE FALLS', effect: { kind: 'darkBite', amount: 2 }, tone: 'dread' },
  { id: 3, icon: 'lantern', words: 'A GIFT', effect: { kind: 'lanternFlare', amount: 3 }, tone: 'hope' },
  { id: 4, icon: 'dawn', words: 'FALSE DAWN', effect: { kind: 'falseDawn', amount: 1 }, tone: 'hope' },
  { id: 5, icon: 'wind', words: 'A WARM CURRENT', effect: { kind: 'torchAll', amount: 1 }, tone: 'hope' },
  { id: 6, icon: 'eye', words: 'IT QUICKENS', effect: { kind: 'nightmareStep', amount: 1 }, tone: 'dread' },
  { id: 7, icon: 'crack', words: 'THE EDGE CRUMBLES', effect: { kind: 'darkBite', amount: 2 }, tone: 'dread' },
  { id: 8, icon: 'calm', words: 'A HELD BREATH', effect: { kind: 'calm' }, tone: 'calm' },
  { id: 9, icon: 'frost', words: 'GUTTERING', effect: { kind: 'torchAll', amount: -1 }, tone: 'dread' },
  { id: 10, icon: 'wind', words: 'EMBERWIND', effect: { kind: 'torchAll', amount: 1 }, tone: 'hope' },
  { id: 11, icon: 'crack', words: 'DEEPENING DARK', effect: { kind: 'darkBite', amount: 1 }, tone: 'dread' },
  { id: 12, icon: 'eye', words: 'THE HUNT', effect: { kind: 'nightmareStep', amount: 1 }, tone: 'dread' },
  { id: 13, icon: 'lantern', words: 'A LANTERN FLARES', effect: { kind: 'lanternFlare', amount: 3 }, tone: 'hope' },
  { id: 14, icon: 'dawn', words: "DAWN'S GHOST", effect: { kind: 'falseDawn', amount: 1 }, tone: 'hope' },
  { id: 15, icon: 'calm', words: 'STILL AIR', effect: { kind: 'calm' }, tone: 'calm' },
];

export function eventById(id: number): EventCard {
  return EVENT_DECK[id] ?? EVENT_DECK[EVENT_DECK.length - 1];
}

/** A tiny, plain-language read of what a card DID — the single source shared by the
 *  illustrated card, the omen, and the cause→effect beat (S6). */
export function eventEffectText(card: EventCard): string {
  const a = card.effect.amount ?? 0;
  switch (card.effect.kind) {
    case 'torchAll':
      return a >= 0 ? `every torch +${a}` : `every torch −${-a}`;
    case 'nightmareStep':
      return `the Hollow One lurches +${a} step${a === 1 ? '' : 's'}`;
    case 'darkBite':
      return `the dark eats +${a} more tile${a === 1 ? '' : 's'}`;
    case 'lanternFlare':
      return 'torches near a Lantern flare up';
    case 'falseDawn':
      return 'a lost tile flickers back';
    default:
      return 'a held breath — nothing stirs';
  }
}
