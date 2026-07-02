# PROGRESS.md — GLOAMING v3 (*Trapped Inside*)

> Resumable checkpoint. A fresh session reads this + `PLAN.md` and continues.
> Update after every workstream. One next action, always.

---

## Where we are — S5 THE RECONCEPTION: COMPLETE (pending only the prod deploy)
GLOAMING is rebuilt from a euro-puzzle into a **visible, physical, self-teaching adventure**
(*Trapped Inside*): the dark eats the board from the edges inward, a Nightmare walks toward the
nearest torch, you carry 3 Lanterns to the central Gate and get everyone out before the center
falls. **Design law:** the mechanic and the fantasy are the same thing — every rule is a THING YOU
SEE. **No LLM at runtime.** Full spec in `PLAN.md`.

The game is **built, balanced, tested, polished, and Council-reviewed.** It compiles, builds, runs
with **0 console errors**, plays end-to-end, and teaches itself. The **only** remaining step is
pushing the prod deploy (the deploy token isn't in the automated shell — see NEXT ACTION).

## ✅ Done (all committed)
- **WS1** Reconception written into `PLAN.md` / `CLAUDE.md` (design law, Fresh-Eyes lens, narrator cut).
- **WS2** Engine v3: concentric-ring `board.ts`; `torch`/Wisp/Relight; carried `lanterns`; the dark
  automa (`eatFrontier`/`fraying`/`sweepInward`/`sweepOutward`); the embodied `nightmare`; 16
  illustrated event cards; 3 Acts; win/lose. AI narrator + `api/narrate.ts` DELETED.
- **WS3** UI: `Board.tsx` (rings, the devouring dark, carried Lanterns, the Nightmare + footprint,
  shrinking island of light, torches, click-to-path); `TurnHud` ①②③ walker via `getTileAction`;
  `EventCard`; setup/gameover/atmosphere/gauge retold. **The Gate is sanctuary** (Nightmare warded).
- **WS2b** Referee suite: every PLAN §H case + 150 chaos games/2–6p terminate — **no softlock, no crash.**
- **WS4** Onboarding: SHV Studios splash → title; illustrated 5-beat how-to (visible model), first-run + `?`.
- **WS5** Council + Fresh-Eyes applied: Nightmare teeth (2 torch + shoved OUTWARD), devouring void
  (torn holes + dread rot), shrinking island glow, legible Dark gauge, event effect hints, live "N/3"
  goal counter, `nmCharge` pace fix.
- **WS6 (docs)** README rewritten as the reconception case study + LinkedIn draft. `PROGRESS`/`CLAUDE` updated.

## Verification (DoD)
- `npm run typecheck` ✓ · `npm run build` ✓ · dev server **0 console errors** (`scripts/console-check.mjs`, real gameplay).
- `npm run referee` ✓ — all §H + 150 chaos games (2–6p) terminate cleanly.
- `npm run playtest` — **win-rate 2p 45% / 3p 53% / 4p 52%** (band 45–55%); **nail-biters 74–87%**;
  **dead-turn 2.7–11.6%** (rescuable-Wisp drifts); **0 softlocks / 450 games**; avg ~9–11 rounds.
- Visual: splash, how-to, opening board (warm island, DUSK), and deep game (devoured board, PITCH)
  all render studio-grade — screenshots in `.shots/` (gitignored).

## ▶ NEXT ACTION — push the prod deploy
The build + repo are ready. To publish:
1. **GitHub:** `git push origin master` (gh is authed as SHV27 → `github.com/SHV27/gloaming-game`).
2. **Vercel:** the deploy token is NOT in the automated shell. With `VERCEL_TOKEN` exported in an
   interactive shell (or a stored `vercel login`):
   `vercel --prod --yes --scope shv-s-projects` (project `gloaming`, `.vercel/project.json` already links it).
   Prod alias: `https://gloaming-murex.vercel.app`. No runtime secret/env needed anymore (narrator gone).
3. Run `scripts/console-check.mjs <prod-url>` against the live URL to confirm 0 console errors in prod.

## v3 engine gotchas (carry forward)
- World reacts in `turn.onEnd` (guard `boardActed`): dark/Nightmare pace via accumulators
  (`darkCharge/nmCharge += perRoundRate/numPlayers`); one Event/round at `ctx.playOrderPos===n-1`.
- Softlock cures (never remove): `endTurn`/`warm` always legal after roll; Wisp = `autoWisp` auto-drift;
  `getTileAction` always returns a usable action. **Grab refuels the torch** (the whole torch economy).
- **The Gate is sanctuary** — the Nightmare can't enter it or touch a bearer on it (`nearestTorchGoals`
  excludes gate players; BFS blocks the gate). A catch shoves you OUTWARD (`sweepOutward`) into danger.
- Win checked before loss. Board balance lives in `constants.ts` (`darkBiteFor`/`darkSlowdownFor`/
  `nightmareStepsFor`/torch); re-verify with `npm run playtest` after any change.
- Framer SVG: animate the `scale` TRANSFORM, never the `r`/`cx` ATTRIBUTE (console-error footgun).

## Ship facts
- GitHub `SHV27/gloaming-game` (master). Vercel `shv-s-projects/gloaming`, alias `gloaming-murex.vercel.app`.
- No runtime secrets. `.gitignore` covers `.env*`, `.vercel`, `node_modules`, `dist`, `.shots`.
