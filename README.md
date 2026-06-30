<div align="center">

# GLOAMING
### *The Board That Plays Back*

**A browser board game where the board is the antagonist.**
Light the three Beacons and lead every bearer across the Threshold —
before the Dread tide drowns the last of the light, and while one of you
may secretly serve the dark.

**▶ Play it live: https://gloaming-murex.vercel.app**

*2–4 players · pass-and-play · one device · no install*

</div>

---

## The hook

Most co-op board games give you a static board and a deck of cards. **GLOAMING makes the board a living,
adversarial entity.** Night is a *tide* that only rises — and as it climbs, the whole world visibly
darkens, the colour drains from it, fog thickens, a heartbeat quickens, and a **Stalker** wakes and hunts
you across the map. Every turn opens with an **Omen** the board whispers to you, and every choice has a
price. In larger parties, one player is secretly **Marked by the Gloaming**, quietly willing the night to
fall — and you get exactly one accusation to **Cast Out** the traitor before the dark feasts.

It teaches itself in ~60 seconds, plays in a single sitting, and tells a different story every game.

## Design thinking

Built backwards from feeling, the way the discipline says to:

- **MDA — aesthetics first.** The target emotions were chosen up front — *Tension, Discovery, Fellowship,
  Drama, Fantasy* — and the mechanics were reverse-engineered to produce them.
- **Costikyan's uncertainty, layered.** Randomness (the stride die), solver's uncertainty
  (push-your-luck "Press On" delves), player unpredictability (the hidden Marked), and narrator surprise
  (a re-skinning AI). The bias is toward *reducible* uncertainty — every Omen states its costs as plain
  chips, so choices are informed gambles, not coin-flips.
- **Flow / GameFlow — make time visible.** The Dread tide is the emotional core: a meter, a desaturating
  filter, a closing vignette, and an audio heartbeat that quickens together so you *feel* night falling.
- **Calibrated juice.** Feedback is amplified — a CSS-3D die that settles with weight, beacon blooms,
  tapered screen-shake on a Dread strike, a full procedural sound bed — but tuned *not* to drown what
  matters mechanically. Both extremes hurt; this aims for the middle.
- **Balanced by simulation.** A headless bot plays hundreds of full games through the real engine
  (`npm run playtest`) to keep the survivor win-rate in a tense, fair band and prove the game is winnable
  *and* losable before a human ever sits down.

## Architecture

| Concern | Choice |
|---|---|
| Game engine | **[boardgame.io](https://boardgame.io)** — authoritative state, moves, turn/phase flow, and **Secret State** (`playerView`) so the hidden Marked role never reaches another player's client |
| App | **Vite + React + TypeScript** |
| Style / motion / sound | **Tailwind v4** (single token file), **Framer Motion**, **Howler** (sound is procedurally synthesised — zero audio assets) |
| Living Narrator | A **Vercel serverless function** (`/api/narrate`) calls **Google Gemini 2.5 Flash** to *re-skin* an Omen's prose. The card's **mechanics never leave the client** — the AI only rewrites text — so it is impossible for the model to corrupt game state. The key is read **server-side only** and never enters the browser bundle. |
| Graceful fallback | With **no key**, a rate-limit, an error, or bad JSON, the narrator silently falls back to a hand-authored event deck. **The game is fully playable offline / keyless.** |
| Deploy | **Vercel** (static build + serverless function), **GitHub** via `gh` |

Hidden information is enforced by the engine, not the renderer: the hotseat passes the device behind an
interstitial and swaps the active `playerID`, and `playerView` strips every other player's role from the
state each client receives.

## Run it

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run playtest    # headless proof + balance sim (pure rules, real-reducer games, the Marked)
```

**Living Narrator (optional):** the game ships fully playable without it. To enable the AI locally,
`echo "GEMINI_API_KEY=your_key" > .env` and run `npx vercel dev`. In production, set `GEMINI_API_KEY` in
the Vercel project's Environment Variables — never in code.

## How to play

Pick your bearers and (at 4+) optionally seat **The Marked**. On your turn: answer the **Omen** →
**Roll Stride** and walk the glowing paths → take one node action (**Kindle** a Beacon, **Gather** at a
Wellspring, **Commune** at a Shrine, **Steady** to rest, **Aid** an ally) → optionally **Press On** for
an extra action and a risky delve → **End Turn**, and the board answers. Light all three Beacons, bring
the true bearers to the Threshold, and cross before night falls. Hand the device on at each handoff.

## Credits

Designed and built by **Shaurya Verma**, with **Claude (Opus 4.8)** as pair engineer/designer, operating
a research → plan → execute → review → ship loop with a multi-lens "Council" critique at each gate.

<div align="center"><sub>Light the dark. Cross together.</sub></div>
