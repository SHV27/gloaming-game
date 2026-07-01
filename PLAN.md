# PLAN.md — GLOAMING v3: *Trapped Inside*

> **Session 5 — The Reconception.** We are not iterating the euro-puzzle. We go to the root.
> The v2 build (Ember, Brave/Steady, a Night *meter*, beacons lit by pouring numbers) is a
> resource-management puzzle wearing a horror coat. There is an **abstraction layer** between the
> player and the terror. That gap is the "AI slop" smell. We rebuild the body; we keep the soul
> (dusk art, board-graph renderer, procedural sound, deploy pipeline, hotseat, boardgame.io).
>
> **THE DESIGN LAW (binding for the whole session):**
> **THE MECHANIC AND THE FANTASY MUST BE THE SAME THING.** Every rule is a *physical thing the
> player can SEE happen on the board*. If a rule is a hidden number doing math, it has failed —
> replace it with a thing that moves, grows, shrinks, or gets eaten. (Jumanji: you roll and a lion
> appears in the room and you run — the rule *is* the story, no layer between.)
>
> Two research truths drive every call: **the world teaches itself** (BOTW/Portal — no rulebook,
> one mechanic at a time, learning *is* play) and **the first 60 seconds decide everything**
> (≤70% of players quit onboarding — the open must *show what's unique* by *playing*, not reading).
> **No LLM/Gemini/AI at runtime. The game is 100% self-contained.**

---

## A · The one-breath pitch (fits on the box)
*You're trapped inside a board game. The dark eats the board from the edges inward. A Nightmare
walks toward whoever's closest. Grab the three Lanterns, carry them to the Gate, and get everyone
out together — before the dark reaches the middle. Don't let your torch go out. Don't get caught.
Don't leave anyone behind.*

**Target emotions (design backward):** *dread · togetherness · hope · panic · triumph.*

## B · Every element is a THING YOU SEE (the five pillars, locked)
1. **THE DARK — the doom clock, made spatial.** No Night meter. Each round the dark **eats the
   outermost surviving tiles** (a few per round; more each Act) — the player *watches* the board
   consumed inward. Tiles about to be eaten **fray/dim (telegraph)**. It herds everyone toward the
   center → natural rising pressure + a climactic final dash. **Lose = the dark reaches the Gate.**
2. **THE TORCH — your life, a shrinking flame (0–`TORCH_MAX` notches).** Burns down **1 notch/round**.
   Moving *through an already-dark (void-adjacent frayed) tile* costs an extra notch. **Refuel to full
   at a Lantern or the Gate.** Torch → 0 = **WISP** (drifts 1 step toward the Gate, cannot act) until
   a friend on your tile **Relights** you. No permadeath — Wisp is the softlock floor.
3. **THE LANTERNS — physical objects you carry (the masterstroke).** 3 Lanterns start on the
   dangerous **outer ring**. Walk onto one → **Grab** (shown on your token). Carrying makes you move
   **1 step slower per Lantern carried** (weight = tension; stride floored at 1). Carry to the **Gate**
   → **Deliver**. Caught / swept by the dark while carrying → you **drop it where you fall** (swept
   one ring *inward* if the tile is being eaten — always recoverable). Progress = things you *hold and
   can lose*, not a number.
4. **THE NIGHTMARE — an embodied hunter (one piece).** Each round it **steps toward the nearest
   torch** (its next step shown as a glowing footprint = legible menace). Reaching a player → they
   **drop what they carry, are knocked back one tile toward the Gate, and their torch is snuffed a
   notch**. One rule = the whole *bait-and-rescue* social game. Faster in later Acts.
5. **EVENTS — illustrated cards, not paragraphs.** Each round one dramatic thing you *watch*: an
   **icon + 3–4 words + a visible board effect**. e.g. **THE BRIDGE FALLS** (an extra edge tile
   crumbles) · **COLD SNAP** (every torch −1) · **THE SWARM** (Nightmare +1 step) · **A GIFT** (a
   nearby Lantern flares — refuel) · **FALSE DAWN** (one void tile relights — hope). No reading.
   This replaces the narrator entirely.

## C · Win / Lose
- **WIN:** every player is **not a Wisp, standing on the Gate, with all 3 Lanterns delivered** —
  then they **step through together**.
- **LOSE:** the dark eats the **Gate (center)** — everyone is swallowed. (Win is checked **first**.)
- **Marked traitor (4+, optional):** the `playerView`/`role` scaffolding stays dormant this session;
  co-op is the default. For 2–3 the Dark + Nightmare carry all the tension. (Deferred, not cut.)

## D · The board — a concentric-ring graph (the senior synthesis)
Keep the graph renderer + BFS; make the graph **rings around a center** so "eaten from the edge
inward / herded to the middle" is native. Generated programmatically (symmetric, tunable):
- **Ring 0** — 1 node, **The Gate** (center): refuel + deliver + escape. Dark reaching it = loss.
- **Ring 1** — 6 nodes. **Ring 2** — 12 nodes. **Ring 3 (outer)** — 12 nodes (Lanterns spawn here).
- Edges: each node links to its 2 circular ring-neighbors + its nearest node in the adjacent **inner**
  ring (a spiderweb; every node has a path inward → no unreachable nodes). `ring` + `angle` stored per
  node for the dark's eat-order and Lantern/Nightmare placement.
- **Acts are the visible board state:** Dusk (outer ring intact) → Gloaming (outer ring gone, eating
  ring 2) → Pitch (ring 2 gone, eating ring 1 — the frantic dash). Act = f(deepest surviving ring).

## E · The turn (the whole rulebook — self-explanatory, order obvious)
The HUD walks the sequence, one glowing step at a time:
1. **① ROLL** — the die pulses "roll to move".
2. **② MOVE** — up to `stride` steps; **legal tiles glow gold**, illegal greyed **with a reason on
   hover** ("the dark", "too far"). Carrying a Lantern visibly shortens your reach. May stop early.
3. **③ ACT** — exactly **one obvious glowing button** for what this tile offers:
   **🔦 Grab Lantern** / **🚪 Step Through the Gate** (enabled only when all 3 delivered & all present)
   / **🤝 Relight** (a Wisp ally on your tile) / **🔥 Warm at the Gate** (refuel) / else **End Turn**.
   *End Turn / Warm is ALWAYS legal → a turn can never dead-end.*
4. **Then you WATCH the board's turn** as an unmissable sequence: the dark eats a bite → the Nightmare
   takes its step(s) → an **event card flips and animates**.

**Affordance law:** from the screen alone the player can always answer *"what can I do right now, and
what happens if I do it?"* Legal actions glow; consequences preview on hover/focus; **never a hidden
legal action, never a dead end.**

## F · The Dark automa (per round, at `turn.onEnd`, idempotent)
1. **EAT** `darkBiteFor(act, numPlayers)` frontier tiles (outermost surviving, deterministic order).
   A player on an eaten tile → knocked 1 ring inward + torch −`DARK_KNOCK`; a Lantern on it → swept 1
   ring inward. If the Gate is reached → loss.
2. **TELEGRAPH** the next bite: mark the next frontier tiles `fraying` (rendered dim/fraying).
3. **NIGHTMARE STEPS** `nightmareStepsFor(act)` toward the nearest non-Wisp torch (BFS on surviving
   graph); on contact → drop carried Lanterns + knockback + torch snuff. Telegraph its next step tile.
4. **EVENT** — flip one illustrated card; apply its visible board effect.
5. Recompute Act from the deepest surviving ring; on Act change → flash + a wordless act-title.

## G · Files to touch
**Engine (WS2):**
- `board.ts` — **rewrite**: concentric-ring graph generator; `GATE_ID`, `ringOf`, outer-ring/frontier
  helpers, `EDGES`, `nodeById`, `edgeKey`. New viewBox (≈960×960, centered).
- `types.ts` — **rewrite** `GState`: `torch` (was ember) + `wisp`; `dark:number[]` (eaten) +
  `fraying:number[]`; `lanterns:{id,nodeId|null,carriedBy|null,delivered}[]`; `nightmare:{nodeId,nextNodeId}`;
  `act`; per-turn scratch; log/flash; keep dormant `role`/`secret`. Drop `night/nightMax`, `beacons`,
  `sealedEdges`, omen/Brave types, Stalker/intents.
- `constants.ts` — `TORCH_START/MAX`, `MOVE_DARK_COST`, `DARK_KNOCK`, `darkBiteFor`, `nightmareStepsFor`,
  `LANTERN_CARRY_STRIDE_PEN`, `RELIGHT`, ring sizes, Act mapping, per-count scaling.
- `effects.ts` — **rewrite**: `burnTorch/refuel/toWisp/relight`, `grabLantern/deliverLantern/dropLanterns`,
  `eatFrontier/telegraphDark/sweepInward`, `nightmareStep`, `applyEventEffect`, `legalMoves`,
  `getTileAction` (the single ③ button source shared by HUD + move), `checkGameover` (win first).
- `events.ts` — **rewrite** as ~14+ **illustrated cards**: `{id, icon, words(≤4), effect, tone}`; no prose.
- `gloaming.ts` — moves `rollStride / moveTo / grab / deliver / relight / warm / stepThrough / endTurn`;
  `onBegin` (burn torch, Wisp auto-drift); `onEnd` (the Dark automa §F); `playerView` (dormant role);
  `endIf`. Cut `brave/steady/kindle/sow/castOut` (or keep castOut dormant).
- **DELETE** `narrator.ts` + `api/narrate.ts` + all Gemini/env narrator deps.

**UI (WS3/4/7):**
- `TurnHud.tsx` — **rewrite** to the ①②③ walker: roll, one ACT button, carry indicator, torch flame,
  Wisp state, "who has what / who's out" party roster, the dark's proximity read.
- `Board.tsx` — **rewrite**: rings; **the dark eating** (void spread + fraying tiles = centerpiece);
  Lanterns (glow, sit heavy when carried, scatter light); the **Nightmare** + glowing next-step
  footprint; the Gate pulses when 3 delivered; torches gutter low; legal-move glow + greyed-with-reason.
- `DreadTide.tsx`→**cut/replace** (the shrinking board *is* the clock; a thin "how close is the dark"
  read only). `EventLog.tsx`→**EventCard** (illustrated flip). `GameOver.tsx`, `Dice.tsx`, `TopBar.tsx`,
  `SetupScreen.tsx`, `Tutorial.tsx` (teach-by-playing), `GameMount.tsx`, `Atmosphere.tsx` reworked to rings.
- `sound.ts`/`useGameSound.ts` — cues: roll, step, grab, deliver(chime), dark-eat(low crumble),
  nightmare-step(dread tick), snuff, wisp, relight, event-flip, act-change, escape(triumph).

**Onboarding (WS5):** `Splash.tsx` (SHV Studios embers→title), `ColdOpen.tsx` (wordless ~15s), the
teach-by-playing first turn (die pulse → tile glow → Lantern sparkle → watch the dark eat 1 + Nightmare
step 1), a one-screen illustrated **How-to-Play** card.

**Quality (WS6):**
- `scripts/referee.ts` — **rewrite** assertions over the real reducer for every §H case.
- `scripts/playtest.ts` — **rewrite** headless sim: length ~20–30 min equiv, win-rate ~45–55%,
  comebacks, nail-biter rate, **dead-turn ≈ 0**, per player count.

## H · Edge cases the Referee must prove (invariant: always a legal action OR auto-resolve — never a softlock/crash)
1. Torch → 0 mid-turn → Wisp; turn completes.
2. *All* players Wisps → drift to Gate, dark keeps eating, ends by dark-reaches-Gate (no hang).
3. No legal *move* (surrounded by void / stride 0) → **End Turn / Warm** still legal; turn passes.
4. A Lantern on a tile the dark then eats → **swept one ring inward** (recoverable) — never lost, or a graceful loss.
5. Dark reaches the Gate mid-resolution → immediate clean **loss**.
6. 3rd Lantern delivered **and** the dark reaches the Gate on the same resolution → **win checked first**.
7. Two players hit 0 torch simultaneously → both Wisp; no double-resolve.
8. Refresh / remount mid-turn → state rehydrates; current player still has a legal action.
9. The Nightmare and the dark hit the same player the same round → resolves once, deterministic.
10. Carrying two Lanterns and getting caught → **both drop** correctly (onto valid, non-void tiles).
11. `endTurn` is always offered; `stepThrough` only when all 3 delivered **and** every non-Wisp is on the Gate.

## I · The tests that prove it works
- `typecheck` + `build` clean; dev server **zero console errors** (`scripts/console-check.mjs`).
- `npm run referee` green across all of §H.
- `npm run playtest`: **length ~20–30 min equiv**, **win-rate ~45–55%** per count, comebacks present,
  **dead-turn ≈ 0** (rescuable-Wisp turns may be excluded — dramatic, not empty), nail-biters common.
- **Fresh-Eyes agent** (shown only the screen, no rules) states a correct legal action + consequence each turn.
- A human plays 2-player end-to-end: understands a turn in the first minute unaided, never softlocks,
  the dark visibly closes in, reaches a frantic climax, ~20–30 min.

## J · Senior calls locked (where the brief left a gap)
- **Concentric-ring graph**, not a new grid engine — keeps the renderer/BFS, makes "eaten inward /
  herded to center" native, and ties Acts to the visible board.
- **The center is ONE place — The Gate:** home + refuel + deliver + escape. One concept teaches faster;
  the dark racing you to the one safe tile is the tightest possible theme.
- **The Dark eats `k` frontier tiles/round** (granular, telegraphed, tunable) rather than a whole ring
  instantly — more "I can see it coming," and simulable.
- **Torch = a flame with notches** (keeps the Wisp/Relight softlock cure), **Lanterns = carried objects**
  (replaces beacon-pour tug-of-war with a physical carry-and-drop tug-of-war).
- **No Brave/Steady dilemma:** tension is now *spatial* (who grabs the far Lantern before the dark eats
  it, who baits the Nightmare, who rescues the Wisp). The abstract gamble is gone by design.
- **Marked traitor deferred** (scaffolding dormant), AI narrator **deleted** — 100% self-contained.
