# PROGRESS.md — GLOAMING v2 (*The Deepening*)

> Resumable checkpoint. A fresh session can read this + `PLAN.md` and continue with
> "continue from PROGRESS.md." Update after **every** workstream. One next action, always.

---

## Where we are
**v2 (The Deepening) is BUILT, TESTED, and SHIPPED to production.** Live: https://gloaming-murex.vercel.app
Done: WS1 (foundation), WS2 (engine v2), WS3 (Gloaming automa), WS4 (tutorial/clarity), WS5a (Referee suite),
WS7 (README case study + deploy + 0 console errors). Remaining polish: **WS5b** (finish balance — the 4p gap
+ dead-turn) and **WS6** (deeper feel — dedicated sound cues, grimoire narration + AI re-skin wiring, a11y).
Sessions S1–S3 shipped a beautiful but too-short/flat 2-player build with a softlock (resources ran out and
no action button appeared) — v2 is the grand overhaul that fixes it structurally (Wisp/Steady) + rebuilds
the loop around a single Ember resource, Brave-or-Steady, and a telegraphing living board.

## Shipped-state verification (DoD)
- `npm run typecheck` ✓ · `npm run build` ✓ · dev server **0 console errors** (live + local, `scripts/console-check.mjs`).
- `npm run referee` ✓ — softlock invariant + PLAN §H; 120 chaos games (2–6p) all terminate.
- `npm run playtest` — 0 softlocks; win-rate 2p 47% / 3p 47% / 4p 30%; dead-turn 10–22%.
- Visual: tutorial, setup, and the live board render clean (legal-move glow, place reacts, two Brave/Steady
  buttons with previews, goal line, Night tide + Acts, party roster). Screenshots in `.shots/` (gitignored).
- Deployed to Vercel prod (`shv-s-projects/gloaming`, alias `gloaming-murex.vercel.app`); pushed to GitHub
  (`SHV27/gloaming-game`, master). No secrets in bundle (narrator key is server-only in `api/narrate.ts`).

## The v2 design in one breath
Single resource **Ember** (life+fuel+currency); **0 → Wisp** (auto-drifts, Rekindle-able → softlock cure).
Turn = **Roll → Move → place reacts → Brave or Steady → Gloaming acts**. Gloaming = **telegraph→strike**
cunning automa (SURGE/SEAL/STALK/SNUFF). Beacons are a **tug-of-war** (snuffable). **3 Acts** (Dusk→Gloaming→Pitch).
Win = all non-Wisp on Threshold with 3 lit; Lose = Night fills. Full spec in `PLAN.md`; references in `RESEARCH_V2.md`.

## Done
- [x] WS1 Foundation: RESEARCH_V2.md, PLAN.md, PROGRESS.md, CLAUDE.md (v2 pillars + Referee/Playtester agents). Committed.
- [x] WS2 Engine v2: single resource **Ember**; **0→Wisp** (drift + Rekindle) = softlock cure; turn = Roll→Move→React→**Brave/Steady**→Gloaming; **3 Acts**; **beacon tug-of-war**; win = all non-Wisp on Threshold w/ 3 lit, lose = Night fills. All coupled UI rewired (TurnHud rebuilt to two-button + goal line + previews + intent readout; Board/EventLog/GameOver/NightTide/etc.). `typecheck` + `build` green.
- [x] WS3 Gloaming automa (built into the engine): **telegraph→strike** intents (SURGE/SEAL/STALK/SNUFF), cunning target heuristic, Stalker, snuff cooldown, scaling by Act + player count.
- [x] Headless Playtester (`npm run playtest`) over the real reducer: **0 softlocks** across 180 games; win-rate **2p 47% · 3p 47% · 4p 30%**; dead-turn 10–22%.

## Workstream board
- **WS1 Foundation** — DONE.
- **WS2 Engine v2** — DONE.
- **WS3 Gloaming automa** — DONE (folded into engine).
- **WS4 Clarity + tutorial** — *(next)* goal line ✔(basic, in HUD), legal-move highlight+reasons ✔(board glow + disabled-with-reason), consequence preview ✔(basic); still TODO: rebuild the **teach-by-playing tutorial** for the v2 turn + a one-screen **rules card**; sharpen greyed-move reasons on the board itself.
- **WS5 Balance** — Playtester sim exists; still TODO: **Referee test suite** (PLAN §H edge cases), close the **4p gap** to ~45–55%, reduce dead-turn (wisp starvation at high count), lengthen to ~12–16 rounds.
- **WS6 Feel + UI** — Night tide/Acts, beacon ignite/snuff visceral, dice/stalker juice, dedicated sound cues (kindle/snuff/surge/wisp/rekindle), grimoire narration reveal + AI re-skin wiring, responsive, a11y; **verify in headless Chrome** (`scripts/shot.mjs`).
- **WS7 Ship** — Council+Referee+Playtester gate → DoD → Vercel deploy → README case study.

## NEXT ACTION
Two follow-ups remain (game is live and fully playable without them):
1. **WS5b — finish balance** (`constants.ts` tunables; loop via `npm run playtest`): bring **4p from 30% → ~45–55%** and cut **dead-turn (~10–22% → ~0)**. The 4p difficulty is wisp-starvation from more Gloaming turns/round; likely levers: gentler `emberDrainFor`, a touch more `nightMaxFor` slope at high n, or a smarter sim bot (the bot is greedy, not optimal, so real win-rates run a little higher than the sim). Consider whether the sim "dead-turn" metric should exclude rescuable-Wisp turns (they're dramatic, not contentless).
2. **WS6 — feel polish**: add dedicated procedural SFX in `audio/sound.ts` (kindle, snuff, surge, wisp, rekindle, cross — currently mapped to reused cues in `useGameSound`); re-introduce the **grimoire narration reveal** for the omen text + wire the AI `narrate()` re-skin (verify current free Gemini model name first); make beacon ignite/snuff more visceral on the board; a11y sweep (keyboard nav, contrast, reduced-motion already honored).

## Open decisions / to-verify
- **Gemini model name + free limits** — re-verify (web) before the WS7 ship gate; narrator only re-skins, game runs keyless (not blocking earlier WS). AI re-skin is currently unwired in the UI (WS6 reintroduces the grimoire panel + `narrate()`).
- **Balance is close but not final**: 2p/3p in band, 4p 30% (too hard), dead-turn above 0. Tunables live in `constants.ts`; WS5 auto-research loop converges them + adds the Referee suite. Length ~7–10 rounds now (want ~12–16 → ~25–35 min).
- Research synthesized from established sources (cited in `RESEARCH_V2.md`) rather than live web fetch, to conserve context; live-volatile facts (model names) flagged above.

## v2 engine gotchas (carry forward)
- One omen is drawn per turn (`turnOmen`, in `onBegin`); it resolves only if you Brave on a **hollow/hearth**. Special tiles (beacon/well/shrine/threshold) have **intrinsic** Brave actions. `getReaction()` (effects) is the single source the HUD + `brave` move share.
- `brave`/`steady`/`rekindle` **auto-end the turn** and skip `endTurn` if the move itself wins (so the board can't snuff away a just-completed crossing — but CAN snuff during the multi-turn dash). Win checked before loss in `checkGameover`.
- **Wisp turn** = `onBegin` sets `autoWisp`, drifts toward Hearth, and the only legal move is `endTurn`; the HUD (and sim) auto-pass it. This is THE softlock guarantee alongside "Steady always legal".
- SEAL = a **passable but +2-stride** "thorned" road (never a hard block → never a softlock). SNUFF only touches **lit** beacons in **Pitch** (Act 2); in Dusk/Gloaming it claws unlit progress only. Snuff cooldown = `SNUFF_COOLDOWN * numPlayers` turns (≈per-round constant).

## Gotchas carried forward (from CLAUDE §11 — still true)
- bgio 0.50 move sig `({G,ctx,events,random,playerID},...)`; mutate G or `return INVALID_MOVE`; use `random` plugin.
- `vite.config` needs `define:{global:'globalThis'}`; never import `boardgame.io/server` into the browser bundle.
- Headless via `vite-node` (not tsx). Hotseat = one Client, swap `playerID`; Board↔App via `ShellContext`.
- `playerView` strips other seats' role + nulls `secret.markedId` — never add a per-seat tell to the shared HUD.
- `api/` is outside tsconfig/src (Vercel builds it); run AI locally with `vercel dev`.
- Deploy: Vercel project `shv-s-projects/gloaming`, prod alias `gloaming-murex.vercel.app`; CLI needs `--scope shv-s-projects --project gloaming`.
