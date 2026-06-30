# RESEARCH_V2 — techniques behind *The Deepening*

> Synthesis of established design literature + the concrete patterns we are borrowing.
> Goal: compose proven work, don't reinvent it. Each section ends with **→ what we take.**

---

## 1 · Thrill & escalation — Jumanji / Zathura

The dread in *Jumanji* (1995) and *Zathura* comes from a board with **agency** that **pursues** the players:

- **"Do not begin unless you intend to finish."** The game cannot be abandoned; quitting is not safe. Commitment under threat is the core tension. *Zathura*'s tagline carries the same warning.
- **A shared doom clock.** *Jumanji*'s premise: the jungle consumes the town if the game isn't finished — everyone loses together if time runs out. (Adapted from the "Doomsday" framing of the property.)
- **Telegraphed-but-uncertain consequences.** Each roll reads a rhyming clue ("a tiny bite can make you itch, make you sneeze, make you twitch") — you know *something* is coming and roughly what, but not the exact severity. Anticipation > surprise.
- **Setbacks, not just damage.** The stampede/Rhino *drags a player physically backward* on the board. Losing ground hurts more than losing a number.
- **Each turn springs a new, escalating challenge** — the jungle gets worse the longer you play.

**→ what we take:** a Night clock everyone loses to; the Gloaming **telegraphs its next strike** (you see doom coming, severity uncertain); **snuffing a beacon = the Rhino** (yanked backward, the gut-punch); challenges escalate across three Acts.

---

## 2 · Easy to learn, hard to master

Four levers (the widely-taught "depth without complexity" heuristics; cf. Nintendo's design maxim, Bushnell's Law, and Burgun/Sirlin on depth-vs-complexity):

1. **Inherent Simplicity** — few rules, few exceptions. One verb beats five.
2. **Coherency** — rules relate to each other and to familiar real-world logic (light vs. dark, fire fends off night). No arbitrary glue.
3. **Progression** — introduce rules at the moment they're needed; *teach by playing*, not by reading.
4. **Communication** — the UI shows exactly what you *can* do and the *consequence* before you commit.

Exemplars: **Santorini** ("move, then build; reach level 3" — two verbs, deep), **Splendor** (take gems or buy a card), **Carcassonne** (draw, place, optionally claim).

**→ what we take:** collapse Light+Embers+5 actions into **one resource (Ember)** and **one decision (Brave or Steady)**. Position changes what Brave *does* — depth from a single verb. Tutorial teaches one concept per turn. Every action previews its cost/reward.

---

## 3 · The living board (automa pattern)

Solo/co-op games replace a human opponent with an **automa**: a rules-driven adversary that blocks you, competes for objectives, and **advances its own win condition**, forcing you to react to a *dynamic* threat (Scythe's Automa, GMT solo systems, the Automa Factory house style). Static puzzles get solved and go dull; a *responding* opponent stays tense.

**The key asymmetry:** a tabletop automa must stay dead simple because a *human* executes it by hand each turn. **Ours runs on the machine** — so the Gloaming can be genuinely cunning (target the beacon that most threatens its loss, seal the edge on your best route, stalk the most exposed player) at **zero player-side bookkeeping.** This is our unfair advantage; exploit it fully.

But cunning must stay **legible**: the automa **telegraphs intent**, then strikes. Players should feel *outwitted*, never *cheated*.

**→ what we take:** a telegraph→strike intent engine. The Gloaming picks the intent that hurts the party's current plan most, announces it, then executes next round unless countered.

---

## 4 · Calibrated juice

"Juice it or lose it" (Jonasson & Purho) and "The Art of Screenshake" (Vlambeer/JW Nijman): amplify feedback so every action feels significant — screenshake, bloom, particles, settle, sound. But over-juiced feedback **buries what matters mechanically** (both extremes hurt — CLAUDE §6). Tune so the *meaningful* beats (beacon lit, beacon snuffed, Ember→0, Night surge) are the loudest, and routine beats are quiet.

**→ what we take:** reserve the big juice (screenshake, full-board bloom/darken, stings) for the Act transitions, beacon ignite/snuff, and Wisp/Rekindle. Routine moves get small, crisp feedback.

---

## 5 · Implementation — boardgame.io (verified against repo + 0.50 patterns)

- **Move signature (0.50):** `({ G, ctx, events, random, playerID }, ...args)`. Mutate `G` (immer) or `return INVALID_MOVE`. Use the **`random` plugin** (`random.D6()`, `random.Die(n)`, `random.Shuffle`), never `ctx.random`.
- **Turn hooks:** `turn.onBegin` / `turn.onEnd` (we run the Gloaming in `onEnd`, idempotent-guarded). `events.endTurn()` to pass.
- **`endIf`** returns the gameover object (checked each move) — win checked before losses.
- **Secret State:** `playerView` strips other players' hidden fields + nulls `secret` (kept for the 4+ Marked).
- **Softlock-safety in-engine:** the only structural guarantee that can't regress is *"there is always a legal move."* We enforce it two ways: **Steady is always legal** (it only banks Ember), and a **Wisp's turn auto-resolves** (drift in `onBegin`, sole legal move `endTurn`).
- **Headless:** drive the real reducer via `vite-node` (Node ESM can't resolve bgio's exports-less subpaths). Sim reads per-seat views via `client.updatePlayerID(pid)`.

**→ what we take:** keep the proven lightweight pattern (flags in `G` gate legality; no heavy phases). Add the intent engine + Wisp handling inside existing hooks.

---

## 6 · Narrator (to re-verify before relying on it)

Current build: Vercel function → Google **Gemini 2.5 Flash** (free tier), key server-only, hand-authored fallback so the game runs keyless. **Model names/limits change often (CLAUDE §2) — verify the current free model + rate limits before the ship gate.** The narrator only *re-skins* a drawn card's prose; effects always stay the deck card's.

**→ what we take:** keep the architecture; the v2 omen content feeds the same re-skin contract. Verify model at WS7.

---

### Sources
MDA (Hunicke, LeBlanc, Zubek 2004) · Costikyan, *Uncertainty in Games* (2013) · *Jumanji* (1995) / *Zathura* design lore · Automa pattern (Scythe Automa, GMT solo, Automa Factory) · "Juice it or lose it" (Jonasson/Purho) · "The Art of Screenshake" (Vlambeer) · "easy to learn, hard to master" heuristics (Nintendo maxim, Bushnell's Law, Burgun/Sirlin on depth vs. complexity) · boardgame.io 0.50 docs.
