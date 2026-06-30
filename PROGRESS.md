# PROGRESS.md — GLOAMING v2 (*The Deepening*)

> Resumable checkpoint. A fresh session can read this + `PLAN.md` and continue with
> "continue from PROGRESS.md." Update after **every** workstream. One next action, always.

---

## Where we are
**Workstream: WS1 — Foundation (in progress).**
Sessions S1–S3 shipped a beautiful but too-short/flat 2-player build with a softlock (Ember/light
ran out and no action button appeared). Session 4 = grand overhaul of design + feel per the brief.

## The v2 design in one breath
Single resource **Ember** (life+fuel+currency); **0 → Wisp** (auto-drifts, Rekindle-able → softlock cure).
Turn = **Roll → Move → place reacts → Brave or Steady → Gloaming acts**. Gloaming = **telegraph→strike**
cunning automa (SURGE/SEAL/STALK/SNUFF). Beacons are a **tug-of-war** (snuffable). **3 Acts** (Dusk→Gloaming→Pitch).
Win = all non-Wisp on Threshold with 3 lit; Lose = Night fills. Full spec in `PLAN.md`; references in `RESEARCH_V2.md`.

## Done
- [x] Read existing engine (types/constants/board/gloaming/effects/events) + control-surface UI (App/shell/TurnHud).
- [x] `RESEARCH_V2.md` (Jumanji/Zathura, automa, easy-to-learn, juice, bgio, narrator) written.
- [x] `PLAN.md` refreshed to the v2 spec.
- [x] `PROGRESS.md` (this file) created.
- [ ] `CLAUDE.md` updated with v2 pillars + Referee/Playtester agents.
- [ ] WS1 commit.

## Workstream board
- **WS1 Foundation** — docs + CLAUDE.md. *(finishing)*
- **WS2 Engine v2** — Ember/Wisp, Roll→Move→React→Brave/Steady→Gloaming, Acts, beacon tug-of-war, win/lose; rewire UI to compile. *(next)*
- **WS3 Gloaming automa** — telegraph→strike intents, Stalker, sealing, scaling.
- **WS4 Clarity + tutorial** — goal line, legal-move highlight+reasons, consequence preview, teach-by-playing, rules card.
- **WS5 Balance** — Playtester sim + Referee tests; tune to bands; zero softlocks.
- **WS6 Feel + UI** — Night tide/Acts, beacon ignite/snuff, juice, sound, responsive, a11y.
- **WS7 Ship** — Council+Referee+Playtester gate → DoD → Vercel deploy → README case study.

## NEXT ACTION
Finish WS1: fold the v2 pillars + the Referee (⚖️) and Playtester (🎮) agents into `CLAUDE.md` §3/§6/§11, then commit WS1. Then start WS2 by rewriting `src/game/constants.ts` and `src/game/types.ts` to the single-Ember / Wisp / intent / Act model.

## Open decisions / to-verify
- **Gemini model name + free limits** — re-verify (web) before the WS7 ship gate; narrator only re-skins, game runs keyless (not blocking earlier WS).
- Exact tuning numbers (EMBER_MAX, BEACON_NEED, nightMaxFor, drain/round, intent cadence) are **placeholders until the WS5 sim** — set sane starts, let the Playtester converge them to the 45–55% / 25–35min / dead-turn≈0 bands.
- Research was synthesized from established sources (cited in `RESEARCH_V2.md`) rather than live web fetch, to conserve context; live-volatile facts (model names) flagged above.

## Gotchas carried forward (from CLAUDE §11 — still true)
- bgio 0.50 move sig `({G,ctx,events,random,playerID},...)`; mutate G or `return INVALID_MOVE`; use `random` plugin.
- `vite.config` needs `define:{global:'globalThis'}`; never import `boardgame.io/server` into the browser bundle.
- Headless via `vite-node` (not tsx). Hotseat = one Client, swap `playerID`; Board↔App via `ShellContext`.
- `playerView` strips other seats' role + nulls `secret.markedId` — never add a per-seat tell to the shared HUD.
- `api/` is outside tsconfig/src (Vercel builds it); run AI locally with `vercel dev`.
- Deploy: Vercel project `shv-s-projects/gloaming`, prod alias `gloaming-murex.vercel.app`; CLI needs `--scope shv-s-projects --project gloaming`.
