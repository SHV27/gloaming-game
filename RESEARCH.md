# RESEARCH — GLOAMING Session 1

> Gathered via three parallel read-only subagents (boardgame.io API · co-op "rising threat" patterns · dice/reveal game-feel). Synthesized here. Cited inline.

---

## 1 · boardgame.io (current API, v0.50.x, 2026)

**Move signature is the destructured object form** — the legacy `(G, ctx)` positional form is gone:

```ts
moves: {
  rollAndMove: ({ G, ctx, events, random, playerID }, ...args) => { /* mutate G */ }
}
```

- **Mutate `G` in place** (immer wraps moves); return nothing. To reject a move: `return INVALID_MOVE` (from `boardgame.io/core`). Never both mutate and return.
- **Randomness:** use the **`random` plugin** destructured from move args — `random.D6()`, `random.Die(6, n)`, `random.Shuffle(arr)`, `random.Number()`. **Never `ctx.random`** (legacy; leaks seed, breaks purity).
- **`ctx`** (read-only): `currentPlayer, numPlayers, turn, phase, playOrder, playOrderPos, activePlayers, numMoves, gameover`.
- **`events`** (fire *after* the move completes — don't read post-event ctx in the same move): `endTurn({next?}), endPhase, setPhase, endStage, setActivePlayers, endGame`.
- **Turn hooks:** `turn.onBegin / onEnd` — `onEnd` is where "the board plays back" lives. `turn.stages` = temporarily rewrite the legal move set (an ability). `minMoves/maxMoves`.
- **Phases:** `{ start:true, moves, onBegin, onEnd, endIf, next }`.
- **`endIf({G,ctx})`** → return `{ winner }`/gameover object to end, falsy to continue. Called after every move/phase; result frozen in `ctx.gameover`.
- **React client (hotseat):**
  ```ts
  import { Client } from 'boardgame.io/react';
  import { Local } from 'boardgame.io/multiplayer';
  const C = Client({ game, board, numPlayers, multiplayer: Local() });
  ```
  Board gets props `{ G, ctx, moves, playerID, isActive, events, reset, undo, redo }`. **Pass-and-play = one client, swap the `playerID` prop on handoff** behind a tap-to-reveal interstitial (keeps hidden info off-screen).
- **Secret state (S2 traitor):** `playerView: ({G,ctx,playerID}) => redactedG` runs on every push; client never receives hidden fields. Built-in `PlayerView.STRIP_SECRETS` deletes `G.secret` + non-owned `G.players[*]`. Pair secret-assigning moves with **`client:false`** (long-form move) so RNG/role never runs client-side.
- **Vite gotchas:** `define:{ global:'globalThis' }` in `vite.config.ts` (else "global is not defined" crash — **done**). Subpath imports only (`boardgame.io/react|core|multiplayer`). **Never import `boardgame.io/server`** into the browser bundle (pulls Koa/Node). Type your own `Game<G>` / `BoardProps<G>`.

Sources: boardgame.io docs `Game.md`, `events.md`, `random.md`, `multiplayer.md`, `secret-state.md` (github.com/boardgameio/boardgame.io).

---

## 2 · Co-op "escape the rising threat" patterns

**Primary reference:** `hwabis/forbidden-desert` — a real boardgame.io + React Forbidden Desert clone (whole game in `src/Game.js`). Ruleset cross-checked vs UltraBoardGames.

Patterns we **steal**:
- **The board's turn = `turn.onEnd`** — runs automatically after a player passes. No AI "player" needed for a living antagonist.
- **One rising `dread` int → *number of board events per round*** (looked up by `(dread, numPlayers)`), not just bigger numbers. As dread climbs, the board *acts more often each round*. This is our visible tightening (CLAUDE §6 "make time visible"). Player count scales headroom.
- **`endIf` checks losses BEFORE win**, all in one pure function: any player downed → loss; clock maxed → loss; win = objective complete **AND** `players.filter(atExit).length === numPlayers`.
- **AP economy = our own counter**, not `ctx.numMoves` (which counts free moves too). Free actions (give item, help ally) simply don't decrement AP.
- **Objectives/items live on nodes**; collecting = array splice/push. Items are one-shot moves that consume themselves; mark them **`undoable:false`** (irreversible reveals must not be undoable — state integrity).
- **"The board shifts under you"** (storm rotates tiles, pawns ride along) — the single best mechanic for a *living, adversarial board*. We adapt as Gloaming **corrupting/shifting edges** + pulling players toward the dark.
- **`turn.stages`** for "an ability temporarily changes legal moves."
- **A "mitigate" lever:** spend scarce AP now to reduce next round's board draws — pay to weaken the board's turn. Great tension knob.

Mistakes we **avoid** (their cautionary tales):
- Visibility enforced only in the renderer (no real secret state) — **fatal for a hidden traitor**; we use `playerView` from the start of S2.
- **`onEnd` double-fired** → they patched with a guard flag. **Our environment phase must be idempotent** (guard `G.boardActedThisTurn`).
- Untyped JS + a case-typo silently skewed threat math → we use **TS for `G`** and **explicit `neighbors[]`** (not index arithmetic) for an irregular graph.
- Weighted-RNG fake deck is hard to author/balance → we use a **real shuffled, hand-authored event deck** (also the seam for the S-later Gemini narrator + fallback).

Sources: github.com/hwabis/forbidden-desert (`src/Game.js`), boardgame.io `notable_projects.md`, ultraboardgames.com/forbidden-desert.

---

## 3 · Dice + reveal game-feel (implementation-ready numbers)

**Dice — CSS-3D cube, not 2D face-swap** (2D reads flat/arcade → fails the no-slop bar). A d6 needs 6 faces; cost is trivial and you get a real "placed down" thunk.
- **Deterministic landing:** fixed end-transform per face, then add whole 360° turns on top so it tumbles before resolving to the engine's result.
  Face rotations (deg, `rotateX rotateY rotateZ`): 1:`0 0 0` · 2:`0 -90 0` · 3:`-90 -90 0` · 4:`-90 180 90` · 5:`90 180 90` · 6:`90 0 0`.
- **Timing:** total **1000–1200ms** (1.1s sweet spot; never >1.4s — repeated rolls get tedious). Anticipation cock-back **80–120ms** (`rotateX −12°`, `scale .96`). **Easing expo-out `cubic-bezier(0.16,1,0.3,1)`** (energy front-loaded, long decel = "set down"). **2–3 full tumble spins.** Settle: micro-spring on `y`/`scale` (`stiffness 600, damping 18`, ~120ms) + 4–6px board nudge + clatter SFX on the settle frame.
- **2d6:** stagger starts 60–90ms, randomize each die's spin (±1) and `rotateZ` jitter (±6°); land A then B ~80ms apart — two distinct thunks read as physical.
- **Reduced motion:** skip tumble, 200ms cross-fade to final face.

**Card / event reveal — "narrator grimoire":** choreograph beats, one parent variant orchestrating children.
- Beats: backdrop dim (280ms, blur 0→8px, dim to `rgba(10,10,20,.72)`) → card rise+scale (`y 48→0, scale .92→1`, spring `stiffness 260 damping 22`) → **held beat `delayChildren 0.35s`** → title → **body lines `staggerChildren 0.12`, blur-up `y14→0 filter blur(6)→0`** → choice buttons on their own later stagger (~0.9–1.1s in), `staggerChildren 0.08`.
- **Fade-in-by-line (blur-up), NOT typewriter** — typewriter reads as "terminal," fights screen readers, slow. (Optional: one short oracular narrator line may typewriter ≤28ms/char, skippable.)
- z-order: backdrop(40) < card glow(45) < card(50) < fog overlay(55, pointer-events:none) < text(60). Wrap in `AnimatePresence` for exit.

**Calibrated juice (premium, not noisy):**
- **Screen shake on Dread strike:** translate the *board container* (not viewport) **6–10px**, **180–260ms**, 3–4 oscillations, **exponential-out decay**, randomized direction. Minor events 2–3px. Always pair with sound (audio carries impact → visuals stay subtle).
- **Beacon bloom = slow swell, not flash:** radial ember glow `scale 0→1.4→1` over **600–800ms**, 8–12 drifting ember particles (~900ms), brief page-wide +8% warm tint receding over 1.2s. Expo-out. (Distinct from the fast dice snap.)
- Hit-flashes 50–100ms max. Magnitude maps to meaning. Honor `prefers-reduced-motion` (kill shake, keep glows static).

Sources: magnars.com/alea-iacta-est, motion.dev/motion/stagger, framer.com/motion/animation, feel-docs.moremountains.com/screen-shakes, gameanalytics.com juice, wayline.io "the juice problem".

---

## Net design decisions carried into PLAN.md
1. Graph board with explicit `neighbors[]`; uniform `Node` records with `revealed/corrupted/beacon` flags.
2. `dread` int drives **draws-per-round** via a `(dread,numPlayers)` table → visible tightening + desaturation overlay.
3. Environment phase in `turn.onEnd`, **idempotent** (guard flag), draws from a **shuffled hand-authored deck** (≥18 cards).
4. Own **AP counter**; free actions don't spend; irreversible moves `undoable:false`.
5. `endIf` losses-first; win = 3 beacons lit **AND** all alive players at Threshold.
6. Dice = CSS-3D cube, deterministic + expo-out 1.1s; reveals = staggered blur-up grimoire; tapered board-shake + slow beacon bloom.
7. Shape `G` now so S2 can drop in `playerView` + `client:false` traitor with no refactor (`G.secret`, per-player `role`).
