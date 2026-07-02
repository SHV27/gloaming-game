# CLAUDE.md — GLOAMING

> This file auto-loads every session. It is the constitution of this repo.
> Keep it tight. When a durable decision emerges, append it to **§11 Decisions / Gotchas** — do **not** bloat the rest.

---

## 0 · Prime Directive (the taste bar)

We are building **GLOAMING — "The Board That Plays Back"**: a browser board game (2–6 players)
where the board is a living, adversarial entity. The standard is **not "an AI made this."**
The standard is: *"a senior product designer was paid ₹2 lakh and shipped this."*

Three non-negotiables:
1. **First output = final output.** Think the whole problem through before writing. No live fumbling, no "draft then fix on screen."
2. **No AI slop.** Custom art, intentional palette/type/motion, calibrated juice. If it looks like a default template or a Bootstrap demo, it has failed.
3. **It must actually run and be fun.** A beautiful thing that doesn't play is worth zero.

If you ever catch yourself shipping the generic, default, or obvious version — stop and raise the bar.

> **THE DESIGN LAW (S5 — binding, supersedes any abstraction):**
> **THE MECHANIC AND THE FANTASY MUST BE THE SAME THING.** Every rule is a *physical thing the
> player can SEE happen on the board* (Jumanji: you roll, a lion appears, you run — no layer between).
> If a rule is a hidden number doing math, it has failed — replace it with a thing that moves, grows,
> shrinks, or gets eaten. **The world teaches itself** (BOTW/Portal: no rulebook, one concept at a
> time, learning *is* play) and **the first 60 seconds decide everything** (teach by playing, not
> reading). The game is **100% self-contained — no LLM/Gemini/AI at runtime.**

---

## 1 · The Operating Loop (mandatory, every non-trivial task)

**RESEARCH → PLAN → EXECUTE → REVIEW → SHIP.** Human is oversight at each gate, not typist.

- **RESEARCH** — Never build a feature blind. Study real references first (§2). Spawn a **read-only subagent** to investigate in an isolated context and report a summary back. Cite what you borrowed.
- **PLAN** — Enter plan mode. Write/refresh `PLAN.md`: goals, files to touch, edge cases, and the test that proves it works. Get the approach right *before* code.
- **EXECUTE** — Implement against the plan. Targeted edits. Keep the main context clean.
- **REVIEW** — Run **The Council** (§3). Fix the gaps. Re-review the deltas.
- **SHIP** — Pass the Definition of Done (§7). Commit with a clear message.

> Context is the fundamental constraint — performance degrades past ~40% full. Offload research and review to subagents so the main thread stays focused on building.

---

## 2 · Research Protocol (how we avoid slop)

Before building anything meaningful, gather real-world reference. **Compose proven work; don't reinvent it.**

- **Code/architecture** → study `boardgame.io` docs + its `examples/` folder, and its **Forbidden Desert clone** (a co-op escape board game — closest reference to our loop). Reuse state sync, phases, and Secret State; do not hand-roll them.
- **Game feel / UX / art** → study how polished web games stage reveals, animate dice, and build atmosphere. Extract concrete techniques (easing curves, layering order, sound cues), not vibes.
- **Anything unknown** → web search + read the primary source (official docs first, then high-signal repos/posts). For any live API, verify *current* model names and limits — they change often.
- When you borrow an idea, note it in the commit or PLAN.md: *"dice physics adapted from X."*

Do this research inside a subagent (separate context) and report back a tight summary. Don't pollute the build thread with raw exploration.

---

## 3 · The Council (multi-lens review — our quality engine)

Before finalizing any significant artifact (a feature, a screen, the core loop), run **three subagent reviews in parallel**, each read-only, each from one lens:

1. **🎲 The Game Designer** — Is it *fun*? Check against §6. Real uncertainty? Is the Night clock visible and tightening? Are choices meaningful? Feedback immediate? Flag where it's flat or solved-too-easily.
2. **🎨 The Art Director** — Does this look like a paid designer made it? Palette cohesion, type hierarchy, motion choreography, spacing, *calibrated* juice. Flag anything that reads as default/templated/stock.
3. **🛠 The Principal Engineer** — Correctness, edge cases vs PLAN.md, performance, zero console errors, no secrets in code, state integrity. Flag only gaps affecting correctness or stated requirements — **do not over-engineer** or add defensive code for impossible cases.
4. **⚖️ The Referee (turn-flow integrity — top priority).** Enumerate and **write automated tests** for every edge case, holding the hard invariant: **the current player always has at least one legal action OR the turn auto-resolves/auto-passes — never a softlock, never a crash** (torch→0→Wisp; all-Wisp; no legal move / surrounded by dark → End-Turn still legal; a Lantern on a tile the dark eats → swept inward, recoverable; the dark reaching the Gate mid-turn → clean loss; Nightmare + dark hitting the same player same round; 3rd Lantern delivered + Gate eaten same resolution → **win first**; refresh/remount; carrying two Lanterns and getting caught → both drop). Each case has a passing test. See `PLAN.md` §H.
5. **🎮 The Playtester / Fun-Evaluator.** A **headless simulator** plays many full games and reports: average length (~20–30 min equiv), **win-rate band ~45–55%** per player count, comeback frequency, nail-biter-finish rate, and **dead-turn rate (≈0)** (rescuable-Wisp drifts may be excluded — dramatic, not empty). Then a gut-check: *"would a 10-year-old be on the edge of their seat? where does it drag?"* Run the §4 loop (propose tuning → simulate → critique → refine) until numbers **and** gut-check pass.
6. **🔍 The Fresh-Eyes Teacher (does the game teach itself? — critical).** A subagent shown *only the screen state each turn, with NO rules given*, that must state "what can I do right now, and why, and what will happen if I do it." If a blind agent can't play correctly from the screen alone, the affordances/legibility have **failed** and must be fixed. This is the objective test of the design law (§0): legible on sight, no reading required.

Then **synthesize** into one priority-ranked list (file + line + fix), apply fixes, re-review the deltas. A reviewer asked to find gaps always finds some; treat taste/correctness gaps as real and the rest as optional. **Referee findings are never optional.**

---

## 4 · The Auto-Research Loop (for hard/creative problems)

When a problem is open-ended (game balance, "make this screen feel magical", narrator quality), iterate to quality instead of one-shotting:

**PROPOSE** a version → **CRITIQUE** (the fitting Council lens) → **VERIFY** against real references *and* the actual running build/playtest → **REFINE.**
Repeat until the bar (§0) is met or a sane iteration budget is hit. One agent builds; a fresh agent finds what's wrong with it. That separation is where quality comes from.

*(This is the "agentic engineering" loop the field converged on — research/plan/execute/review with the model as worker and you as oversight. We implement it literally.)*

---

## 5 · Subagent & Token Discipline

- **Use subagents** for research, codebase investigation, and Council reviews. Give them **read-only** tools; the parent agent does all Edit/Write/Bash so approval flows stay clean.
- Persona helps: a subagent told "you are a senior art director" reviews better than a generic one.
- **Token economy:** plan before spending. Don't re-read unchanged files. Batch related edits. No redundant exploration. Every token moves the build forward.
- Keep the main context lean — summarize and offload aggressively.

---

## 6 · Game Design Principles (design *with* these, not by vibes)

- **MDA:** design backward — target **Aesthetics → Dynamics → Mechanics.** Our target emotions: **Tension, Discovery, Fellowship, Drama, Fantasy.**
- **Uncertainty (Costikyan) is the thrill engine.** Layer it: randomness (dice), solver's uncertainty (push-your-luck), player unpredictability (hidden Marked role), narrator surprise. Bias toward **reducible** uncertainty players can *investigate* — that drives curiosity.
- **Flow / GameFlow:** clear goal, challenge matched to skill, constant feedback, immersion, social interaction. **Make time visible** — the Dread tide must be felt tightening. That is the tension.
- **Juice — calibrated.** Amplify feedback (dice clatter, beacon bloom, screen-shake on Dread strikes, sound) so actions feel significant — but *not so much* that players can't tell what matters mechanically. Both extremes hurt.
- **Rules simple, gameplay deep.** A new player understands a turn in 30 seconds; mastery takes many games.
- **The game teaches itself.** An interactive in-world tutorial runs before first play (skippable).

---

## 7 · Definition of Done (ship gate)

- [ ] `npm run build` and `npm run typecheck` pass; dev server runs with **no console errors**.
- [ ] The feature is actually playable end-to-end by a human (not just "compiles").
- [ ] Responsive (desktop + tablet); no layout breakage; no overflow clipping.
- [ ] Design tokens consistent (palette, type scale, spacing, motion) — no rogue inline hex.
- [ ] **No secrets in code or git.** `.env*` is gitignored. (§8.)
- [ ] Council pass applied; PLAN.md edge cases covered.
- [ ] Commit message states what changed and why.

---

## 8 · Security (hard rule — never violate)

- **Secrets live only in the shell environment / Vercel project env vars.** Never in this file, never in committed code.
  - Local: `export VERCEL_TOKEN=...` in the shell before running. (No runtime secret exists anymore — the AI narrator is deleted.)
  - Production: set the deploy token in the Vercel project's Environment Variables.
- `.gitignore` must include `.env`, `.env.*`, `.vercel`, `node_modules`, and `dist`.
- Treat any secret that has appeared in plaintext anywhere as compromised — rotate it.

---

## 9 · Stack & Commands (pinned)

- **App:** Vite + React + TypeScript
- **Game engine:** `boardgame.io` (local/hotseat multiplayer first — zero backend, instant deploy)
- **Style/motion/sound:** Tailwind CSS, Framer Motion, Howler.js
- **Events:** hand-authored **illustrated cards** (icon + ≤4 words + a visible board effect). **No LLM/AI at runtime** — the game is 100% self-contained (the S5 AI narrator was deleted).
- **Deploy:** Vercel (static). **Repo:** GitHub via `gh`.

```
npm run dev         # local dev
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run preview     # preview the build
```

---

## 10 · Project Facts

- **Title:** GLOAMING — *Trapped Inside* (S5 reconception of *The Board That Plays Back*).
- **Players:** 2–6 (hotseat / pass-and-play).
- **Goal:** carry the **3 Lanterns** to the **Gate** (center) and get **everyone out together** before
  the **dark** eats the board inward and reaches the center. Don't let your **torch** go out, don't get
  caught by the **Nightmare**, don't leave anyone behind.
- **Lose:** the dark reaches the Gate (the center falls) — everyone is swallowed.
- **Hook:** you're trapped inside a board game; the board is a physical, visible antagonist that
  eats itself toward you — every rule is a thing you watch happen.

---

## 11 · Decisions / Gotchas (append-only log — keep entries one line)

- `2026-06-29` — Hotseat-first chosen over networked multiplayer to keep deploy zero-backend.
- `2026-06-30` — boardgame.io 0.50: destructured move sig `({G,ctx,events,random,playerID},...)`; mutate G (immer) / `return INVALID_MOVE`; use the `random` plugin, NOT `ctx.random`.
- `2026-06-30` — GOTCHA: `vite.config` needs `define:{global:'globalThis'}` or boardgame.io crashes ("global is not defined"). Never import `boardgame.io/server` into the browser bundle.
- `2026-06-30` — GOTCHA: run headless scripts via `vite-node` (Vite resolver). `tsx`/Node ESM can't resolve boardgame.io's exports-less subpaths (`/client`, `/core`, `.jsx` sources).
- `2026-06-30` — Hotseat handoff = ONE `Client`, swap the `playerID` prop behind `HandoffScreen`; Board↔App communicate via `ShellContext` (Client() doesn't forward extra props). Keeps S2 hidden-info safe.
- `2026-06-30` — The Gloaming "plays back" in an idempotent `turn.onEnd` (guard `G.boardActed`). Dread always +1/turn; harmful strikes ramp at ratio thresholds [.33,.6,.85]; drain prob & amount scale with dread.
- `2026-06-30` — `checkGameover` checks WIN before losses: a party that crosses on the turn-end the tide peaks has escaped.
- `2026-06-30` — Balance via headless sim (`npm run playtest`, real reducer): ~30% greedy-bot win (≈45–55% human), all-lost the dominant loss. Dimmed bearers get a one-strike `graced` buffer; `EMBERS_PER_BEACON=4` forces ember pooling. S2 to formalize the band.
- `2026-06-30` — SFX are procedurally-synthesized WAV data-URIs played via Howler (no asset files); init on first user gesture (autoplay policy). Mute persisted to localStorage.
- `2026-06-30` — Board art: drawn SVG sigils (never Unicode glyphs), per-type radial-gradient node fills + `#soft` glow, curved/seeping edges. All board color via tokens — no rogue hex.
- `2026-06-30` — S2 hidden role: `setup` marks one seat (master RNG); **`playerView` strips every other player's `role` + nulls `secret.markedId`**; hotseat re-filters on `playerID` swap. NEVER add a per-player tell to the shared HUD (the "·marked" tag was a leak — removed). RoleReveal/Sow render only when `playerID===currentPlayer`.
- `2026-06-30` — S2 Marked is excluded from the win count (true bearers must reach the Threshold) so it can't stall — it must race Dread up. `checkGameover`: if only the Marked is alive ⇒ marked-triumph (no dead-walk). Counterplay = one-per-game **Cast Out** (right: −4 Dread + Sow silenced; wrong: +4 Dread).
- `2026-06-30` — S2 Narrator: AI only RE-SKINS a drawn card's prose (`{title,narration,choices[]}`); **effects always stay the deck card's** (client maps `card.choices[i].effects`, validates shape/count, else uses original). Key server-only in `api/narrate.ts`; function ALWAYS returns 200+`source` (never throws); client falls back + session-disables after repeated misses. Fully playable keyless.
- `2026-06-30` — S2 GOTCHA: `api/` (Vercel functions) is outside `tsconfig`/src, so not in `npm run build`/`typecheck` — Vercel builds it. Run the AI narrator locally with `vercel dev`; plain `vite dev` 404s `/api/narrate` → silent fallback. Balance sim drives per-seat views via `client.updatePlayerID(pid)` to read each bot's own role.
- `2026-06-30` — S3 atmosphere lives INSIDE the board `<svg>` (`Atmosphere.tsx`: sky/dawn/ridges/Hearth-glow/stars/fog) so it shares the Dread desaturation filter + coordinate space. The Dread "veil" (darken+cool+vignette+heartbeat) is a DOM overlay over the board. Tune both together — they can double-darken.
- `2026-06-30` — S3 GOTCHA: verify UI by driving headless Chrome (`scripts/shot.mjs` via `puppeteer-core`, executablePath = installed Chrome). Atmosphere was nearly invisible (black-on-black) until tokens were brightened against the screenshots — never trust visual code unseen.
- `2026-06-30` — S3 perf: the heavy game (boardgame.io + board UI) is `React.lazy`-loaded via `GameMount` behind `<Suspense>` so the landing paints light. `ErrorBoundary` wraps the app. Sound is procedurally-synth WAV — no audio assets.
- `2026-06-30` — SHIPPED to Vercel: project `shv-s-projects/gloaming`, prod alias `https://gloaming-murex.vercel.app`. GOTCHA: Vercel CLI needs `--scope shv-s-projects` and a lowercase `--project gloaming` (dir name `GLOAMING2` is invalid). Secrets via shell env / Vercel env vars only — never a file. `api/narrate.ts` needs `declare const process` (no `@types/node` in scope).
- `2026-07-01` — S4 balance/GOTCHAs (tuned via `npm run playtest` on the real reducer): the Gloaming acts EVERY player-turn, so per-turn mechanics hit harder per ROUND as player count grows — normalize them (snuff cooldown = `SNUFF_COOLDOWN * numPlayers` turns ≈ 1/round; `nightMaxFor` scales with n to hold ~round-count). SNUFF only crushes a LIT beacon in **Pitch** (Act 2); in Dusk/Gloaming it claws unlit progress only — otherwise beacons can never be *banked* and the party can't hold 3. Kindle is bounded (`KINDLE_MAX`) and keeps your last ember (`KINDLE_KEEP`) so pouring into a beacon can't self-Wisp you. Shipped v2 win-rate 2p/3p ~47%, 4p ~30% (4p still too hard — WS5b follow-up). Verify UI has **0 console errors** via `scripts/console-check.mjs` before shipping (caught a framer SVG `cx`-undefined bug — animate the `x` TRANSFORM, never the `cx` ATTRIBUTE).
- `2026-07-01` — **SHIPPED v2 to prod** (`gloaming-murex.vercel.app`). Vercel CLI had a stored login (no token needed); `.vercel/project.json` links `shv-s-projects/gloaming`. `VERCEL_TOKEN` is NOT in the tool's non-interactive shell even if exported interactively — check `vercel whoami` / the linked project instead.
- `2026-06-30` — **S4 GRAND OVERHAUL (*The Deepening*) — design pillars now binding (full spec `PLAN.md`):** (1) **single resource Ember** (life+fuel+currency); **0 → Wisp** (auto-drifts toward Hearth, Rekindle-able, cannot Brave) = the structural softlock cure + the simplification. No permadeath — Wisp is the floor. (2) Turn = **Roll → Move → place reacts → Brave or Steady → Gloaming acts**; **Steady is ALWAYS legal** (banks Ember) so a turn can never dead-end. (3) The Gloaming is a **telegraph→strike cunning automa** (SURGE/SEAL/STALK/SNUFF) — it runs on the machine, so it can be smart at zero player bookkeeping; always legible (shows its next intent). (4) **Beacons are a tug-of-war** (snuffable). (5) **3 Acts** Dusk→Gloaming→Pitch escalate the Night clock + Gloaming powers. Win = all non-Wisp on Threshold w/ 3 lit; Lose = Night fills. Two new Council lenses added (§3): **⚖️ Referee** (softlock invariant, automated edge-case tests — never optional) and **🎮 Playtester** (headless fun metrics: length, win-rate 45–55%, comebacks, dead-turn≈0).
- `2026-07-01` — **S5 THE RECONCEPTION (*Trapped Inside*) — v2 was a euro-puzzle wearing a horror coat; rebuilt around the DESIGN LAW (§0): mechanic = fantasy, every rule a THING YOU SEE.** (1) **THE DARK** = the doom clock, made spatial: it eats the outermost tiles inward each round (telegraphed by `fraying`), herding everyone to the center — replaces the Night meter entirely; loss = it reaches the **Gate** (center). (2) **THE TORCH** = life as a shrinking flame; 0→**Wisp** (drifts to Gate, Relight-able) = softlock cure; refuels at a **Lantern** (grab = a light source) or the Gate. (3) **THE LANTERNS** = 3 physical objects you **carry** (−1 stride each), **drop** when caught/eaten (swept inward, recoverable), **deliver** to the Gate. (4) **THE NIGHTMARE** = one piece that steps toward the nearest torch each round (glowing next-step footprint); catch → drop + knockback + torch snuff. (5) **EVENTS** = illustrated cards (icon + ≤4 words + visible effect) — no prose, **no LLM**. Win = all non-Wisp on the Gate with 3 delivered → step through together. **Board = concentric-ring graph** (rings 1·6·12·12; the dark eats ring-by-ring inward; Act = deepest surviving ring). New Council lens **🔍 Fresh-Eyes** (blind agent plays from the screen alone). AI narrator + `api/narrate.ts` DELETED.
- `2026-07-01` — S5 engine v3 GOTCHAS: world reacts in `turn.onEnd` (guard `boardActed`) — dark/Nightmare pace via **accumulators** (`darkCharge/nmCharge += perRoundRate/numPlayers`, resolve whole units) so pace is constant across player counts; **one Event per round** at `ctx.playOrderPos===numPlayers-1`. **Grab refuels the torch** — this IS the torch economy (without it players gutter out → 5% win-rate). Delivered Lanterns slow the dark near the Gate (`darkSlowdownFor`) so the final gather is winnable. `getTileAction` is the SINGLE ③-button source (HUD + moves share it). Balanced via `npm run playtest`: 2p 53% / 3p 57% / 4p 54%, 0 softlocks/300 games.
- `2026-07-02` — **S5 SHIPPED (Council-reviewed).** UI ported to the visible model (Board = rings + devouring void `tornPath` + shrinking island glow; TurnHud ①②③; illustrated EventCards; SHV splash + how-to). **THE GATE IS SANCTUARY**: the Nightmare can't enter it or hit a bearer standing on it (`nearestTorchGoals` excludes gate players; nightmare BFS blocks the gate) — this fixed the endgame + moved tension to the field; a catch now shoves you OUTWARD (`sweepOutward`) + snuffs 2 torch (was a toothless −1 inward = the "turtle" bug the Game-Designer lens caught). Council/Fresh-Eyes drove: devour-not-vanish void art, event effect-hints, a live N/3 goal counter, a legible Dark gauge. Re-balanced: **2p 45% / 3p 53% / 4p 52%**, nail-biters 74–87%, 0 softlocks/450. Framer footgun re-confirmed: animate `scale` not the `r` attribute. Deploy token is NOT in the automated shell (`vercel --prod` needs an interactive `VERCEL_TOKEN` / stored login).
