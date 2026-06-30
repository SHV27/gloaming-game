import type { EventCard, ItemDef, ItemId } from './types';

/**
 * The Omen deck — hand-authored. Drawn at the start of each turn (and via
 * Commune). Choice-cards open the Narrator panel; `auto` cards resolve at draw.
 * Choices lean on *reducible* uncertainty: the narrator text tells you enough to
 * choose well (Costikyan, CLAUDE §6). ≥18 cards across all five types.
 */

export const ITEMS: Record<ItemId, ItemDef> = {
  ward: {
    id: 'ward',
    name: 'Warding Charm',
    blurb: 'Negates the next Light the Gloaming would drain from you.',
  },
  oil: {
    id: 'oil',
    name: 'Vial of Lantern-Oil',
    blurb: 'Pour out for +2 Embers, anywhere.',
  },
  mapfrag: {
    id: 'mapfrag',
    name: 'Map Fragment',
    blurb: 'Cleanse one corrupted path back to safe footing.',
  },
};

export const OMEN_DECK: EventCard[] = [
  // ───────────────────────── GIFTS ─────────────────────────
  {
    id: 0,
    type: 'gift',
    title: 'The Ember Cache',
    narrator:
      'Beneath a cairn of cold stones, a hoard of embers still breathes — faint, but willing. Taking them will make noise in the dark.',
    choices: [
      {
        label: 'Take all of it (+3 Embers, +1 Dread)',
        outcome: 'You scoop the living coals into your lantern. Something far off turns to listen.',
        effects: [
          { kind: 'embers', amount: 3, note: '+3 embers' },
          { kind: 'dread', amount: 1, note: 'the dark stirs' },
        ],
      },
      {
        label: 'Take only a handful (+1 Ember)',
        outcome: 'You take what you need and leave the rest glowing. The quiet holds.',
        effects: [{ kind: 'embers', amount: 1, note: '+1 ember' }],
      },
    ],
  },
  {
    id: 1,
    type: 'gift',
    title: 'A Kind Stranger',
    narrator:
      'A hooded figure presses something cold into your palm and is gone before you can ask a name.',
    choices: [
      {
        label: 'Keep the charm (gain Warding Charm)',
        outcome: 'A warding charm, old and warm to the touch. It hums against the cold.',
        effects: [{ kind: 'grantItem', item: 'ward', note: 'gained a Warding Charm' }],
      },
    ],
  },
  {
    id: 2,
    type: 'gift',
    title: 'Moonwell',
    narrator: 'A pool of pale water holds the reflection of a moon that no longer rises. You drink.',
    choices: [
      {
        label: 'Drink deep (+3 Light)',
        outcome: 'Warmth spreads through you. For a moment the dusk feels survivable.',
        effects: [{ kind: 'light', amount: 3, note: '+3 light' }],
      },
    ],
  },
  {
    id: 3,
    type: 'gift',
    title: "The Cartographer's Gift",
    narrator: 'A satchel left at a crossroads, its owner long gone. Inside: a torn scrap of vellum.',
    choices: [
      {
        label: 'Pocket the fragment (gain Map Fragment)',
        outcome: 'The lines redraw themselves as you watch. A way through the rot.',
        effects: [{ kind: 'grantItem', item: 'mapfrag', note: 'gained a Map Fragment' }],
      },
      {
        label: 'Burn it for warmth (+2 Light)',
        outcome: 'You feed the vellum to your lantern. The map is gone, but you are warmer.',
        effects: [{ kind: 'light', amount: 2, note: '+2 light' }],
      },
    ],
  },

  // ───────────────────────── TRAPS ─────────────────────────
  {
    id: 4,
    type: 'trap',
    title: 'Sinkhole of Ash',
    narrator:
      'The ground sighs and gives way. Ash pours into your boots, into your lungs, pulling the warmth out of you.',
    choices: [
      {
        label: 'Climb out fast (−2 Light, or 0 if Warded)',
        outcome: 'You haul yourself free, coughing grey. A charm may yet spare you the worst.',
        effects: [{ kind: 'light', amount: -2, note: 'the ash takes its toll' }],
      },
    ],
  },
  {
    id: 5,
    type: 'trap',
    title: 'The Grasping Dark',
    narrator:
      'Roots of shadow erupt across the path behind you and fuse into something that no longer remembers being a road.',
    choices: [
      {
        label: 'Press on (a path near you corrupts)',
        outcome: 'You stagger forward. Behind you, the way you came is no longer a way.',
        effects: [{ kind: 'corruptEdge', note: 'a path corrupts' }],
      },
    ],
  },
  {
    id: 6,
    type: 'trap',
    title: 'Cold Snap',
    narrator:
      'The air crystallises without warning. Frost climbs your lantern-glass and gnaws at the flame.',
    choices: [
      {
        label: 'Shield the flame (−1 Light)',
        outcome: 'You cup the light with both hands until the cold relents. It costs you.',
        effects: [{ kind: 'light', amount: -1, note: '−1 light' }],
      },
      {
        label: 'Feed it embers instead (−2 Embers)',
        outcome: 'You pour embers into the lantern to keep it burning. The flame survives.',
        effects: [{ kind: 'embers', amount: -2, note: '−2 embers' }],
      },
    ],
  },
  {
    id: 7,
    type: 'trap',
    title: 'Mirefoot',
    narrator: 'Black water, deeper than it looked. Every step is a negotiation with the dark.',
    choices: [
      {
        label: 'Wade through (−1 Light, +1 Dread)',
        outcome: 'You drag yourself to firmer ground. The mire remembers your weight.',
        effects: [
          { kind: 'light', amount: -1, note: '−1 light' },
          { kind: 'dread', amount: 1, note: 'the mire feeds' },
        ],
      },
    ],
  },

  // ───────────────────────── RIDDLES ─────────────────────────
  {
    id: 8,
    type: 'riddle',
    title: 'The Three Doors',
    narrator:
      'Three doors stand in a wall with no house. Above them, carved deep: PATIENCE feeds the body, WISDOM the lantern, GREED takes more than it gives.',
    choices: [
      {
        label: 'Patience (+3 Light)',
        outcome: 'The patient door opens onto rest. You breathe, and are restored.',
        effects: [{ kind: 'light', amount: 3, note: 'patience restores' }],
      },
      {
        label: 'Wisdom (+2 Embers)',
        outcome: 'The wise door gives exactly what the journey needs. No more.',
        effects: [{ kind: 'embers', amount: 2, note: 'wisdom provides' }],
      },
      {
        label: 'Greed (+4 Embers, +2 Dread)',
        outcome: 'The greedy door overflows — and something behind it wakes, hungry.',
        effects: [
          { kind: 'embers', amount: 4, note: '+4 embers' },
          { kind: 'dread', amount: 2, note: 'greed wakes the dark' },
        ],
      },
    ],
  },
  {
    id: 9,
    type: 'riddle',
    title: "The Tide's Question",
    narrator:
      '"I rise whether you act or sleep," whispers the dark. "Spend, and I slow. Hoard, and I quicken. What will you give?"',
    choices: [
      {
        label: 'Give Embers to the tide (−2 Embers, −2 Dread)',
        outcome: 'You cast embers into the black water. It recedes, sated — for now.',
        effects: [
          { kind: 'embers', amount: -2, note: '−2 embers' },
          { kind: 'dread', amount: -2, note: 'the tide recedes' },
        ],
      },
      {
        label: 'Refuse it (+1 Dread)',
        outcome: 'You keep what is yours. The tide only smiles — and rises.',
        effects: [{ kind: 'dread', amount: 1, note: 'the tide rises, unfed' }],
      },
    ],
  },
  {
    id: 10,
    type: 'riddle',
    title: 'Whisper of Names',
    narrator:
      'A voice recites the names of everyone you have lost. It offers to stop — for a price paid in warmth or in light remembered.',
    choices: [
      {
        label: 'Pay in warmth (−2 Light)',
        outcome: 'You give it your warmth and it falls silent, satisfied.',
        effects: [{ kind: 'light', amount: -2, note: '−2 light' }],
      },
      {
        label: 'Pay in embers (−3 Embers)',
        outcome: 'You give it embers to chew on. The names stop.',
        effects: [{ kind: 'embers', amount: -3, note: '−3 embers' }],
      },
      {
        label: 'Listen to the end (+1 Dread, +2 Light)',
        outcome: 'You let it finish. Grief, strangely, steadies the flame — but the dark grows.',
        effects: [
          { kind: 'light', amount: 2, note: 'grief steadies you' },
          { kind: 'dread', amount: 1, note: 'the dark leans close' },
        ],
      },
    ],
  },

  // ───────────────────────── BARGAINS ─────────────────────────
  {
    id: 11,
    type: 'bargain',
    title: 'The Pale Merchant',
    narrator:
      'A figure of grey cloth and grey teeth spreads its wares on the ash. "Light for time," it offers. "A fair trade, for those in a hurry to die slower."',
    choices: [
      {
        label: 'Trade Light for time (−2 Light, −3 Dread)',
        outcome: 'The merchant drinks your warmth and the night, briefly, holds its breath.',
        effects: [
          { kind: 'light', amount: -2, note: '−2 light' },
          { kind: 'dread', amount: -3, note: 'the night holds its breath' },
        ],
      },
      {
        label: 'Walk away (−1 Light)',
        outcome: 'You leave the merchant to its ash. It flicks a curse at your back as you go.',
        effects: [{ kind: 'light', amount: -1, note: 'a parting curse' }],
      },
    ],
  },
  {
    id: 12,
    type: 'bargain',
    title: 'Borrowed Flame',
    narrator:
      'A brazier offers you fire it has not finished burning. Take it now, and the cold will come collecting later.',
    choices: [
      {
        label: 'Borrow the flame (+3 Embers, −2 Light)',
        outcome: 'You take the borrowed fire. The debt settles into your bones.',
        effects: [
          { kind: 'embers', amount: 3, note: '+3 embers' },
          { kind: 'light', amount: -2, note: 'the cold collects' },
        ],
      },
      {
        label: 'Leave it burning (−1 Light)',
        outcome: 'You refuse the debt. The cold leans in close, offended by your caution.',
        effects: [{ kind: 'light', amount: -1, note: 'the cold leans in' }],
      },
    ],
  },
  {
    id: 13,
    type: 'bargain',
    title: 'The Oathstone',
    narrator:
      'A standing stone, mouth carved open mid-word. Swear an oath of embers upon it and it will carry your fire to a Beacon you cannot reach.',
    choices: [
      {
        label: 'Swear the oath (−2 Embers, +1 Ember to nearest Beacon)',
        outcome: 'Your embers vanish into the stone and rekindle, far away, where a Beacon waits.',
        effects: [
          { kind: 'embers', amount: -2, note: '−2 embers' },
          { kind: 'beaconEmber', amount: 1, note: 'a distant Beacon brightens' },
        ],
      },
      {
        label: 'Keep your fire (+1 Dread)',
        outcome: 'You keep your embers close. A refused oath offends the dark; it presses nearer.',
        effects: [{ kind: 'dread', amount: 1, note: 'a refused oath' }],
      },
    ],
  },

  // ───────────────────────── STALKERS ─────────────────────────
  {
    id: 14,
    type: 'stalker',
    title: 'A Shape in the Fog',
    narrator:
      'Something tall and patient stands at the edge of your light. It does not approach. It simply waits to be the last thing you see.',
    choices: [
      {
        label: 'Keep moving (+1 Dread, it marks you)',
        outcome: 'You do not run — running is what it wants. But its eyes fix on you now, and the dark thickens.',
        effects: [
          { kind: 'dread', amount: 1, note: 'the shape follows' },
          { kind: 'doubleNextDrain', note: 'it has marked you' },
        ],
      },
    ],
    auto: false,
  },
  {
    id: 15,
    type: 'stalker',
    title: 'It Knows Your Name',
    narrator:
      'The wind shapes a sound that is unmistakably your name, spoken with terrible tenderness.',
    choices: [
      {
        label: 'Refuse to answer (−1 Light, next drain doubles)',
        outcome: 'You bite down on the urge to reply — but it has your scent now, and a sliver of your warmth. The next cold will bite deeper.',
        effects: [
          { kind: 'light', amount: -1, note: 'it tastes your warmth' },
          { kind: 'doubleNextDrain', note: 'the next drain doubles' },
        ],
      },
    ],
  },
  {
    id: 16,
    type: 'stalker',
    title: 'The Long Pursuit',
    narrator: 'You have been walking for hours and the same footprints keep crossing your own.',
    choices: [
      {
        label: 'Break the trail',
        outcome: 'You double back and scatter your path — but the effort costs the whole party. The dark gains.',
        effects: [{ kind: 'dread', amount: 2, note: 'the pursuit closes' }],
      },
    ],
  },
  {
    id: 17,
    type: 'stalker',
    title: 'Hands Beneath the Ice',
    narrator: 'Pale hands press up against the underside of the frozen path, reaching for your heat.',
    choices: [
      {
        label: 'Step lightly (−1 Light)',
        outcome: 'You cross on the balls of your feet. One hand grazes your warmth before you are past.',
        effects: [{ kind: 'light', amount: -1, note: '−1 light' }],
      },
      {
        label: 'Pour embers on the ice (−2 Embers)',
        outcome: 'You scatter embers across the ice; the hands recoil from the heat.',
        effects: [{ kind: 'embers', amount: -2, note: '−2 embers' }],
      },
    ],
  },

  // ───────────────────────── AUTO / TIDE FLAVOR ─────────────────────────
  {
    id: 18,
    type: 'gift',
    title: 'A Moment of Stillness',
    narrator: 'For one breath, the dusk is almost beautiful. You let it fill you.',
    choices: [
      {
        label: 'Continue (+1 Light)',
        outcome: 'The quiet is a gift. You take it and walk on.',
        effects: [{ kind: 'light', amount: 1, note: '+1 light' }],
      },
    ],
    auto: true,
  },
  {
    id: 19,
    type: 'stalker',
    title: 'The Tide Mutters',
    narrator: 'Far off, the black water rises another hand-span. No one has to tell you.',
    choices: [
      {
        label: 'Continue (+1 Dread)',
        outcome: 'The world dims by a degree.',
        effects: [{ kind: 'dread', amount: 1, note: 'the tide rises' }],
      },
    ],
    auto: true,
  },
  {
    id: 20,
    type: 'trap',
    title: 'Frayed Footing',
    narrator: 'The path underfoot has begun to come apart at the seams.',
    choices: [
      {
        label: 'Continue (a path corrupts)',
        outcome: 'A road unravels somewhere in the web.',
        effects: [{ kind: 'corruptEdge', note: 'a path frays' }],
      },
    ],
    auto: true,
  },
  {
    id: 21,
    type: 'gift',
    title: 'Lantern-Oil in the Reeds',
    narrator: 'A stoppered vial, half-buried, still sloshing with old oil.',
    choices: [
      {
        label: 'Take the vial (gain Vial of Lantern-Oil)',
        outcome: 'You pocket the oil. It will keep a flame fed when you need it most.',
        effects: [{ kind: 'grantItem', item: 'oil', note: 'gained Lantern-Oil' }],
      },
    ],
  },
];

export function eventById(id: number): EventCard {
  return OMEN_DECK[id];
}
