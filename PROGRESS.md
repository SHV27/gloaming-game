# PROGRESS.md — GLOAMING (*Trapped Inside*) · Session 6: THE CROWNING

> Resumable checkpoint. A fresh session reads this + `PLAN.md` (v4) and continues.
> Update after every workstream. One next action, always.

---

## Where we are — S6 THE CROWNING (final release), in progress
**Live (v3): https://gloaming-murex.vercel.app** · Repo: https://github.com/SHV27/gloaming-game (master).

v3 is **SHIPPED and LOVED** (a real player played 5 back-to-back, couldn't stop). S6 does **not** rebuild
what is loved — it **elevates it to a finished product and certifies it** via five ADDITIVE pillars
(full spec `PLAN.md` v4): causal legibility · Match Story · Heroes · the Hollow One (crowned) · the
plannable future (+ the Grandmaster skill-gap proof). **No LLM at runtime. No engine rewrite.**

## ✅ Done (S6)
- **WS1** Baseline re-verified green (typecheck ✓ · referee ✓ 150/150 · playtest 2p45/3p55/4p51, 0 softlocks).
  `PLAN.md` rewritten to v4 (The Crowning); `CLAUDE.md` updated (rules-budget law §0, S6 §11 log entry).
- **WS2** Heroes shipped. `heroes.ts` (5 passive one-liners); `Player.hero`; hooks wired in effects/gloaming
  (`strideFor(+1 / carry-0)`, Ember-Hearted adjacency relight, `nightmareGoals` excludes the *empty-handed*
  Unseen, Stubborn half-burn). `HeroSelect.tsx` (silhouette art, hotseat pick order); threaded App→GameMount→
  client→setup; HUD hero line + roster labels. **Unseen rebalanced**: "overlooked *until you carry a Lantern*".
  (3p dark table-mult 0.95→1.0.)
- **WS3** The Hollow One (crowned). `nightmare.path[]` full-route telegraph; **Pitch bearer-hunting**; Board:
  fading footfall-trail (glides on retarget); token **evolves by Act** (Dusk→Gloaming→Pitch); **gaze** + lock-on;
  named **THE HOLLOW ONE**. Referee H13 + path-coherence ✓.
- **WS4** Plannable future + **THE GRANDMASTER PROOF**. `scripts/grandmaster.ts` (`npm run grandmaster`): a smart
  bot (danger-weighted racing, no-gutter, coordinate, carry-dodge, Unseen fray-immunity) vs a careless greedy on
  **paired seeded games** (kills setup-luck noise). **Result: +20.5 pts @2p (skill matters most / most-played),
  +8 @3p, +6 @4p — positive at every count, +11.3 overall.** ("Tune until skill pays": torch 8→7, frayed step
  cost 1→2 [reading the telegraph is now a real skill], dark rates fully retuned per count.) **Unseen repivoted**
  from "overlooked until carrying" (a trap pick, −13 spread) → **"slips the dark — frayed tiles never burn your
  torch"** (spread now 3.2). **Omen** (next card's suit ☠/✦/⚡, face-down in HUD) + **what-if hover** (ghost:
  N→Lantern · in/out of the Hollow One's path · dark-eats-next). Band **52/47/46, spread 3.2, nail 61–85%, 0
  softlocks**. Referee ✓ (H12 rewritten for fray-immunity), build ✓, console-check ✓ 0 errors.

- **WS5** Causal legibility (Pillar 1). `beats: Beat[]` ring-buffer + `beat()` helper; pushed at every cause
  point (grab/deliver/catch/wisp/rescue/dark/event/act/gate-open/escape/swallowed). Three views, one record:
  transient **BeatBanner** (cause→effect, e.g. "THE HOLLOW ONE → catches Ash"), last-4 **BeatStrip** ("Just now"
  panel), + feeds Match Story. **EscapeChecklist** (always-visible in TopBar): 🏮/3 · 👥 atGate · 🔥 lit, each
  lights when satisfied. **Gate-opening moment**: `gate-open` flash at the 3rd deliver → `GateOpenFlood` light
  wash + beacon swell + big banner. **Honest forecast**: `darkForecastNextRound` = exact whole-tile bite; the
  fraying marks show exactly that; Dark gauge reads "−N next round". `eventEffectText` unified in events.ts.
  Re-verified: band ~53/53/55, spread 2.4, **Grandmaster +16@2p (PASS)**, 0 softlocks; build + console-check ✓.

- **WS6** Match Story (Pillar 2). State: `everWisped` + `stats {catches,rescues,grabs,darkEaten,minTilesLeft}`
  incremented at cause points; `Lantern.droppedAtRound` for the loss-teacher. Pure `story.ts` (`matchVerdict`/
  `matchTimeline`/`matchNumbers`/`lossTeacher`). `MatchStory.tsx` recap (replaces GameOver): **tiered named
  ending** — FLAWLESS DAWN (!everWisped) / BY A BREATH (won after a Wisp) / SO CLOSE (loss, 3 delivered) /
  SWALLOWED — illustrated **timeline** of key beats, the few **numbers**, and on a loss the **loss-teacher**.
  **Play Again** (same heroes → `shell.playAgain`) + **Change Heroes** + **New Party**. `GameOver.tsx` deleted.
  Referee **H15** (every ending → valid verdict) + **H17** (gate-open fires once) ✓; band/spread/softlocks ✓;
  build ✓.

- **WS7** UI-state machine + onboarding finished. `phase.ts` `turnControls(G,current,playerID)` → single source
  of {phase, canRoll/Move/Act/EndTurn}; TurnHud derives from it. `scripts/uistate.ts` (`npm run uistate`, H16):
  1272 turns — per-phase control contract holds AND the engine REJECTS out-of-order input (no move/act/end
  before roll, no re-roll) → button-order bugs structurally impossible. **`Coach.tsx`** scripted first turn
  (first game only): "Roll → tap a glowing tile → grab → watch the board" coachmarks, skippable. How-to **+6th
  Heroes panel**. a11y: tiles keyboard-navigable (tab/enter, focus=hover), reduced-motion honored. All screens
  screenshot-verified studio-grade. Referee + build + uistate + console-check (0 errors) ✓.

## ▶ NEXT ACTION
**WS8 — Certification → ship.** (1) Run the Council as subagents (Game Designer · Art Director · Principal
Engineer · Referee-review · Playtester-read · Fresh-Eyes) + the **🏆 Certification pass** (hostile-QA: 2p & 4p,
every hero, every ending, tutorial/how-to/select/MatchStory, resize/refresh/sound/reduced-motion; zero open
defects). Fix findings. (2) **README** = the six-session case study (built→torn down→reconceived→crowned; the
agent system; the numbers). (3) Deploy prod (`vercel --prod --yes --scope shv-s-projects`; stored login — if
auth missing, STOP and tell the user). Verify prod with `console-check.mjs` through real gameplay. (4) Print:
live URL · repo URL · LinkedIn post (my voice) · 100-word hackathon pitch. Final `CLAUDE.md`/`PROGRESS.md`.

## S6 verification gates (all green)
`npm run typecheck` · `npm run build` · `npm run referee` (H1–H17) · `npm run playtest` (band 45–55, spread ≤±8,
0 softlocks) · `npm run grandmaster` (+15@2p, positive everywhere) · `npm run uistate` (control contract) ·
`node scripts/console-check.mjs <url>` (0 errors).

## ⚠ Balance gotchas (S6 — carry forward)
- Torch is now **7** (was 8). Frayed step costs **2** (was 1) — reading the fraying telegraph is a real skill;
  the Unseen is immune to it. `darkBiteFor` base **[2.2,3.0,3.9]**, `byTable` per count tuned to the gap+band
  sweet spot (2p 0.52 / 3p 1.05 / 4p 1.22). Re-run BOTH `npm run playtest` (band 45–55 + spread ≤±8) AND
  `npm run grandmaster` (2p gap ≥15, positive everywhere) after ANY constant change.
- The Grandmaster gap is **large at small tables, small at 4p by design** (more hands forgive more — a real
  co-op truth). Don't "fix" 4p by over-tightening — it makes the smart bot too slow and flips the gap negative.

## S6 workstreams (see PLAN §J)
1. ✅ WS1 baseline + PLAN v4 + CLAUDE.md.  2. WS2 Heroes.  3. WS3 The Hollow One.  4. WS4 Plannable future +
Grandmaster.  5. WS5 Causal legibility.  6. WS6 Match Story.  7. WS7 UI-state machine/tests + juice + onboarding.
8. WS8 Certification → ship.

## v3 engine gotchas (carry forward — PROTECT, never regress)
- World reacts in `turn.onEnd` (guard `boardActed`): dark/Nightmare pace via accumulators
  (`darkCharge/nmCharge += perRoundRate/numPlayers`); one Event/round at `ctx.playOrderPos===n-1`.
- Softlock cures (never remove): `endTurn`/`warm` always legal after roll; Wisp = `autoWisp` auto-drift;
  `getTileAction` always returns a usable action. **Grab refuels the torch** (the whole torch economy).
- **The Gate is sanctuary** — the Nightmare can't enter it or touch a bearer on it. A catch shoves you
  OUTWARD (`sweepOutward`) + snuffs 2 torch. Win checked before loss.
- Board balance lives in `constants.ts`; re-verify with `npm run playtest` after any change.
- Framer SVG: animate the `scale`/`x` TRANSFORM, never the `r`/`cx` ATTRIBUTE (console-error footgun).
- Headless scripts run via `vite-node` (Vite resolver); `npm run referee` / `playtest`.

## Verification harness
- `npm run typecheck` · `npm run build` · `npm run referee` · `npm run playtest` · (S6) `npm run uistate`.
- `node scripts/console-check.mjs [url]` drives headless Chrome through real gameplay → "0 console errors".

## Ship facts
- GitHub `SHV27/gloaming-game` (master). Vercel `shv-s-projects/gloaming`, alias `gloaming-murex.vercel.app`.
- Deploy: `vercel --prod --yes --scope shv-s-projects` (stored login; token NOT in the automated shell —
  if auth is missing, STOP and tell the user, never embed a credential). No runtime secrets.
- `.gitignore` covers `.env*`, `.vercel`, `node_modules`, `dist`, `.shots`.
