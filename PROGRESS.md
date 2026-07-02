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
- **WS3** The Hollow One (crowned). `nightmare.path[]` full-route telegraph (`path[0]==nextNodeId`, ≤4 steps,
  never crosses void/Gate); **Pitch bearer-hunting** (`nightmareGoals` prefers non-hidden bearers → torch →
  idle, never strands). Board: fading footfall-trail path (glides on retarget = "changes its mind"); the token
  **evolves by Act** (Dusk small/1 eye/slow → Gloaming wakes/2 eyes/quicker → Pitch big/fierce/gaze-beam);
  **gaze** springs to face its quarry + lock-on flourish on new target. **Named THE HOLLOW ONE** (how-to, setup,
  act-change beats, all logs/effect text). Balance **2p51/3p49/4p46 (in band), spread 6.8 (≤±8), nail 68–81%,
  0 softlocks**; referee H12/H13/H14 + path-coherence ✓; build ✓; console-check ✓ 0 errors.

## ▶ NEXT ACTION
**WS4 — Plannable future + the Grandmaster proof.** (1) **Omen**: expose the next event's suit (☠ dread / ✦ hope
/ ⚡ calm) as a face-down card in the HUD (derive from `G.deck` top). (2) **What-if hover**: on a reachable tile,
a silent ghost — "land here · N to a Lantern · in/out of the Hollow One's path". (3) **Grandmaster bot**
(`scripts/grandmaster.ts` or a flag in playtest): plans 1–2 rounds ahead (escort/protect bearers, pre-position
rescues, bait the Hollow One off carriers, avoid frayed tiles, refuel before guttering, read forecast+path).
Print greedy vs smart win-rate per count; **require smart ≥ greedy +15 pts**; tune until skill pays. Referee +
playtest + commit.

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
