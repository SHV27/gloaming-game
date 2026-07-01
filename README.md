<div align="center">

# GLOAMING
### *The Board That Plays Back*

**A browser board game where the board is a living, adversarial mind — and it is hunting you.**
Spend your Ember to light the three Beacons, gather every bearer at the Threshold, and cross together —
before the Night drowns the last of the light.

**▶ Play it live: https://gloaming-murex.vercel.app**

*2–6 players · pass-and-play · one device · no install · a full game in ~30 minutes*

</div>

---

## The hook

Most co-op board games hand you a *static* board and a deck of cards. Static puzzles get solved, and a
solved puzzle is a dull puzzle. **GLOAMING makes the board an opponent that takes a turn.**

Each round the Gloaming plays back — and it *tells you what it will do next*: snuff a Beacon you just
lit, thorn a road shut across your best route, wake a **Stalker** toward your weakest bearer, or surge
the Night. You see the blow coming, so you can try to outwit it. It targets whatever most threatens your
win. You feel *outplayed by a mind*, never cheated by dice.

That is the whole trick, and it is quietly an *unfair advantage*: a tabletop "automa" opponent has to
stay brain-dead simple because a human runs it by hand every turn. **Ours runs on the machine — so it can
be genuinely cunning at zero cost to the players.** Night falls in three Acts — **Dusk → the Gloaming →
Pitch** — and with each Act it gains a power and closes faster, building to a frantic dash for the gate.

It teaches itself in ~60 seconds, and tells a different story every game.

## Easy to learn, impossible to put down

The entire rulebook is one turn:

> **Roll** the Stride die → **Move** along the glowing paths → the **place reacts** → make **one choice:
> _Brave it_** (a bold play that spends your Ember for a bigger prize and a real risk) **or _Steady_**
> (play it safe and gather Ember). Then the Gloaming takes its turn.

Everything runs on **one resource — Ember** — which is your life, your fuel, *and* your fire. Collapsing
the usual pile of stats into a single number is what makes a 9-year-old understand a turn instantly, while
*where you stand* changes what "Brave" does — so mastery still runs deep.

## The bug that reshaped the design

A real playtester finished a game **without understanding the rules**, and once hit a **softlock**: their
resources ran dry and *no legal action existed* — the turn simply could not pass. That single failure
drove the v2 architecture:

- **Ember can't kill you — it demotes you.** At zero Ember you become a **Wisp**: you still take a turn
  (you drift toward the Hearth), you just can't Brave, and any ally who reaches you can **Rekindle** your
  light. A Wisp is a fully-defined, always-actionable state — so no turn can ever dead-end, and rescuing a
  fallen friend becomes the emotional high of the game.
- **Steady is *always* legal.** The safe option is always on the table, so there is always a button to press.
- **The Referee proves it.** A dedicated test suite (`npm run referee`) asserts the hard invariant over
  the real engine and fuzzes **120 games of deliberately chaotic bots at 2–6 players** — every one reaches
  a clean terminal state. The softlock cannot come back.

## Design thinking

Built backwards from feeling, the way the discipline says to:

- **MDA — aesthetics first.** The target emotions were chosen up front — *Tension, Discovery, Fellowship,
  Drama, Fantasy* — and the mechanics were reverse-engineered to produce them.
- **The living automa.** The Gloaming's telegraph → strike loop is the tension engine (studied from
  solo/co-op "automa" design, and from how *Jumanji* / *Zathura* give the board *agency* and a shared doom
  clock everyone loses to). Telegraphed-but-uncertain = anticipation, not gotcha.
- **Costikyan's uncertainty, layered & reducible.** The stride die, push-your-luck Braving, a hidden
  traitor at 4+, and an AI narrator's surprise — but every choice shows its cost *before* you commit, so
  they're informed gambles, not coin-flips.
- **Make time visible.** The Night tide is the emotional core: a rising meter, a desaturating board, a
  thickening vignette, and an audio heartbeat that quickens together, so you *feel* night falling.
- **Balanced by simulation.** A headless bot plays hundreds of full games through the real engine
  (`npm run playtest`) reporting win-rate, length, comebacks, and dead-turn rate — the game is proven
  winnable *and* losable, in a tense ~50/50 band, before a human ever sits down.

## Architecture

| Concern | Choice |
|---|---|
| Game engine | **[boardgame.io](https://boardgame.io)** — authoritative state, moves, turn flow, and **Secret State** (`playerView`) so the hidden Marked role never reaches another client |
| App | **Vite + React + TypeScript** |
| Style / motion / sound | **Tailwind v4** (one token file), **Framer Motion**, **Howler** (sound is procedurally synthesised — zero audio assets) |
| The Gloaming | A cunning-but-legible **automa**: a telegraph → strike intent engine that targets whatever most threatens the party's win, scaling by Act and table size — pure functions in the reducer, fully headless-testable |
| Living Narrator | A **Vercel serverless function** (`/api/narrate`) calls **Google Gemini 2.5 Flash** to *re-skin* an omen's prose. The card's **mechanics never leave the client** — the AI only rewrites text — so it can't corrupt game state. The key is read **server-side only** and never enters the browser bundle. |
| Graceful fallback | With **no key**, a rate-limit, or bad JSON, the narrator silently falls back to the hand-authored deck. **The game is fully playable keyless / offline.** |
| Quality gates | `npm run referee` (turn-flow integrity, no softlock) · `npm run playtest` (balance & fun metrics) · `tsc` · Vite build |
| Deploy | **Vercel** (static build + serverless), **GitHub** via `gh` |

## Run it

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run referee     # turn-flow integrity — proves the game can never softlock
npm run playtest    # headless balance sim (win-rate, length, dead-turn, comebacks)
```

**Living Narrator (optional):** ships fully playable without it. Locally, `echo "GEMINI_API_KEY=your_key"
> .env` and run `npx vercel dev`. In production set `GEMINI_API_KEY` in the Vercel project's Environment
Variables — never in code.

## Credits

Designed and built by **Shaurya Verma**, with **Claude (Opus 4.8)** as pair engineer/designer, running a
research → plan → execute → review → ship loop with a multi-lens "Council" (Game Designer · Art Director ·
Principal Engineer · **Referee** · **Playtester**) critiquing at each gate.

---

<details>
<summary><b>LinkedIn draft</b> (click to expand)</summary>

> I built a browser board game where **the board is the opponent** — and it plays to win.
>
> **GLOAMING — The Board That Plays Back.** 2–6 players, pass-and-play, ~30 minutes, runs in any browser.
>
> The premise: most co-op board games give you a static board, and a static board is a solved puzzle. So I
> made the board take a turn. Each round "the Gloaming" tells you exactly what it means to do next — snuff
> the Beacon you just lit, seal your best road, hunt your weakest player — and then does it. You feel
> outsmarted by a *mind*, not beaten by dice.
>
> The design bet that made it work: a tabletop "automa" opponent has to be brain-dead simple because a
> human runs it by hand. Mine runs on the machine — so it can be genuinely cunning at zero cost to the
> player. That's an advantage software has over cardboard, and I leaned all the way into it.
>
> Two things I'm proud of:
> • **One resource, one decision.** Everything is "Ember" (life + fuel), and every turn is just *Brave it
>   or Steady*. A 9-year-old learns it in a turn; mastery still runs deep because *where you stand* changes
>   what Brave does.
> • **A real playtester hit a softlock** — a turn that literally couldn't end. I rearchitected around it
>   (run out of Ember and you become a rescuable "Wisp" instead of a dead end) and wrote an automated
>   Referee that fuzzes 120 chaotic games to prove the dead-end can never return.
>
> Stack: boardgame.io · React/TypeScript · Tailwind · Framer Motion · Howler (100% procedural audio) · a
> Gemini-powered narrator that only ever re-skins text, so it can't corrupt game state · balanced by a
> headless simulator that plays hundreds of games before any human does.
>
> Built with Claude Code as a pair designer/engineer, run as a five-lens studio. Play it: [link]

</details>

<div align="center"><sub>Light the dark. Cross together.</sub></div>
