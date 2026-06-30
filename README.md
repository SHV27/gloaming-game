# GLOAMING — *The Board That Plays Back*

A browser board game (2–4, hotseat / pass-and-play) where the board is a living, adversarial
entity. Light the **3 Beacons** and bring every bearer to the **Threshold** before the **Dread tide**
drowns the last of the light — while one of you may secretly serve the dark.

Built with Vite + React + TypeScript, [boardgame.io](https://boardgame.io), Tailwind v4,
Framer Motion, and Howler. Optional **Living Narrator** powered by Google Gemini 2.5 Flash
(with a hand-authored event-deck fallback, so it runs with **no key**).

## Run

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run playtest    # headless proof: pure rules + real-reducer balance sim (incl. the Marked)
```

## How to play

Pick 2–4 bearers, name them, and (at 4+) optionally seat **The Marked** and/or the **Living Narrator**.
On your turn: answer the **Omen** → **Roll Stride** and step along glowing paths → take one node action
(**Kindle** a Beacon, **Gather** at a Wellspring, **Commune** at a Shrine, **Steady** to rest, **Aid** an
ally) → optionally **Press On** (push-your-luck: an extra action and a delve into the dark) → **End Turn**,
and the board plays back: the tide rises, the Gloaming strikes, and — past the midpoint — the **Stalker**
wakes and hunts. Light all three Beacons and get the true bearers across before night falls. Hand the
device on at each handoff. **The Marked** wins if the night falls; they sabotage in secret (**Sow the Dark**).

## The Living Narrator (optional)

The narrator re-skins each Omen's prose to the moment via the server-side `api/narrate` function — the
card's *mechanics never change*, only its words, so it's always safe. The key is read **only** server-side:

```bash
# local, with the AI narrator:
echo "GEMINI_API_KEY=your_key" > .env
npx vercel dev            # serves the app + the /api/narrate function

# without a key, or in plain `npm run dev`, the narrator silently falls back to the deck.
```

Deploy to Vercel; set `GEMINI_API_KEY` in the project's Environment Variables (never in code).

See `PLAN.md` / `RESEARCH.md` for design and `CLAUDE.md` for the working constitution.
