# PLAN.md — GLOAMING v4: *The Crowning* (Session 6 — the final release)

> **v3 is LOVED.** A real player played five games back-to-back, lost four, won one, and couldn't
> stop ("kaise jeetun kaise jeetun"). The compulsion loop works; the Nightmare works; the dark works.
> **Session 6 does not rebuild what is loved — it elevates it to a finished product and certifies it.**
> All five pillars are **additive**. No engine rewrite. Every §0 anti-regression gotcha is protected.
>
> **THE DIAGNOSIS:** the game is **action-legible** ("what can I do right now" — Fresh-Eyes solved this)
> but not yet **causally legible** ("*why* did that happen; how close are we; what decision won it").
> Chess produces strategy because the full state is visible **and every consequence is understood**.
> Session 6 makes the game as causally legible as chess, gives every match a story, every player an
> identity, crowns the villain, and certifies the whole thing like a studio release.
>
> **THE RULES-BUDGET LAW (binding):** if a feature needs a paragraph to explain, it's wrong — **one
> line or it doesn't ship.** Every rule stays a THING YOU SEE (the Design Law, CLAUDE §0).
> **No LLM/AI at runtime. 100% self-contained.**

---

## A · The five pillars (locked)

1. **CAUSAL LEGIBILITY** — every state change announces its **cause → effect** in one glance, in-world:
   cause→effect **beats** ("COLD SNAP → all torches −1"), a diegetic **Escape Checklist** (🏮🏮🏮 · 👥 · 🔥),
   the **Gate-opening moment** (the win-explainer), an **honest dark forecast** (exact tiles next round),
   a human-readable **turn log** (last 4 beats as icon lines).
2. **THE MATCH STORY** — record key moments during play; at game end show a **recap screen**: an
   illustrated timeline of the game's 6–10 key beats, a **tiered named ending** (FLAWLESS DAWN · BY A
   BREATH · SWALLOWED · SO CLOSE), the few numbers that matter, and — on a loss — **what killed the run**.
   A big warm **Play Again** + **Change Heroes** close the compulsion loop at its strongest moment.
3. **THE HEROES** — each player picks a **Hero** with **ONE passive, rule-breaking ability, one line,
   always visible.** No activation, no cooldown, no new turn step (zero rules-budget cost). They create
   *complementary* team plans — the fix for the open-co-op "one player solves it alone" trap.
4. **THE NIGHTMARE, CROWNED** — the villain the player already loves, elevated: it **evolves with the
   Acts** (a shape in the fog → it wakes → it hunts the Lanterns), telegraphs its **full path**, in
   **Pitch hunts the nearest bearer**, has **presence** (turns to look, lock-on flourish), and a **name:
   THE HOLLOW ONE.**
5. **THE PLANNABLE FUTURE** — strategy needs a visible tomorrow: exact dark forecast (P1) + full
   Nightmare path (P4) + **The Omen** (next event's *suit* visible, detail hidden) + **what-if on hover**
   (ghost of the result) + **THE GRANDMASTER TEST** (a smart bot must beat the greedy bot by **≥15 pts**).

---

## B · THE HEROES — the roster (final call; balance via the Playtester)

Five heroes. Each ability is **always-on, passive, visible in play, one line.** 2p picks 2, etc. — the
pairing is strategy. Lives in `src/game/heroes.ts` (id · name · one-line ability · silhouette motif ·
accent), shared by engine + UI. `Player.hero: HeroId`.

| id | name | one line (the whole rule) | engine hook | visible-in-play cue |
|----|------|---------------------------|-------------|---------------------|
| `swift` | **THE SWIFT** | *Your stride is always +1.* | `strideFor(+1)` | reaches one ring further — glow shows it |
| `lamplighter` | **THE LAMPLIGHTER** | *Carrying Lanterns never slows you.* | carry penalty = 0 | full reach even while carrying |
| `emberheart` | **THE EMBER-HEARTED** | *You can Relight a friend on an adjacent tile.* | relight adjacency | relight button lights for a Wisp one tile away |
| `unseen` | **THE UNSEEN** | *The Hollow One never hunts you (it can still stumble in).* | excluded from `nightmareGoals` | the path never points at you |
| `stubborn` | **THE STUBBORN FLAME** | *Your torch burns half as slow (every other round).* | round-burn skips odd rounds | flame visibly steadier / taller |

**Complementary play (the anti-solo design):** the Lamplighter runs the far Lantern; the Swift covers
ground / rescues; the Unseen baits and body-blocks; the Ember-Hearted rescues without stacking; the
Stubborn Flame takes the deep, slow route. No hero can do it all — the *team* wins.

**Hero edge cases (Referee, never optional):** Unseen when all others are Wisp → the Hollow One idles
(legal, no target, no crash). Lamplighter at max carry → stride = roll, fine. Ember-Hearted adjacency
Relight across the Gate boundary → legal (helps the gather), never a softlock. Abilities never add a
mid-turn decision. Per-hero win-rate spread ≤ **±8 pts** (no mandatory pick, no trap pick).

---

## C · THE NIGHTMARE, CROWNED — *The Hollow One*

- **Name** revealed in-world (how-to + the fog + act titles). One identity, consistent.
- **Act evolution (visible, zero new rules):** *Dusk* — a shape in the fog (small, dim eye, slow tick).
  *The Gloaming* — it **wakes** (brighter eyes, quicker pulse, larger). *Pitch* — it **hunts** (biggest,
  fiercest, fastest; targets bearers).
- **Full path telegraph:** `nightmare.path: number[]` = its whole intended route (up to 4 steps) toward
  its goal, drawn as a fading trail of footfalls. **Retargets redraw** → players *see it change its mind*.
- **Pitch bearer-hunting:** in Act 2, goals prefer the nearest **Lantern-bearer** (fallback: nearest
  torch; fallback: idle). One line on the telegraph: *"its gaze locks on the Lantern."* The climax is
  now "protect the carrier." **Referee:** the targeting switch can never strand the Hollow One (fallback
  chain) and can never enter/rest on the warded Gate.
- **Presence (pure theatre):** it faces its target (rotates toward the next step); a half-second
  **lock-on** flourish when the target changes; tick/pulse deepens per Act; the fog leans toward it.

---

## D · CAUSAL LEGIBILITY — the systems

- **Beats (`beats: Beat[]`, ring buffer ~40).** `beat(G, {icon, cause, effect, tone, kind})` pushed at
  every cause point (grab, deliver, drop, catch, rescue, wisp, dark-eat-with-victims, event, act-change,
  gate-open, near-miss, escape). The prose `log` stays for the chronicle side panel; **beats** power (a)
  the transient **cause→effect banner** (newest, ~2.6s), (b) the **turn-log strip** (last 4, icon lines),
  and (c) the **Match Story** timeline (significant kinds). One structured source, three views.
- **Escape Checklist** (`EscapeChecklist.tsx`, always visible, diegetic drawn glyphs — no emoji):
  🏮 `lanternsDelivered/3` · 👥 `atGate/total` · 🔥 `lit/total` (each lights when satisfied). Answers
  "what do we still need?" in half a second.
- **Gate-opening moment:** new flash `gate-open` fired in `deliverAtGate` when delivered hits 3 → the
  Gate archway floods with light + rays + a swelling chord + a big beat "THE GATE OPENS." The missing
  win-explainer.
- **Honest forecast:** `darkForecastNextRound(G, n)` = the exact whole-tile bite next round; `fraying`
  marks exactly that many tiles and the Dark gauge reads "−N next round." Fully plannable.

---

## E · THE MATCH STORY — the recap (`MatchStory.tsx`, replaces GameOver's body)

- **Timeline:** the game's key beats as an illustrated strip, ending on the decisive one.
- **Ending tiers (named):** **FLAWLESS DAWN** (won, `!everWisped`) · **BY A BREATH** (won, dark ≤1 ring
  from the Gate *or* the final possible round) · **SWALLOWED** (loss) · **SO CLOSE** (loss, 3 delivered).
- **Numbers that matter (few):** rounds survived · tiles lost to the dark · catches · rescues · closest
  call. Tracked in `stats` counters, incremented at cause points.
- **Loss-teacher:** on defeat, name what killed the run (dominant failure: an unrecovered dropped Lantern
  + the round it fell / a torch collapse into Wisps / the Hollow One kept you off the Lanterns).
- **Play Again** (same heroes) + **Change Heroes** (back to select). **Referee:** Match Story renders for
  every ending type.
- State additions: `everWisped: boolean`, `stats: {catches, rescues, grabs, deliveries, darkEaten,
  closestRing}`, and lantern drop bookkeeping for the loss-teacher.

---

## F · THE PLANNABLE FUTURE

- **The Omen:** derive the next card from `G.deck` top; show a **face-down card with only its suit** —
  ☠ cruel (`dread`) · ✦ kind (`hope`) · ⚡ wild (`calm`). Telegraphed-but-uncertain (our thrill pattern).
- **What-if on hover/focus:** hovering a reachable tile shows a silent ghost: *"land here · N to a Lantern
  · in/out of the Hollow One's path."* Instant, optional; invisible to those who don't look. No perf hit
  (computed on hover only).
- **THE GRANDMASTER TEST (`scripts/playtest.ts`):** a second **smart bot** that plans 1–2 rounds ahead
  (protects/escorts bearers, pre-positions rescues, baits the Hollow One off carriers, avoids frayed
  tiles unless forced, refuels before guttering, reads the forecast + path). Print greedy vs smart
  win-rate per count and require **smart ≥ greedy + 15 pts** at the same tuning. Objective proof that
  skill — not luck — wins.

---

## G · UI-STATE MACHINE + interaction correctness (§7)

- **Formal turn phase** `turnPhase(G, ctx, myTurn) → 'watch' | 'roll' | 'move' | 'act' | 'resolving'`
  (pure). Exactly the right controls enabled per phase; everything else visibly disabled-with-reason;
  controls never flash / reorder / arrive late. A subtle "skip theatre" for the WATCH sequence.
- **UI-state tests (`scripts/uistate.ts`, vite-node):** for each phase, assert the enabled control set
  matches the contract (preRoll → only Roll; move/act → move + the single ③ action + End Turn; watch/not-
  your-turn → none). Button-sequence bugs become structurally impossible, like softlocks did.

---

## H · Edge cases the Referee MUST prove (invariant: always a legal action OR auto-resolve — never a softlock/crash)

*(v3 cases 1–11 remain binding — see the list below — plus Session-6 additions.)*
1. Torch → 0 mid-turn → Wisp; turn completes.
2. *All* players Wisps → drift to Gate, dark keeps eating, ends by dark-reaches-Gate (no hang).
3. No legal *move* (surrounded / stride 0) → **End Turn / Warm** still legal; turn passes.
4. A Lantern on a tile the dark eats → **swept one ring inward** (recoverable) — never lost.
5. Dark reaches the Gate mid-resolution → immediate clean **loss**.
6. 3rd Lantern delivered **and** dark reaches the Gate same resolution → **win checked first**.
7. Two players hit 0 torch simultaneously → both Wisp; no double-resolve.
8. Refresh / remount mid-turn → rehydrates; current player still has a legal action.
9. The Nightmare and the dark hit the same player the same round → resolves once, deterministic.
10. Carrying two Lanterns and getting caught → **both drop** (onto valid, non-void tiles).
11. `endTurn` always offered; `stepThrough` only when 3 delivered **and** every non-Wisp is on the Gate.
- **H12 (Unseen)** all non-Wisp players are Unseen → the Hollow One has no goal → idles (no crash).
- **H13 (Pitch targeting)** Act 2 with no bearer → falls back to nearest torch; with none → idles.
- **H14 (Ember-Hearted)** adjacency Relight (incl. across the Gate boundary) → legal, no softlock.
- **H15 (Match Story)** every ending type (FLAWLESS/BREATH/SWALLOWED/SO CLOSE) produces a valid recap.
- **H16 (UI-state)** every phase exposes exactly its contract's controls (via `scripts/uistate.ts`).
- **H17 (Gate-opening)** the `gate-open` beat fires exactly once, on the delivery that reaches 3.

## I · The tests that prove it works (run after EVERY workstream)
- `typecheck` + `build` clean; dev server **zero console errors** (`scripts/console-check.mjs`) — local AND prod.
- `npm run referee` green across all of §H (incl. H12–H17).
- `npm run playtest`: **win-rate 45–55%** per count **with random heroes in play**; per-hero spread **≤±8
  pts**; **nail-biters ≥70%**; **dead-turn ≈ 0**; **0 softlocks**; **Grandmaster gap ≥ +15 pts**.
- `npm run uistate` green (the interaction-state contract).
- **Fresh-Eyes agent** (screen only, no rules) states a correct action + consequence each turn, AND can
  answer "what does the team still need to win" from the Escape Checklist.
- **Certification pass:** a hostile-QA subagent plays the real build — 2p & 4p, every hero once, every
  ending type, tutorial + how-to + select + Match Story exercised, resize/refresh/sound/reduced-motion —
  **zero open defects = certified.**

## J · Workstreams (commit + checkpoint after each; Referee + Playtest re-run each time)
1. **WS1** ✅ baseline verified green; PLAN v4 + CLAUDE.md updated.
2. **WS2 Heroes** — `heroes.ts`; engine hooks; `HeroSelect.tsx`; visible cues; playtest w/ random heroes + per-hero spread; referee H12/H14.
3. **WS3 The Hollow One** — `nightmare.path`; Pitch bearer-hunting; act evolution + presence + name; referee H13; re-balance.
4. **WS4 Plannable future** — Omen suit; what-if hover; the **Grandmaster smart bot** + prove ≥15-pt gap; tune.
5. **WS5 Causal legibility** — beats + banner + turn-log strip; Escape Checklist; Gate-opening moment; honest forecast.
6. **WS6 Match Story** — moment/stats recorder; recap screen; ending tiers; loss-teacher; Play Again / Change Heroes; referee H15/H17.
7. **WS7 UI-state machine + tests** (`uistate.ts`, H16), final art/juice, performance, **finished onboarding** (scripted first turn + heroes how-to panel).
8. **WS8 Certification → ship** — Council + Fresh-Eyes + hostile-QA; README case study; deploy; LinkedIn + hackathon pitch.

## K · Senior calls locked
- **Everything additive.** No new engine; extend `GState` once (hero, beats, stats, everWisped, nightmare.path)
  then wire incrementally. The loved core (dark automa, Grab-refuels, Gate-sanctuary, sweep-outward,
  win-before-loss, `getTileAction` single source, Framer transform-not-attribute) is untouched.
- **Beats are one system, three views** (banner / strip / Match-Story) — no duplicate recorders.
- **Heroes are pure passive flags** — the only safe way to add identity without touching the turn or the
  softlock cures.
- **The Grandmaster gap is the north star of tuning** — the new legibility (forecast, full path, omen)
  and Pitch bearer-hunting are precisely what make foresight *pay*, so the gap should emerge from design.
