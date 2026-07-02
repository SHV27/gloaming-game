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

## ▶ NEXT ACTION
**WS2 — Heroes.** Create `src/game/heroes.ts` (5 passive one-line heroes: swift/lamplighter/emberheart/
unseen/stubborn); add `Player.hero`; wire hooks (`strideFor` +1 / carry-0; relight adjacency; exclude from
`nightmareGoals`; onBegin half-burn); build `HeroSelect.tsx`; thread heroes through App→GameMount→client→setup;
add visible-in-play cues. Then `npm run playtest` with random heroes (band 45–55%, per-hero spread ≤±8) and
`npm run referee` (H12 Unseen-all, H14 Ember-Hearted adjacency). Commit + checkpoint.

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
