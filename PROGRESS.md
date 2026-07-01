# PROGRESS.md — GLOAMING v3 (*Trapped Inside*)

> Resumable checkpoint. A fresh session reads this + `PLAN.md` and continues with
> "read PROGRESS.md and continue the reconception." Update after **every** workstream.
> One next action, always. Nothing is ever lost.

---

## Where we are — S5 THE RECONCEPTION (in progress)
We are rebuilding GLOAMING from a **euro-puzzle** (v2: abstract Ember, Brave/Steady, a Night
*meter*, beacons lit by pouring numbers) into a **visible, physical, self-teaching adventure**
(*Trapped Inside*): the dark eats the board from the edges inward, a Nightmare walks toward the
nearest torch, you carry 3 Lanterns to the Gate and get everyone out before the center falls.
**Design law:** the mechanic and the fantasy must be the same thing — every rule is a THING YOU
SEE. Full spec in `PLAN.md`. **No LLM/Gemini at runtime — deleted.**

## ✅ Done this session
- **WS1 — Reconception written.** `PLAN.md` rewritten as *Trapped Inside* (five visible pillars,
  concentric-ring board, the turn ①②③, §H edge cases, §I tests, §J senior calls). `CLAUDE.md`
  updated (design law + Fresh-Eyes lens + AI-narrator cut + ring-board decision).
- **WS2 — Engine v3 BUILT, TYPE-CLEAN, BALANCED, SOFTLOCK-FREE.**
  - `board.ts` — **concentric-ring graph** (rings 1·6·12·12 around the Gate), generated
    programmatically; `RING_OF`, `OUTER_RING_IDS`, `spreadOuter`, `GATE_ID`.
  - `types.ts` — GState: `torch`/`wisp`, `lanterns[]` (carry/drop/deliver), `dark[]`+`fraying[]`,
    `nightmare{nodeId,nextNodeId}`, `act`, `round`, `darkCharge`/`nmCharge` pace accumulators.
  - `constants.ts` — torch, dark rate (`darkBiteFor` + `darkSlowdownFor`), `nightmareStepsFor`,
    Act mapping, carry penalty, relight — all tuned.
  - `effects.ts` — torch/wisp/relight, grab/deliver/drop, `eatFrontier`/`sweepInward`,
    `nightmareStep`, `applyEventEffect`, `getTileAction` (the single ③ button), `checkGameover`
    (win first). `events.ts` — 16 **illustrated** cards (icon + ≤4 words + visible effect; no prose).
  - `gloaming.ts` — moves `rollStride/moveTo/grab/deliver/relight/warm/stepThrough/endTurn`;
    `onBegin` (torch burn + Wisp auto-drift); `onEnd` (the Dark automa — eat, Nightmare step,
    one Event/round, Act deepen); dormant `playerView`/Marked scaffolding.
  - **Deleted** `src/game/narrator.ts` + `api/narrate.ts` (no runtime AI).
- **WS2b (partial) — Playtester rewritten** (`npm run playtest`, real reducer, greedy co-op bot):
  **0 softlocks / 300 games**; **win-rate 2p 53% · 3p 57% · 4p 54%** (band 45–55%); nail-biters
  44–51%; avg ~9–11 rounds; dead-turn 7–17% (rescuable-Wisp drifts — dramatic, not empty).

## ⚠️ Build state (important for the next session)
The **engine + playtest are 100% type-clean**, but the **app does NOT compile yet** — the UI still
imports v2 symbols (Ember/Brave/beacons/night/narrator). That is expected mid-rebuild. The next
workstream ports the UI to the new model; only then do `typecheck`/`build` go green again.
UI files needing rewrite: `Board.tsx`, `TurnHud.tsx`, `App.tsx`, `TopBar.tsx`, `DreadTide.tsx`
(→cut), `EventLog.tsx` (→EventCard), `GameOver.tsx`, `Dice.tsx`, `SetupScreen.tsx`, `Tutorial.tsx`,
`Atmosphere.tsx`, `RoleReveal.tsx`, `useGameSound.ts`, `sound.ts`, and `referee.ts` (script).

## ▶ NEXT ACTION
**WS3 — Rebuild the UI to the visible model** (get the app compiling + playable), in this order:
1. `Board.tsx` — the centerpiece: draw the ring graph; **the dark eating** (void tiles + `fraying`
   telegraph); Lanterns (glow on tile / rendered on the carrier's token); the **Nightmare** piece +
   its glowing `nextNodeId` footprint; the Gate pulsing when 3 delivered; torch guttering; legal-move
   glow (`reachable(G,me,stride)`) + greyed-with-reason. Keep `Atmosphere.tsx`'s style, re-fit to rings.
2. `TurnHud.tsx` — the ①②③ walker: Roll → Move (glow) → one ACT button from `getTileAction(G,me)`;
   torch flame, carry indicator, Wisp state, party roster, "how close is the dark" read. Cut narrator.
3. `App.tsx` (drop `resetNarrator`), `SetupScreen.tsx`, `GameOver.tsx` (escaped/swallowed),
   `Dice.tsx`, `EventLog.tsx`→illustrated **EventCard**, `TopBar.tsx`, `useGameSound.ts`/`sound.ts`
   (map new FlashKinds: step/grab/deliver/dark-eat/nightmare/relight/event/act-change/escape).
4. Then `scripts/referee.ts` — rewrite assertions for PLAN §H (softlock invariant + all edge cases).
5. `npm run typecheck` + `build` green, `scripts/console-check.mjs` = 0 console errors.

Then WS4 (onboarding: SHV splash + wordless cold open + teach-by-playing + how-to card), WS5 (feel/
sound/a11y), WS6 (Council + Fresh-Eyes + Referee + Playtester gate → DoD → deploy → README/LinkedIn).

## Engine v3 gotchas (carry forward)
- The world reacts in `turn.onEnd` (guard `boardActed`): dark eats (`darkCharge += rate/n`, resolve
  whole tiles), Nightmare steps (`nmCharge`), and **one Event per round** (at `ctx.playOrderPos===n-1`).
  Rates are per-ROUND, divided by `n` per turn, so pace is constant across player counts.
- **Softlock cures (never remove):** `endTurn`/`warm` are always legal after roll; a Wisp turn is an
  auto-drift to the Gate (`autoWisp`); `getTileAction` always returns an enabled fallback (warm/endTurn).
- **Grab refuels** the torch (a Lantern is a light source) — this is the whole torch economy; without
  it players gutter out constantly (was the 5% win-rate bug). Deliver + warm also refuel.
- Win is checked **before** loss (`checkGameover`): 3 delivered + every player non-Wisp on the Gate =
  escaped; the dark reaching the Gate = swallowed.
- `getTileAction` is the SINGLE source of the ③ button — the HUD and the moves must both use it.
- Length is ~9–11 rounds (bot). If the human playtest feels rushed vs the 20–30 min target, slow
  `darkBiteFor` base; re-verify win-rate stays 45–55% via `npm run playtest`.

## Ship facts (carry forward, unchanged)
- Vercel project `shv-s-projects/gloaming`, prod alias `gloaming-murex.vercel.app`; CLI needs
  `--scope shv-s-projects --project gloaming`. GitHub `SHV27/gloaming-game`, master. Deploy token in
  shell env `VERCEL_TOKEN` only (never a file). No runtime secret anymore (narrator removed).
- bgio 0.50 move sig `({G,ctx,events,random,playerID},...)`; mutate G / `INVALID_MOVE`; `random` plugin.
- `vite.config` needs `define:{global:'globalThis'}`; headless scripts via `vite-node` (not tsx).
