<div align="center">

# GLOAMING
### *Trapped Inside*

**You're trapped inside a board game, and the dark is eating it from the edges in.**
Grab the three Lanterns, carry them to the Gate, and get everyone out together —
before the dark reaches the middle. Don't let your torch go out. Don't get caught. Don't leave anyone behind.

**▶ Play it live: https://gloaming-murex.vercel.app**

*2–6 players · pass-and-play · one device · no install · ~20–30 minutes · an SHV Studios production*

</div>

---

## The reconception

The earlier version of this game was *technically* good — a single-resource engine, a telegraphing
"living board," a balanced ~50/50 fight — and it played like a **resource-management euro-puzzle wearing
a horror coat.** There was an *abstraction layer* between the player and the terror: meters, a currency
called Ember, "intents" written in text. A real player finished a game without ever learning the rules,
because nothing *grabbed* them in the first minute — there was nothing to *see*, only numbers to manage.

So we went to the root and rebuilt the body around one law:

> **The mechanic and the fantasy must be the same thing.** In Jumanji, you roll and a lion appears in
> the room and you run — the rule *is* the story, no layer between. Every rule in GLOAMING is now a
> **physical thing you watch happen on the board.** If a rule was a hidden number doing math, it was
> replaced with a thing that moves, grows, shrinks, or gets eaten.

## Every rule is a thing you see

| The old abstraction | The thing you now watch |
|---|---|
| A "Night" meter ticking toward a loss | **The dark eats the board.** Each round the outermost tiles turn to void; the ones fraying red go next. You watch the island of light shrink and herd everyone to the center. Lose when it reaches the middle. |
| An "Ember" currency draining | **A torch — a flame that burns down.** Refill it at a Lantern or the Gate. If it goes out you're a drifting **Wisp** until a friend relights you. |
| Beacon "progress" as a number you pour into | **Three Lanterns you physically carry.** Grab one (it fills your torch), carry it (you move one slower), deliver it to the Gate. Get caught and you drop it where you fall — someone has to fetch it. |
| A "Stalker" stat advancing toward a target | **A Nightmare that walks.** Each round it steps toward the nearest torch — you see its glowing footprint. It catches you, you drop everything and reel back. The Gate is the one place it can't follow. |
| Paragraphs of AI narration | **Illustrated event cards** — an icon and three words that change the board. No reading. No LLM. |

Win when all three Lanterns are home and every torch-bearer stands on the Gate — then you step through
together. One rule — "I'm slow, take a Lantern from me!", "lure it away so I can grab that one!",
"someone go back for the one Wren dropped!" — makes the whole bait-and-rescue social game emerge on its own.

## It teaches itself

No rulebook. The HUD walks you through the turn one glowing step at a time: **① Roll → ② step to a tile
that glows gold → ③ one obvious button** for whatever you can do here (Grab, Deliver, Relight, Step
Through). Illegal moves are greyed with the reason ("the dark"). Then you *watch* the board take its turn.
A first-time player understands a turn in the first minute — proven by a **Fresh-Eyes agent** that is shown
only the screen, with no rules, and must correctly state what it can do and why.

## The unfair advantage

A cardboard "automa" opponent has to stay brain-dead simple, because a human runs it by hand every turn.
**Ours runs on the machine** — so the dark can hunt with real cunning (the Nightmare paths to your most
exposed torch; the dark's pace normalizes across player counts; delivered Lanterns hold it back near the
Gate so the final gather is winnable) at **zero bookkeeping cost to the players.** That is the thing a
digital board can do that cardboard never will, and the whole design leans into it. Night falls in three
Acts — **Dusk → the Gloaming → Pitch** — read straight off how deep the dark has eaten, each Act faster
and hungrier, climaxing in a frantic dash for the Gate.

## The discovery that made it sing

The first playtest of the rebuilt engine won **5% of games**: players guttered to Wisps constantly, because
the torch had no way to refuel out at the dangerous edge. Making a **grabbed Lantern refill your torch** —
a light source you're now carrying — turned it into a real ~50% fight in one change. Then simulation
surfaced the *feel* problem: the Nightmare would camp the Gate and punish the one safe haven. The senior
call — **the Gate's light wards the Nightmare; home is sanctuary** — fixed the endgame and moved the
tension where it belongs: *out in the field*, racing the closing dark, not grinding down a torch meter.

## Proven, not asserted

Two automated gates run against the **real game engine** before any human sits down:

- **The Referee** (`npm run referee`) holds the hard invariant — *the current player always has a legal
  action or the turn auto-resolves; never a softlock, never a crash* — with an assertion for every edge
  case (torch→0→Wisp, a Lantern on an eaten tile swept inward, the dark reaching the Gate, win-checked-
  before-loss, both Lanterns dropping when caught, the Gate-is-sanctuary ward…) plus **150 chaos games at
  2–6 players that all terminate.**
- **The Playtester** (`npm run playtest`) plays hundreds of full games with a co-op bot and reports the fun
  metrics: **win-rate 2p 51% / 3p 52% / 4p 50%**, **dead-turn ≈ 0%**, **nail-biters 76–86%**,
  **0 softlocks / 300 games.** The game is proven winnable *and* losable, in a tense band, at every count.

## Architecture

| Concern | Choice |
|---|---|
| Game engine | **[boardgame.io](https://boardgame.io)** — authoritative state, moves, turn flow. The world reacts in `turn.onEnd` via per-round accumulators normalized by player count, so pace is identical at every table size. |
| App | **Vite + React + TypeScript**, board lazy-loaded behind the landing so it paints fast |
| Board | A **concentric-ring graph** — the geometry *is* the mechanic: the dark consumes the outermost surviving ring inward, and the Act is read from the deepest ring still alive |
| Style / motion / sound | **Tailwind v4** (one design-token file), **Framer Motion**, **Howler** — audio is 100% procedurally synthesised, zero asset files |
| Runtime AI | **None.** The game is fully self-contained — no LLM, no network, no secrets at runtime. Events are hand-authored illustrated cards. |
| Quality gates | `npm run referee` (turn-flow integrity) · `npm run playtest` (balance & fun) · a headless-Chrome console-error check · `tsc` · Vite build |
| Deploy | **Vercel** (static) · **GitHub** via `gh` |

## Run it

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run referee     # turn-flow integrity — proves the game can never softlock or crash
npm run playtest    # headless balance sim (win-rate, length, dead-turn, nail-biters)
```

No keys, no environment variables, no runtime services. It just runs.

## How it was built

Directed by **Shaurya Verma** and built with **Claude Code (Opus 4.8)** as the executing engineer/designer,
run as a literal studio: a **research → plan → execute → review → ship** loop with a multi-lens **Council**
critiquing every artifact — **🎲 Game Designer · 🎨 Art Director · 🛠 Principal Engineer · ⚖️ Referee
(automated) · 🎮 Playtester (automated) · 🔍 Fresh-Eyes Teacher** — findings synthesized, fixed, and
re-reviewed before anything shipped. Not an AI-slop generator: an AI *architect* directing AI to hit a
studio bar.

---

<details>
<summary><b>LinkedIn draft</b> (click to expand)</summary>

> I had a game that was *technically* good and it bored me. So I tore it down to the studs and rebuilt it — and that's the part worth talking about.
>
> **GLOAMING — Trapped Inside.** A browser board game, 2–6 players, pass-and-play, ~20–30 minutes, runs in any browser. You're trapped inside a board game and the dark is eating it from the edges in. Grab three Lanterns, carry them to the Gate, get everyone out before the dark reaches the middle.
>
> The first version had a single-resource engine, a "living board," a balanced ~50/50 fight — all the boxes ticked. And it played like a spreadsheet with a horror skin. A real playtester finished a whole game without ever learning the rules, because nothing *grabbed* them: there was nothing to see, only numbers to manage.
>
> So I made one law binding: **the mechanic and the fantasy have to be the same thing.** Jumanji — you roll, a lion appears, you run. The rule *is* the story. Every abstraction got replaced with a thing you watch happen:
> • the doom clock became **the dark literally eating tiles off the board**, herding everyone to the center
> • the resource became **a torch flame** you refill at a lantern or the gate
> • "progress" became **three lanterns you physically carry** — and drop when you're caught
> • the threat became **a Nightmare that walks toward you**, one visible step at a time
>
> The lessons were in the loop, not the plan. The first rebuilt playtest won **5% of games** — everyone's torch kept dying. Making a grabbed lantern *also* relight you turned it into a real fight in a single change. Then the simulator showed the Nightmare camping the one safe tile, so I made the Gate sanctuary — and the tension moved where it belonged: out in the field, racing the closing dark.
>
> None of that was guessing. A **Referee** test suite proves the game can never soft-lock or crash (150 chaotic games, every one ends cleanly), and a **Playtester** bot plays hundreds of full games and holds the win-rate at ~50% with almost every game a nail-biter — before a human ever sits down.
>
> Stack: boardgame.io · React/TypeScript · Tailwind · Framer Motion · Howler (100% procedural audio). Zero runtime AI, zero secrets, zero services — it just runs.
>
> I built it with Claude Code as my executing studio — I directed the research, made the design calls, and ran a six-lens council (game designer, art director, engineer, referee, playtester, and a "fresh-eyes" agent that has to play from the screen with no rules). That's the job I want to be great at: not generating slop, but **directing AI to hit a studio bar.**
>
> Play it: [link]

</details>

<div align="center"><sub>Grab the light. Get everyone out.</sub></div>
