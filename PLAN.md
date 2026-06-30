# PLAN.md — GLOAMING v2: *The Deepening*

> Session-4 grand overhaul. Design backward from emotion → dynamics → mechanics.
> Keep the gorgeous dusk art, the board graph, the narrator, the atmosphere. Rebuild the *loop*.
> (S1/S2/S3 history lives in git; this is the active spec.)

---

## A · The one-sentence game
You and your fellows carry the last embers through a board that is actively hunting you; **light 3 Beacons and cross the Threshold together before Night falls** — while the Gloaming snuffs your beacons, seals your roads, and stalks the weakest of you. A turn is **Roll → Move → the place reacts → Brave it or Steady → the Gloaming takes its turn.**

## B · The five pillars (locked)
1. **EMBER — one resource, the heartbeat & the softlock cure.** Light + Embers collapse into a single **Ember** pool (0–`EMBER_MAX`). It is life, fuel, and currency. It drains a little each round (night deepens). You spend it to **Brave**, to **Kindle** beacons, to **Rekindle** allies. **Ember = 0 → WISP** (still takes turns; drifts 1 step toward the Hearth; cannot Brave; Rekindle by an ally on its node). No permadeath — Wisp is the floor. Every turn is actionable.
2. **THE GLOAMING — a cunning, legible automa.** Each round it **executes its telegraphed intent**, then **telegraphs the next** (shown on the board). Intents scale by Act: `SURGE` (Night jumps), `SEAL` (block the party's best edge), `STALK` (advance the Stalker at the most exposed player), `SNUFF` (knock a lit/near-lit Beacon back). It targets the play that most threatens its win — but you see it coming.
3. **BEACONS — a tug-of-war.** 3 Beacons; each needs `BEACON_NEED` Ember poured in to light. The Gloaming can **snuff** them (progress yanked back). Back-and-forth → comebacks, length, the "so close, then ripped away" gut-punch. Trailing side always keeps a fighting chance.
4. **THREE ACTS — "The Deepening."** Night rises through **Dusk → Gloaming → Pitch** (thresholds at `ACT_RATIOS`). Each Act: the Gloaming gains a power and Night ticks faster, climaxing in a frantic Threshold dash.
5. **BRAVE-or-STEADY + telegraphed OMENS.** **Brave it** = spend Ember, push your luck, bigger swing, real risk. **Steady** = safe, **+Ember**, always legal. Omens (the place reacting) frame the choice and carry a visible countdown when they threaten.

## C · Win / Lose
- **WIN:** every living player is **non-Wisp, on the Threshold node, with 3 Beacons lit.** (Carry everyone into the light — Wisps must be Rekindled first.)
- **LOSE:** the **Night** track fills.
- **4+ players (optional, kept):** hidden **Marked** with a secret agenda (Secret State). For 2–3 players the living Gloaming carries the tension.

## D · The turn (the whole rulebook)
1. **ROLL** the Stride die (d6).
2. **MOVE** up to `stride` steps along glowing edges (sealed edges blocked; illegal nodes greyed with reason). Optional — may stop early.
3. **THE PLACE REACTS** — an Omen is drawn, framed for the tile, in the Narrator panel. Always two responses:
   - **BRAVE IT** — contextual to the tile (§E); costs Ember; bigger reward; telegraphed risk.
   - **STEADY** — `STEADY_EMBER` Ember, no risk. *Always available → no softlock.*
   Plus contextual one-taps when valid: **Kindle** (on a Beacon), **Rekindle** (ally Wisp on your node), **Cross** (Threshold, 3 lit).
4. **Resolve** (consequence preview shown before commit).
5. **THE GLOAMING ACTS** (`turn.onEnd`, idempotent): execute telegraphed intent → choose+telegraph next → Night rises → Act may advance.

## E · What "Brave" means by tile (depth from one verb)
- **Beacon (unlit):** Brave = **Kindle** — pour up to all your Ember (min 1) into the beacon; bright flame raises the Gloaming's eye (its next SNUFF biases here). Steady = +Ember.
- **Wellspring:** Brave = **Draw Deep** — `+DEEP_EMBER` Ember but `+1` Night. Steady = **Sip** — `+STEADY_EMBER`.
- **Shrine:** Brave = **Commune** — draw an extra Omen and take its bold option (push luck). Steady = **Pray** — +Ember.
- **Hollow / Hearth:** the drawn Omen's two options *are* Brave/Steady. Hearth Steady gives `+1` extra (home warmth).
- **Threshold:** Brave = **Cross** if 3 lit (else gate shut — disabled with reason). Steady = +Ember.

## F · The Gloaming automa (WS3 detail)
Per round, after the player's choice resolves:
- **Execute** the pending intent (set last round); counterable ones first check whether the party neutralised it.
- **Choose next intent** by a cunning heuristic over current state, then **telegraph** it (board badge + narrator line):
  - `SNUFF b` — the lit/closest-to-lit beacon whose loss best slows a win.
  - `SEAL e` — an un-sealed edge on the shortest party→(beacon/threshold) route.
  - `STALK` — wake/advance the Stalker toward the lowest-Ember player.
  - `SURGE` — Night `+SURGE_AMT`. Default filler / early Act.
- **Act gating:** Dusk → {SURGE, SEAL}. Gloaming → +{STALK, SNUFF}, Stalker wakes, may fire 2 intents. Pitch → all powers, 2 intents, Night races.
- **Scaling by player count:** Night-fill rate, intent count, `BEACON_NEED` tuned per `numPlayers` (Playtester verifies).

## G · Files to touch
**Engine (WS2/3):**
- `constants.ts` — `EMBER_*`, `STEADY_EMBER`, `DEEP_EMBER`, `BEACON_NEED`, `nightMaxFor(n)`, `ACT_RATIOS`, intent scaling, Stalker.
- `types.ts` — `GState`: single `ember`, `wisp` flag (drop `light/embers/dimmed/graced/alive`), `night/nightMax`, `act`, `GloamingIntent`, beacon tug state, `pendingOmen`, per-turn flags.
- `effects.ts` — `spendEmber/gainEmber`, `toWisp/rekindle`, `kindleBeacon/snuffBeacon`, `chooseIntent/executeIntent`, `stalkerStep`, `advanceAct`, `checkGameover`.
- `events.ts` — re-author Omen deck as **{brave, steady}** pairs, tile-aware; keep narrator re-skin contract.
- `gloaming.ts` — moves `rollStride/moveTo/brave/steady/kindle/rekindle/cross/endTurn`; `onBegin` Wisp auto-drift; `onEnd` Gloaming act; `playerView`; `endIf`.
- `narrator.ts` — unchanged contract.

**UI (WS2 rewire-to-compile, WS4/6 polish):**
- `TurnHud.tsx` — **rewrite**: goal line, two big **Brave/Steady** buttons + cost/reward preview, contextual Kindle/Rekindle/Cross, Wisp state, Stride/roll, intent readout.
- `Board.tsx` — legal-move glow + greyed-with-reason, Gloaming **intent telegraph** marker, beacon progress rings + ignite/snuff, Stalker, Act darkening.
- `DreadTide.tsx`→**NightTide** (Act-aware), `TopBar.tsx`, `NarratorPanel.tsx` (Brave/Steady + countdown), `GameOver.tsx`, `Dice.tsx`, `SetupScreen.tsx`, `Tutorial.tsx` (WS4), `GameMount.tsx`.
- `sound.ts`/`useGameSound.ts` — cues: kindle, snuff, stalker-tick, surge, act-change, wisp, rekindle, cross.

**Quality (WS5):**
- `scripts/playtest.ts` — Playtester sim: length, win-rate band, comebacks, nail-biter rate, **dead-turn ≈ 0**.
- `scripts/referee.ts` (new) — assertions over the real reducer for every §H case.

## H · Edge cases the Referee must prove (invariant: always a legal action OR auto-resolve — never a softlock)
1. Ember → 0 mid-turn → Wisp; turn completes.
2. *All* players Wisps → drift, Night rises, ends by nightfall (no hang).
3. No legal *move* (edges sealed / stride 0) → Steady still legal; turn passes.
4. A Beacon unreachable → still winnable via others or graceful loss; no crash.
5. Night maxes mid-turn → immediate clean gameover (loss).
6. Gloaming snuffs the last lit Beacon during the Threshold dash → win check denies crossing; game continues.
7. Two players hit 0 Ember simultaneously → both Wisp; no double-resolve.
8. Refresh / remount mid-turn → state rehydrates; current player still has a legal action.
9. Narrator API fails mid-omen → deck fallback resolves; effects intact.
10. Win + loss true on the same resolution → **win wins** (checked first).
11. `endTurn` blocked while an Omen pends → resolve Brave/Steady first (Steady always offered).

## I · The test that proves it works
- `typecheck` + `build` clean; dev server zero console errors.
- `npm run referee` green across all of §H.
- `npm run playtest`: **length ~25–35 min equiv**, **win-rate 45–55%**, comebacks present, **dead-turn ≈ 0%**, nail-biters common.
- A human plays 2-player end-to-end: understands a turn unaided, never softlocks, feels outwitted, reaches a climax.

## J · Decisions locked (the senior call where the brief left a gap)
- **Single resource** (Ember), **no permadeath** (Wisp is the floor) — maximal simplicity + the softlock cure in one stroke.
- **Brave is contextual to the tile** — one verb, positional depth; UI still shows exactly two buttons + preview.
- **Telegraph→strike** with a cunning target heuristic — the "living board" at zero player bookkeeping.
- **Keep** the board graph, narrator, atmosphere, Marked (4+). **Cut** items / Light / dimmed / press-on / multi-action-budget (folded into Brave/Steady + Ember).
