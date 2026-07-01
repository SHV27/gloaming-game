import type { OmenCard } from './types';

/**
 * The Omen deck — hand-authored. One omen hangs over each turn; it *resolves*
 * only if a bearer settles on a hollow (the open road) or the Hearth. Each card
 * carries the BRAVE branch — the bold, swingy, often risky play. STEADY (the
 * universal safe option, +Ember) is the answer to all of them, so it isn't
 * stored here. Leaning on *reducible* uncertainty: the narration tells you
 * enough to choose well (Costikyan; CLAUDE §6).
 *
 * Effects use the v2 single-resource vocabulary: `ember` (to the actor),
 * `night` (the clock), `beaconProgress` (nearest unlit Beacon), `sealEdge`,
 * `cleanseEdge`, `drift`.
 */

export const OMEN_DECK: OmenCard[] = [
  // ───────────────────────── GIFTS ─────────────────────────
  {
    id: 0,
    tone: 'gift',
    title: 'The Ember Cache',
    narration:
      'Beneath a cairn of cold stones, a hoard of embers still breathes — faint, but willing. Taking them will make noise in the dark.',
    brave: {
      label: 'Take the cache (+4 Ember, +1 Night)',
      outcome: 'You scoop the living coals into your lantern. Something far off turns to listen.',
      effects: [
        { kind: 'ember', amount: 4, note: '+4 ember' },
        { kind: 'night', amount: 1, note: 'the dark stirs' },
      ],
    },
  },
  {
    id: 1,
    tone: 'gift',
    title: 'Moonwell',
    narration:
      'A pool of pale water holds the reflection of a moon that no longer rises. Drink, and be filled.',
    brave: {
      label: 'Drink deep (+5 Ember)',
      outcome: 'Warmth floods through you. For a moment the dusk feels survivable.',
      effects: [{ kind: 'ember', amount: 5, note: '+5 ember' }],
    },
  },
  {
    id: 2,
    tone: 'gift',
    title: "The Cartographer's Gift",
    narration:
      'A satchel left at a crossroads, its owner long gone. Inside, a torn map whose lines redraw themselves as you watch — a way through the thorns.',
    brave: {
      label: 'Read the map (clear a thorned road, +1 Ember)',
      outcome: 'The rot unknits along one road. You breathe easier.',
      effects: [
        { kind: 'cleanseEdge', note: 'a road clears' },
        { kind: 'ember', amount: 1, note: '+1 ember' },
      ],
    },
  },
  {
    id: 3,
    tone: 'gift',
    title: 'A Moment of Stillness',
    narration: 'For one breath, the dusk is almost beautiful. You let it fill you, and steady your flame.',
    brave: {
      label: 'Breathe it in (+3 Ember)',
      outcome: 'The quiet is a gift. You take it and walk on, warmer.',
      effects: [{ kind: 'ember', amount: 3, note: '+3 ember' }],
    },
  },

  // ───────────────────────── TRAPS ─────────────────────────
  {
    id: 4,
    tone: 'trap',
    title: 'Sinkhole of Ash',
    narration:
      'The ground sighs and gives way. Buried in the ash below — the glint of old embers, if you are willing to climb down for them.',
    brave: {
      label: 'Dig for the embers (+4 Ember, −2 paid as Night)',
      outcome: 'You haul up a fistful of cold fire, coughing grey. The dark drinks your noise.',
      effects: [
        { kind: 'ember', amount: 4, note: '+4 ember' },
        { kind: 'night', amount: 2, note: 'the ash feeds the night' },
      ],
    },
  },
  {
    id: 5,
    tone: 'trap',
    title: 'The Grasping Dark',
    narration:
      'Roots of shadow erupt across the path and snatch at something near a Beacon you can almost see. Wrench it loose and you might fling fire its way.',
    brave: {
      label: 'Wrench it free (+2 to a Beacon, a road seals)',
      outcome: 'You tear the warmth loose and hurl it toward the Beacon — but behind you, a road is gone.',
      effects: [
        { kind: 'beaconProgress', amount: 2, note: 'a distant Beacon brightens' },
        { kind: 'sealEdge', note: 'a road seals behind you' },
      ],
    },
  },
  {
    id: 6,
    tone: 'trap',
    title: 'Cold Snap',
    narration:
      'The air crystallises without warning. Frost climbs your lantern-glass. Push through fast and you can outrun the worst of it.',
    brave: {
      label: 'Run through the frost (−2 Ember, +2 to a Beacon)',
      outcome: 'You sprint the killing cold and skid out the far side, hurling your spare warmth at the nearest Beacon as you go.',
      effects: [
        { kind: 'ember', amount: -2, note: '−2 ember' },
        { kind: 'beaconProgress', amount: 2, note: 'warmth flung ahead' },
      ],
    },
  },

  // ───────────────────────── BARGAINS ─────────────────────────
  {
    id: 7,
    tone: 'bargain',
    title: 'The Pale Merchant',
    narration:
      'A figure of grey cloth and grey teeth spreads its wares on the ash. "Warmth for time," it offers. "A fair trade, for those in a hurry to die slower."',
    brave: {
      label: 'Trade warmth for time (−3 Ember, −4 Night)',
      outcome: 'The merchant drinks your warmth and the night, briefly, holds its breath.',
      effects: [
        { kind: 'ember', amount: -3, note: '−3 ember' },
        { kind: 'night', amount: -4, note: 'the night holds its breath' },
      ],
    },
  },
  {
    id: 8,
    tone: 'bargain',
    title: 'Borrowed Flame',
    narration:
      'A brazier offers you fire it has not finished burning. Take it now, and the cold will come collecting later.',
    brave: {
      label: 'Borrow the flame (+6 Ember, +2 Night)',
      outcome: 'You take the borrowed fire. The debt settles into the dark, to be paid in time.',
      effects: [
        { kind: 'ember', amount: 6, note: '+6 ember' },
        { kind: 'night', amount: 2, note: 'the cold will collect' },
      ],
    },
  },
  {
    id: 9,
    tone: 'bargain',
    title: 'The Oathstone',
    narration:
      'A standing stone, its mouth carved open mid-word. Swear an oath of embers upon it and it will carry your fire to a Beacon you cannot reach.',
    brave: {
      label: 'Swear the oath (−3 Ember, +3 to a Beacon)',
      outcome: 'Your embers vanish into the stone and rekindle, far away, where a Beacon waits.',
      effects: [
        { kind: 'ember', amount: -3, note: '−3 ember' },
        { kind: 'beaconProgress', amount: 3, note: 'a distant Beacon brightens' },
      ],
    },
  },

  // ───────────────────────── RIDDLES ─────────────────────────
  {
    id: 10,
    tone: 'riddle',
    title: 'The Three Doors',
    narration:
      'Three doors in a wall with no house. Carved deep above them: GREED takes more than it gives. The greedy door overflows — and wakes something behind it.',
    brave: {
      label: 'Open the greedy door (+6 Ember, +3 Night)',
      outcome: 'The door overflows with fire — and far below, something hungry opens an eye.',
      effects: [
        { kind: 'ember', amount: 6, note: '+6 ember' },
        { kind: 'night', amount: 3, note: 'greed wakes the dark' },
      ],
    },
  },
  {
    id: 11,
    tone: 'riddle',
    title: "The Tide's Question",
    narration:
      '"I rise whether you act or sleep," whispers the dark. "Cast warmth into me and I recede. Refuse, and I quicken. What will you give?"',
    brave: {
      label: 'Feed the tide (−2 Ember, −3 Night)',
      outcome: 'You cast embers into the black water. It recedes, sated — for now.',
      effects: [
        { kind: 'ember', amount: -2, note: '−2 ember' },
        { kind: 'night', amount: -3, note: 'the tide recedes' },
      ],
    },
  },
  {
    id: 12,
    tone: 'riddle',
    title: 'Whisper of Names',
    narration:
      'A voice recites the names of everyone you have lost, and offers to stop — if you will only listen to the end. Grief, strangely, steadies the flame.',
    brave: {
      label: 'Listen to the end (+4 Ember, +1 Night)',
      outcome: 'You let it finish. The names settle into warmth — but the dark leaned close to hear them too.',
      effects: [
        { kind: 'ember', amount: 4, note: 'grief steadies you' },
        { kind: 'night', amount: 1, note: 'the dark leaned close' },
      ],
    },
  },

  // ───────────────────────── STALKERS ─────────────────────────
  {
    id: 13,
    tone: 'stalker',
    title: 'A Shape in the Fog',
    narration:
      'Something tall and patient stands at the edge of your light. It does not approach. It waits to be the last thing you see. Hold your ground and it costs you nothing but nerve.',
    brave: {
      label: 'Stare it down (+2 Ember, +1 Night)',
      outcome: 'You do not run — running is what it wants. It withdraws, and the small victory warms you. But it knows your face now.',
      effects: [
        { kind: 'ember', amount: 2, note: 'nerve held' },
        { kind: 'night', amount: 1, note: 'it remembers you' },
      ],
    },
  },
  {
    id: 14,
    tone: 'stalker',
    title: 'It Knows Your Name',
    narration:
      'The wind shapes a sound that is unmistakably your name, spoken with terrible tenderness. Answer it, and you might learn where the dark is thinnest.',
    brave: {
      label: 'Answer once (−2 Ember, +2 to a Beacon)',
      outcome: 'You answer, and for a heartbeat the dark parts — long enough to fling warmth at a waiting Beacon. Then it closes, hungrier.',
      effects: [
        { kind: 'ember', amount: -2, note: 'it tastes your warmth' },
        { kind: 'beaconProgress', amount: 2, note: 'the dark parts, briefly' },
      ],
    },
  },
  {
    id: 15,
    tone: 'stalker',
    title: 'The Long Pursuit',
    narration:
      'You have walked for hours and the same footprints keep crossing your own. Double back hard and you can scatter the trail — but it costs the whole party effort.',
    brave: {
      label: 'Break the trail (clear a road, +1 Night)',
      outcome: 'You scatter your path and tear one thorned road open in the doubling-back. The pursuit loses you, for now.',
      effects: [
        { kind: 'cleanseEdge', note: 'a road opens' },
        { kind: 'night', amount: 1, note: 'the effort tells' },
      ],
    },
  },
];

export function eventById(id: number): OmenCard {
  return OMEN_DECK[id];
}
