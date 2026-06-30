# PLAN — GLOAMING · Session 1 (Playable Vertical Slice)

> Goal: one complete game of GLOAMING, hotseat 2–4 players, start → win/lose, intentional art,
> hand-authored event deck (no AI narrator yet). Built on the decisions in `RESEARCH.md`.

---

## 0 · The fiction (so the mechanics mean something)

You are **Lanternbearers** crossing a world sinking into the **Gloaming** (eternal dusk). Light the
**3 Beacons**, then gather every survivor at the **Threshold** and cross — before the **Dread tide**
(night) drowns the map. The board is the antagonist: each turn it rises, drains your Light, and
twists the paths under your feet.

Target emotions (MDA, §6): **Tension** (the rising tide), **Discovery** (omens, the graph),
**Fellowship** (pooling embers, reviving), **Drama** (the dice + push-your-luck), **Fantasy** (the
living board).

---

## 1 · File / folder structure

```
src/
  main.tsx                  entry
  index.css                 Tailwind v4 + design tokens (DONE)
  App.tsx                   orchestrator: Setup ↔ Game ↔ GameOver; owns seat/handoff state
  game/
    constants.ts            all tuning knobs (dreadMax, AP, costs, caps) — one place
    types.ts                G, Node, Player, Beacon, EventCard, Choice, Effect (typed for S2 secret)
    board.ts                BOARD: nodes (id,x,y,type,neighbors) — hand-designed graph
    events.ts               OMEN_DECK: ≥18 hand-authored cards (Gift/Trap/Riddle/Bargain/Stalker)
    effects.ts              PURE helpers: applyEffect, gloamingStrike, dreadStrikeCount, win/lose check
    gloaming.ts             boardgame.io Game: setup, moves, turn{onBegin,onEnd}, endIf, playerView-ready
    client.ts               Client({ game, board, numPlayers, multiplayer: Local() })
  components/
    Board.tsx               SVG board: edges, nodes, beacons, threshold, tokens; hosts shake + overlay
    NodeMarker.tsx          one node (type-styled, reveal/corrupt/selectable states)
    Beacon.tsx              beacon node w/ ember progress + bloom on light
    PlayerToken.tsx         seat-colored pawn w/ light/ember mini-readout
    DreadTide.tsx           the meter (vertical tide) + full-board desaturate/darken overlay
    Dice.tsx                CSS-3D d6, deterministic landing, expo-out tumble + settle
    NarratorPanel.tsx       grimoire reveal of the active Omen + choice buttons (staggered)
    TurnHud.tsx             current seat, Stride/AP, Light/Embers, action buttons (move/gather/kindle/commune/steady/aid/useItem/pressOn/end)
    EventLog.tsx            scrolling turn/event log (the "story so far")
    HandoffScreen.tsx       "Pass to <Name>" interstitial, tap-to-reveal (hidden-info safe → S2)
    SetupScreen.tsx         player count + names + start
    GameOver.tsx            win/lose tableau
  audio/
    sound.ts                Howler manager; procedurally-synthesized WAV data-URIs (no asset files); mute toggle
  hooks/
    useShake.ts             tapered board screen-shake
    useGameSound.ts         fire SFX off G deltas
  ui/
    Button.tsx  Panel.tsx   token-driven primitives
scripts/
  playtest.ts               headless scripted playthrough → forces a WIN and a LOSS (the proof)
```

---

## 2 · `G` game-state shape (`types.ts`)

```ts
type NodeType = 'hearth' | 'hollow' | 'wellspring' | 'shrine' | 'beacon' | 'threshold';
interface BoardNode { id: number; x: number; y: number; type: NodeType; neighbors: number[]; }

interface Beacon { nodeId: number; embers: number; lit: boolean; }   // needs EMBERS_PER_BEACON to light

interface Player {
  id: string; name: string; seat: number;          // seat → color
  nodeId: number;                                   // position on the graph
  light: number; embers: number;                    // light = vitality (drained by Dread); embers = beacon fuel
  items: ItemId[];                                   // one-shot tools
  alive: boolean; dimmed: boolean;                   // dimmed = downed (light 0), revivable; !alive = Lost
  role?: Role;                                       // present-but-unused this session; S2 traitor uses it
}

interface GState {
  players: Record<string, Player>;
  nodes: BoardNode[];                                // working copy (edges can corrupt/shift)
  corruptedEdges: [number, number][];               // edges that cost +1 stride
  beacons: Beacon[];                                 // length 3
  beaconsLit: number;                                // derived cache 0..3
  thresholdId: number;
  dread: number; dreadMax: number;                   // THE clock
  deck: number[]; discard: number[];                 // indices into OMEN_DECK (shuffled)
  pendingEvent: { cardId: number } | null;           // set at turn start → gates all other moves
  // per-turn scratch (reset in turn.onBegin):
  stride: number; hasRolled: boolean; actionsTaken: number; pressOns: number; boardActed: boolean;
  lastRoll: number | null;                            // for dice animation
  log: LogEntry[];                                    // narrator/turn log
  secret: { /* empty this session; S2: markedPlayer, agenda */ };  // shaped now for playerView
  flash: { kind: string; nonce: number } | null;      // UI cue channel (shake/bloom triggers)
}
```

State is shaped so S2 drops in `playerView` (strip `secret` + other players' `role`) + `client:false`
role assignment with **zero refactor**.

---

## 3 · Core loop (boardgame.io moves) — learn in 30s, deep to master

**A turn (phase-less; gated by flags in `turn.onBegin`):**
1. **Omen** — `turn.onBegin` draws 1 card. Auto-cards apply immediately + log. Choice-cards set
   `G.pendingEvent`; **only `resolveOmen` is legal** until answered (Narrator panel shows it). → agency.
2. **`rollStride()`** — `random.D6()` → `G.stride`. Drives the dice animation. Once per turn.
3. **`moveTo(nodeId)`** — adjacent along an edge; costs 1 stride (2 if edge corrupted). Repeat while stride remains.
4. **ONE node action** (costs an action; budget = `1 + pressOns`):
   - `gather()` @wellspring → +2 embers **or** +2 light (player picks) — a real tradeoff.
   - `kindle(amount)` @beacon → deposit embers onto the beacon; lights at `EMBERS_PER_BEACON` (=3) → **bloom**.
   - `commune()` @shrine → draw an extra Omen now (risky boon: known distribution = reducible uncertainty).
   - `steady()` → +2 light (rest), anywhere. Costs tempo against the tide.
   - `aid(targetId, kind, amount)` @same node → give embers/light, or **revive** a dimmed ally (1 light).
   - `useItem(itemId)` → one-shot tool (Ward / Lantern-oil / Map-fragment).
5. **`pressOn()`** — push-your-luck: +1 action budget now, but **+1 Dread strike** at turn end. Cap 2.
6. **`endTurn()`** → `turn.onEnd`: **the Gloaming strikes**.

**`turn.onEnd` (idempotent — guard `if (G.boardActed) return`):**
- `strikes = baseStrikes + dreadStrikeCount(dread) + pressOns`  (baseStrikes = 1).
- The **tide always rises**: `dread += 1` (guarantees a knowable loss clock → reducible uncertainty/planning).
- Each *extra* strike runs one automatic board action via `gloamingStrike(G, random)`:
  drain 1 Light from the most-exposed alive player (lowest light) · corrupt a random edge · or `dread += 1`.
  Weighted so Dread climbs relentlessly and Light pressure forces hard routing. A player drained to 0 →
  `dimmed` (downed). A dimmed player struck again → `alive = false` (Lost).
- Emit `flash` cues (shake on dread tick, etc.).

**Items (one-shot, `undoable:false`):** `ward` (negate next light drain), `oil` (+2 embers), `mapfrag`
(uncorrupt/reveal an adjacent edge). Granted by some Gift omens.

**`chooseAction` mapping the brief asks for:** useItem → `useItem`, helpAlly → `aid`, pushLuck → `pressOn`. ✓

All RNG via the **`random` plugin**; irreversible moves (`resolveOmen`, `kindle`, `commune`, `useItem`,
`gather`) are `undoable:false`.

---

## 4 · Win / lose (`endIf`, **losses first**)

```ts
endIf({ G }) {
  const alive = Object.values(G.players).filter(p => p.alive);
  if (alive.length === 0)              return { winner: 'gloaming',      reason: 'all-lost' };
  if (G.dread >= G.dreadMax)           return { winner: 'gloaming',      reason: 'nightfell' };
  if (G.beaconsLit === 3 && alive.every(p => p.nodeId === G.thresholdId))
                                       return { winner: 'lanternbearers', reason: 'crossed' };
  // else continue
}
```
- **WIN:** 3 beacons lit **AND** every *alive* player standing on the Threshold.
- **LOSE:** Dread fills (night) — or all bearers Lost. (S2 adds: Marked completes secret agenda.)
- Threshold is **sealed** (entering does nothing meaningful) until `beaconsLit === 3` — shown in UI.

---

## 5 · The board graph (hand-designed, `board.ts`)

~15 nodes on a 1000×680 viewBox, irregular web (multiple routes = routing choice). Sketch:
- `0 Hearth` (start, bottom-center) → branches left/right/up.
- **3 Beacons** spread far apart (W, E, N) so the team must split or commit — fellowship vs. speed tension.
- **Wellsprings** near the mid-routes (refuel detours).
- **Shrines** off the optimal path (gamble for a boon).
- `Threshold` top-center, reachable only through a final corruptible bottleneck.
Explicit `neighbors[]` (no index math). Edges drawn from neighbor pairs; corrupted edges render frayed/violet.

---

## 6 · Event deck — ≥18 hand-authored Omens (`events.ts`)

Each: `{ id, type, title, narrator, choices: [{ label, outcome, effects[] }] }`. Effects are data
(`{kind:'light', amount:-1}`, `{kind:'corruptEdge'}`, `{kind:'grantItem', item:'ward'}`, …) applied by
the pure `applyEffect`. **≥18 across 5 types**, leaning on *reducible* uncertainty (the text tells you
enough to choose well):

- **Gift** (boon, small catch): *The Ember Cache* (+3 embers, +1 dread noise), *A Kind Stranger* (gain Ward), *Moonwell* (+2 light).
- **Trap** (loss unless prepared): *Sinkhole of Ash* (lose 2 light, or 0 if you hold Ward), *The Grasping Dark* (corrupt your edge), *Cold Snap* (−1 light all here).
- **Riddle** (think → reward): *The Three Doors* (choose Patience/Greed/Wisdom — Wisdom: +2 embers; Greed: +4 embers but +2 dread; Patience: +2 light), *The Tide's Question*, *Whisper of Names*.
- **Bargain** (trade): *The Pale Merchant* (give 2 light → −2 dread), *Borrowed Flame* (+3 embers now, −1 light next turn), *Oathstone* (lock 1 ember/turn → light a beacon remotely once).
- **Stalker** (the board hunts; tightening): *A Shape in the Fog* (+1 dread, move toward nearest corrupted node), *It Knows Your Name* (next light drain doubled), *The Long Pursuit* (dread +2).

≥4 of these will be single-"Continue" auto-narration with an immediate effect (used as turn-start auto
events and Gloaming flavor). Target ~22 cards so the deck doesn't loop within a game.

---

## 7 · Art / motion (tokens already in `index.css`)

- **Palette:** void/night/dusk/twilight/mist indigo-charcoal · ember-gold accents · dread blood-rose · parchment narrator · 6 seat colors. (DONE in tokens.)
- **Type:** Cinzel display / Spectral body. (Loaded.)
- **Dread tide:** vertical meter + a full-board `<feColorMatrix>`/overlay that **desaturates + darkens**
  proportionally to `dread/dreadMax` — the tension you *see*.
- **Dice:** CSS-3D cube, deterministic faces + extra spins, 1.1s expo-out, settle thunk (per RESEARCH §3).
- **Narrator reveal:** backdrop dim → card rise → held beat → blur-up body lines → choices (staggered).
- **Juice:** tapered 6–10px board-shake on Dread strike; slow ember **bloom** on beacon light; honor `prefers-reduced-motion`.

---

## 8 · Sound (`audio/sound.ts`)

Howler manager, **mute toggle**, lazy-init on first gesture (autoplay policy). SFX are **procedurally
synthesized WAV data-URIs** (no external asset files, no network): `dice` (noise clatter), `beacon`
(rising chord), `dread` (low sub hit), `ui` (soft tick), `ambient` (looping low drone). Fired from G
deltas via `useGameSound`.

---

## 9 · The proof (test) — `scripts/playtest.ts`, `npm run playtest`

Headless via **boardgame.io vanilla `Client` from `boardgame.io/client`** (real reducer, no React),
plus direct unit checks of the pure `effects.ts` helpers. Two scripted sequences assert:
- **WIN path:** force rolls/embers (seeded) → light 3 beacons → walk all players to Threshold → assert
  `client.getState().ctx.gameover.winner === 'lanternbearers'`.
- **LOSS path:** pass turns / press-on → drive `dread` to `dreadMax` → assert `winner === 'gloaming'`.
Run via `tsx`. Exit non-zero on failure. This is the slice's living proof it's winnable *and* losable.

---

## 10 · Edge cases to cover (Council will check)

- Move blocked when `pendingEvent` set; can't roll twice; can't act past budget; can't kindle without embers/wrong node.
- Dimmed player: skipped for active turn? → they may still be **revived** by an ally; on their own turn a dimmed
  player can only `steady`/`endTurn` (can't move/kindle). If revived, normal.
- Beacon over-kindle clamps at 3; lighting an already-lit beacon is INVALID_MOVE.
- `turn.onEnd` idempotency (no double dread).
- All players dimmed simultaneously → not auto-loss unless all become **Lost**; tide still rises → eventual loss.
- Threshold sealed until 3 lit; standing on Threshold early ≠ win.
- Hotseat: handoff hides the previous player's screen; `playerID` swaps to `ctx.currentPlayer`.
- Reduced-motion + mute paths don't break logic.
- numPlayers 2–4 all winnable & losable (dreadMax/strike scaling by count).

---

## 11 · Tuning first-pass (`constants.ts`, refined in playtest/Council)

`AP_BASE = 1` · `PRESS_ON_MAX = 2` · `STRIDE_DIE = 6` · `EMBERS_PER_BEACON = 3` · `LIGHT_START = 5` ·
`LIGHT_MAX = 7` · `EMBER_START = 1` · `GATHER_AMOUNT = 2` · `STEADY_LIGHT = 2` ·
`DREAD_MAX = 18 + 2*(numPlayers)` · `BASE_STRIKES = 1` · dread-strike thresholds at `dread ≥ 6` (+1) and `≥ 12` (+1).
Numbers exist to be tuned against the running build until it's tense-but-winnable.
