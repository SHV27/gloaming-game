import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { BoardProps } from 'boardgame.io/react';
import type { GState, BoardNode } from '../game/types';
import { BOARD_W, BOARD_H, EDGES } from '../game/board';
import { SEAT_COLORS, TORCH_MAX, LANTERN_COUNT } from '../game/constants';
import { reachable as reachableWithin, isVoid, lanternOnNode } from '../game/effects';
import { boardFilter, DarkColumn } from './DreadTide';
import { TurnHud } from './TurnHud';
import { EventLog } from './EventLog';
import { HandoffScreen } from './HandoffScreen';
import { MatchStory } from './MatchStory';
import { RoleReveal } from './RoleReveal';
import { Atmosphere } from './Atmosphere';
import { TopBar } from './TopBar';
import { BeatBanner } from './Beats';
import { useGameSound } from '../hooks/useGameSound';
import { sound } from '../audio/sound';
import { useShell } from './shell';

/** A gently curved path between two nodes so routes feel walked, not plotted. */
function edgePath(ax: number, ay: number, bx: number, by: number, seed: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const off = (seed % 2 ? 1 : -1) * Math.min(20, len * 0.07);
  const cx = mx + (-dy / len) * off;
  const cy = my + (dx / len) * off;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

/** A jagged, torn hole — deterministic per seed so it doesn't jitter each render. */
function tornPath(cx: number, cy: number, r: number, seed: number): string {
  const pts = 10;
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0), s / 0xffffffff);
  let d = '';
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (0.62 + rnd() * 0.55);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d + 'Z';
}

/** BFS path (list of steps after `from`) over surviving tiles toward `to`. */
function pathTo(G: GState, from: number, to: number): number[] {
  if (from === to) return [];
  const prev = new Map<number, number>();
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of G.nodes[cur].neighbors) {
      if (seen.has(n) || isVoid(G, n)) continue;
      seen.add(n);
      prev.set(n, cur);
      if (n === to) {
        const out: number[] = [];
        let x: number | undefined = to;
        while (x !== undefined && x !== from) {
          out.unshift(x);
          x = prev.get(x);
        }
        return out;
      }
      q.push(n);
    }
  }
  return [];
}

export function GloamingBoard(props: BoardProps<GState>) {
  const { G, ctx, moves, playerID } = props;
  const shell = useShell();
  useGameSound(G.flash);

  const shake = useAnimationControls();
  const lastStrike = useRef(-1);
  const reduce = !!useReducedMotion();

  // tapered board shake when the dark bites / the Nightmare strikes / an Act turns
  const IMPACT = new Set(['dark-eat', 'nightmare', 'snuff', 'act-change']);
  useEffect(() => {
    if (!G.flash || !IMPACT.has(G.flash.kind)) return;
    if (G.flash.nonce === lastStrike.current) return;
    lastStrike.current = G.flash.nonce;
    const hard = G.flash.kind === 'snuff' || G.flash.kind === 'act-change';
    shake.start({
      x: [0, hard ? -9 : -6, hard ? 8 : 5, -4, 3, 0],
      y: [0, hard ? 5 : 3, -3, 2, -1, 0],
      transition: { duration: hard ? 0.5 : 0.4, ease: 'easeOut' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G.flash, shake]);

  const myTurn = playerID === ctx.currentPlayer && !ctx.gameover;
  const me = playerID ? G.players[playerID] : undefined;
  const total = G.nodes.length;
  const darkRatio = Math.min(1, G.dark.length / total);

  // win/lose sting (once)
  const stungRef = useRef(false);
  useEffect(() => {
    if (ctx.gameover && !stungRef.current) {
      stungRef.current = true;
      sound.play(ctx.gameover.winner === 'bearers' ? 'win' : 'lose');
    }
  }, [ctx.gameover]);

  // dread heartbeat quickens as the dark nears the center
  useEffect(() => {
    if (reduce || ctx.gameover || darkRatio < 0.45) return;
    const interval = Math.max(680, 1850 - darkRatio * 1250);
    const id = setInterval(() => sound.play('heartbeat'), interval);
    return () => clearInterval(id);
  }, [darkRatio, reduce, ctx.gameover]);

  // The Marked's private one-time reveal (dormant scaffolding; never the prev player).
  const [ackedMarked, setAckedMarked] = useState<Record<string, boolean>>({});
  const showRoleReveal = myTurn && me?.role === 'marked' && !!playerID && !ackedMarked[playerID];

  // players grouped by node (so co-located tokens fan out)
  const byNode = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const p of Object.values(G.players)) {
      const arr = m.get(p.nodeId) ?? [];
      arr.push(p.id);
      m.set(p.nodeId, arr);
    }
    return m;
  }, [G.players]);

  // tiles the active bearer can reach right now (the gold glow)
  const reachable = useMemo(() => {
    if (!myTurn || !me || me.wisp || G.autoWisp || !G.hasRolled || G.acted) return new Set<number>();
    return reachableWithin(G, me.nodeId, G.stride);
  }, [myTurn, me, G]);

  const walkTo = (nodeId: number) => {
    if (!myTurn || !me || !reachable.has(nodeId)) return;
    for (const step of pathTo(G, me.nodeId, nodeId)) moves.moveTo(step);
  };

  // the Hollow One's gaze angle — it turns to look at its next footfall
  const nmGaze = useMemo(() => {
    const from = G.nodes[G.nightmare.nodeId];
    if (G.nightmare.nextNodeId == null) return 0;
    const to = G.nodes[G.nightmare.nextNodeId];
    return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  }, [G.nightmare, G.nodes]);

  // what-if on hover: the silent ghost of a move (depth for those who look)
  const [hover, setHover] = useState<number | null>(null);
  const whatIf = useMemo(() => {
    if (hover == null || !reachable.has(hover)) return null;
    const n = G.nodes[hover];
    const lanternNodes = G.lanterns.filter((l) => !l.delivered && l.carriedBy === null && l.nodeId != null).map((l) => l.nodeId!);
    let lDist: number | null = null;
    if (lanternNodes.length) {
      const goal = new Set(lanternNodes);
      const seen = new Set([hover]);
      let frontier = [hover];
      let d = 0;
      while (frontier.length && d <= 30) {
        if (frontier.some((x) => goal.has(x))) { lDist = d; break; }
        const next: number[] = [];
        for (const c of frontier) for (const m of G.nodes[c].neighbors) if (!seen.has(m) && !isVoid(G, m)) { seen.add(m); next.push(m); }
        frontier = next;
        d++;
      }
    }
    return {
      x: n.x,
      y: n.y,
      onGate: hover === G.gateId,
      lDist,
      inPath: G.nightmare.path.includes(hover) || G.nightmare.nextNodeId === hover,
      frayed: G.fraying.includes(hover),
    };
  }, [hover, reachable, G]);

  const handoffNeeded = !ctx.gameover && playerID !== ctx.currentPlayer;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-void text-parchment">
      <TopBar G={G} />

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-2">
        {/* the dark gauge */}
        <div className="w-12 py-2">
          <DarkColumn eaten={G.dark.length} total={total} act={G.act} forecast={G.fraying.length} />
        </div>

        {/* the board */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center">
          {/* cause→effect beat banner */}
          <BeatBanner beats={G.beats} />
          {/* the Gate throwing open — the win-explainer moment */}
          <GateOpenFlood flash={G.flash} />
          <motion.div animate={shake} className="relative h-full w-full">
            <svg
              viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
              className="h-full w-full"
              style={{ filter: boardFilter(G.dark.length, total), transition: 'filter 900ms ease' }}
            >
              <defs>
                <radialGradient id="nd-tile" cx="42%" cy="38%" r="72%">
                  <stop offset="0%" stopColor="var(--color-node-hollow-core)" />
                  <stop offset="100%" stopColor="var(--color-node-hollow-rim)" />
                </radialGradient>
                <radialGradient id="nd-gate" cx="42%" cy="38%" r="78%">
                  <stop offset="0%" stopColor="var(--color-ember-glow)" />
                  <stop offset="45%" stopColor="var(--color-ember)" />
                  <stop offset="100%" stopColor="var(--color-ember-deep)" />
                </radialGradient>
                <radialGradient id="nd-void" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#0a0710" />
                  <stop offset="70%" stopColor="var(--color-void)" />
                  <stop offset="100%" stopColor="#000" />
                </radialGradient>
                <radialGradient id="lantern-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-ember-bright)" />
                  <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
                </radialGradient>
                {/* the surviving island of warmth — shrinks as the dark eats in */}
                <radialGradient id="island" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.34" />
                  <stop offset="45%" stopColor="var(--color-ember-deep)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
                </radialGradient>
                {/* corruption that bleeds off every eaten tile */}
                <radialGradient id="rot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-dread)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="var(--color-dread-deep)" stopOpacity="0" />
                </radialGradient>
                <filter id="soft" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="7" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <Atmosphere ratio={darkRatio} reduce={reduce} />

              {/* the shrinking island of light — its radius contracts as the dark wins.
                  Animate the scale TRANSFORM (never the r attribute). */}
              <motion.circle
                cx={BOARD_W / 2}
                cy={BOARD_H / 2}
                r={510}
                fill="url(#island)"
                pointerEvents="none"
                style={{ transformOrigin: `${BOARD_W / 2}px ${BOARD_H / 2}px` }}
                animate={{ scale: (150 + (1 - darkRatio) * 360) / 510 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />

              {/* torch-light each bearer casts (a Wisp's gutters low) */}
              {Object.values(G.players).map((p) => {
                const node = G.nodes[p.nodeId];
                return (
                  <circle
                    key={`ll-${p.id}`}
                    cx={node.x}
                    cy={node.y}
                    r={p.wisp ? 14 : 20 + (p.torch / TORCH_MAX) * 26}
                    fill={SEAT_COLORS[p.seat]}
                    opacity={p.wisp ? 0.04 : 0.09}
                    style={{ filter: 'url(#soft)', transition: 'r 600ms ease, opacity 600ms ease' }}
                  />
                );
              })}

              {/* edges — dead if either end is void */}
              {EDGES.map(([a, b]) => {
                const na = G.nodes[a];
                const nb = G.nodes[b];
                const dead = isVoid(G, a) || isVoid(G, b);
                const lit = !!me && ((me.nodeId === a && reachable.has(b)) || (me.nodeId === b && reachable.has(a)));
                const d = edgePath(na.x, na.y, nb.x, nb.y, a * 17 + b);
                return (
                  <path
                    key={`${a}-${b}`}
                    d={d}
                    fill="none"
                    stroke={dead ? 'var(--color-void)' : lit ? 'var(--color-ember)' : 'var(--color-edge)'}
                    strokeWidth={lit ? 3 : 2}
                    strokeLinecap="round"
                    strokeOpacity={dead ? 0.25 : lit ? 0.95 : 0.5}
                    style={lit ? { filter: 'drop-shadow(0 0 4px var(--color-ember))' } : undefined}
                  />
                );
              })}

              {/* nodes */}
              {G.nodes.map((n) => (
                <NodeView
                  key={n.id}
                  node={n}
                  G={G}
                  reachable={reachable.has(n.id)}
                  reduce={reduce}
                  onPick={() => walkTo(n.id)}
                  onHover={setHover}
                />
              ))}

              {/* the Hollow One's telegraphed route ahead (chess-legible menace) */}
              <NightmarePath G={G} reduce={reduce} />

              {/* player tokens */}
              {Object.values(G.players).map((p) => {
                const node = G.nodes[p.nodeId];
                const group = byNode.get(p.nodeId) ?? [p.id];
                const idx = group.indexOf(p.id);
                const fan = group.length > 1 ? 18 + group.length * 4 : 0;
                const angle = (idx / Math.max(1, group.length)) * Math.PI * 2 - Math.PI / 2;
                const ox = fan ? Math.cos(angle) * fan : 0;
                const oy = fan ? Math.sin(angle) * fan : 0;
                return (
                  <PlayerTokenView
                    key={p.id}
                    x={node.x + ox}
                    y={node.y + oy}
                    color={SEAT_COLORS[p.seat]}
                    name={p.name}
                    torch={p.torch}
                    carrying={p.carrying.length}
                    showName={group.length <= 2 || p.id === ctx.currentPlayer}
                    wisp={p.wisp}
                    isCurrent={p.id === ctx.currentPlayer}
                  />
                );
              })}

              {/* the Hollow One — evolves with the Acts, turns to look at its quarry */}
              <NightmareToken
                x={G.nodes[G.nightmare.nodeId].x}
                y={G.nodes[G.nightmare.nodeId].y}
                act={G.act}
                targetId={G.nightmare.nextNodeId}
                gazeAngle={nmGaze}
                reduce={reduce}
              />

              {/* what-if: the silent ghost of the hovered move */}
              {whatIf && (
                <g pointerEvents="none" transform={`translate(${whatIf.x}, ${whatIf.y - 42})`}>
                  <rect x={-58} y={-19} width={116} height={34} rx={6} fill="var(--color-night)" fillOpacity={0.94} stroke="var(--color-haze)" strokeWidth={1} />
                  <text x={0} y={-5} textAnchor="middle" fontSize={10} className="font-display" fill="var(--color-ember-bright)">
                    {whatIf.onGate ? 'The Gate' : whatIf.lDist != null ? `${whatIf.lDist} to a Lantern` : 'you land here'}
                  </text>
                  <text
                    x={0}
                    y={9}
                    textAnchor="middle"
                    fontSize={9}
                    className="font-body"
                    fill={whatIf.frayed || whatIf.inPath ? 'var(--color-dread-bright)' : 'var(--color-fog)'}
                  >
                    {whatIf.frayed ? 'the dark eats this next' : whatIf.inPath ? "in the Hollow One's path" : 'safe for now'}
                  </text>
                </g>
              )}
            </svg>
          </motion.div>

          {/* the void veil — the dark closing in, heartbeat that quickens */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{ boxShadow: 'inset 0 0 220px 60px var(--color-void)' }}
              animate={
                reduce
                  ? { opacity: 0.3 + darkRatio * 0.5 }
                  : { opacity: [0.3 + darkRatio * 0.3, 0.3 + darkRatio * 0.6, 0.3 + darkRatio * 0.3] }
              }
              transition={
                reduce ? undefined : { duration: Math.max(0.62, 2.3 - darkRatio * 1.5), repeat: Infinity, ease: 'easeInOut' }
              }
            />
          </div>
        </div>

        {/* log + roster */}
        <div className="hidden w-72 shrink-0 py-2 lg:block">
          <EventLog G={G} currentPlayer={ctx.currentPlayer} />
        </div>
      </div>

      {/* HUD */}
      <TurnHud props={props} myTurn={myTurn} onWalk={walkTo} reachableCount={reachable.size} />

      {/* hotseat handoff */}
      <AnimatePresence>
        {handoffNeeded && (
          <HandoffScreen
            name={shell.names[Number(ctx.currentPlayer)] ?? G.players[ctx.currentPlayer]?.name ?? 'next bearer'}
            color={SEAT_COLORS[G.players[ctx.currentPlayer]?.seat ?? 0]}
            onReady={() => shell.gotoSeat(ctx.currentPlayer)}
          />
        )}
      </AnimatePresence>

      {/* the Marked's private reveal (dormant) */}
      <AnimatePresence>
        {showRoleReveal && me && (
          <RoleReveal name={me.name} onDismiss={() => setAckedMarked((s) => ({ ...s, [playerID!]: true }))} />
        )}
      </AnimatePresence>

      {/* game over — the Match Story recap */}
      <AnimatePresence>
        {ctx.gameover && (
          <MatchStory
            gameover={ctx.gameover}
            G={G}
            onPlayAgain={shell.playAgain}
            onChangeHeroes={shell.changeHeroes}
            onRestart={shell.restart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── the Gate opening — a wash of light when the 3rd Lantern lands ──────────────
function GateOpenFlood({ flash }: { flash: GState['flash'] }) {
  const [burst, setBurst] = useState(0);
  const last = useRef(-1);
  useEffect(() => {
    if (flash?.kind === 'gate-open' && flash.nonce !== last.current) {
      last.current = flash.nonce;
      setBurst((b) => b + 1);
    }
  }, [flash]);
  return (
    <AnimatePresence>
      {burst > 0 && (
        <motion.div
          key={burst}
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0] }}
          transition={{ duration: 1.9, ease: 'easeOut' }}
          onAnimationComplete={() => setBurst(0)}
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,230,168,0.75) 0%, rgba(240,168,48,0.28) 32%, transparent 62%)' }}
        />
      )}
    </AnimatePresence>
  );
}

// ── the Hollow One ────────────────────────────────────────────────────────────
/** The evolving villain. Dusk: a small shape in the fog. The Gloaming: it wakes —
 *  a second eye, quicker, larger. Pitch: it hunts — biggest, fiercest, a gaze-beam.
 *  Its gaze always turns to look at its next footfall (and snaps on a new target). */
function NightmareToken({
  x,
  y,
  act,
  targetId,
  gazeAngle,
  reduce,
}: {
  x: number;
  y: number;
  act: number;
  targetId: number | null;
  gazeAngle: number;
  reduce: boolean;
}) {
  const size = [0.82, 1.0, 1.2][act] ?? 1;
  const pulse = [2.6, 1.7, 1.05][act] ?? 1.7;
  const auraPeak = [0.34, 0.46, 0.6][act] ?? 0.46;
  const twoEyes = act >= 1;
  const eyeR = act >= 2 ? 2.9 : 2.4;
  return (
    <motion.g initial={false} animate={{ x, y }} transition={{ type: 'tween', duration: 0.7, ease: 'easeInOut' }}>
      {/* NB: animate the scale TRANSFORM, never the r ATTRIBUTE */}
      <motion.g
        animate={{ scale: size }}
        transition={{ type: 'spring', stiffness: 90, damping: 16 }}
        style={{ transformOrigin: '0px 0px' }}
      >
        <motion.circle
          r={22}
          fill="var(--color-dread)"
          filter="url(#soft)"
          animate={reduce ? { scale: 1, opacity: auraPeak * 0.7 } : { scale: [0.82, 1.18, 0.82], opacity: [0.18, auraPeak, 0.18] }}
          transition={reduce ? undefined : { duration: pulse, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '0px 0px' }}
        />
        <path
          d="M0,-17 L7,-4 L16,-2 L8,6 L10,17 L0,10 L-10,17 L-8,6 L-16,-2 L-7,-4 Z"
          fill="var(--color-void)"
          stroke="var(--color-dread)"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {/* the gaze — turns to face the quarry, springing round on a new target */}
        <motion.g animate={{ rotate: gazeAngle }} transition={{ type: 'spring', stiffness: 130, damping: 12 }} style={{ transformOrigin: '0px 0px' }}>
          {/* a lock-on beam once it has fully woken (Pitch) */}
          {act >= 2 && <path d="M6 0 L26 -5 L26 5 Z" fill="var(--color-dread-bright)" opacity={0.16} />}
          {/* eyes remount on a new target → a half-second lock-on flourish */}
          <motion.g
            key={targetId ?? 'idle'}
            initial={reduce ? false : { scale: 1.6, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          >
            <motion.circle
              r={eyeR}
              cx={twoEyes ? 6 : 4}
              cy={twoEyes ? -3.2 : 0}
              fill="var(--color-dread-bright)"
              animate={reduce ? undefined : { opacity: [1, 0.4, 1] }}
              transition={reduce ? undefined : { duration: act >= 2 ? 0.9 : 1.4, repeat: Infinity }}
              style={{ filter: 'drop-shadow(0 0 6px var(--color-dread-bright))' }}
            />
            {twoEyes && (
              <motion.circle
                r={eyeR}
                cx={6}
                cy={3.2}
                fill="var(--color-dread-bright)"
                animate={reduce ? undefined : { opacity: [1, 0.4, 1] }}
                transition={reduce ? undefined : { duration: act >= 2 ? 0.9 : 1.4, repeat: Infinity }}
                style={{ filter: 'drop-shadow(0 0 6px var(--color-dread-bright))' }}
              />
            )}
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.g>
  );
}

/** The Hollow One's whole intended route ahead — a thread of fading footfalls that
 *  glide to new tiles when it changes its mind (personality for free). */
function NightmarePath({ G, reduce }: { G: GState; reduce: boolean }) {
  const path = G.nightmare.path.filter((id) => !isVoid(G, id));
  if (!path.length) return null;
  const from = G.nodes[G.nightmare.nodeId];
  const pts = [from, ...path.map((id) => G.nodes[id])].map((n) => `${n.x},${n.y}`).join(' ');
  return (
    <g style={{ pointerEvents: 'none' }}>
      <polyline points={pts} fill="none" stroke="var(--color-dread-bright)" strokeWidth={1.3} strokeDasharray="2 8" strokeOpacity={0.3} />
      {path.map((id, i) => (
        <Footprint key={i} x={G.nodes[id].x} y={G.nodes[id].y} reduce={reduce} lead={i === 0} fade={1 - i / (path.length + 0.6)} index={i} />
      ))}
    </g>
  );
}

function Footprint({ x, y, reduce, lead, fade, index }: { x: number; y: number; reduce: boolean; lead: boolean; fade: number; index: number }) {
  const peak = (lead ? 0.85 : 0.5) * fade;
  return (
    <motion.g style={{ pointerEvents: 'none' }} initial={false} animate={{ x, y }} transition={{ type: 'spring', stiffness: 160, damping: 20 }}>
      <motion.circle
        r={lead ? 17 : 12}
        fill="none"
        stroke="var(--color-dread-bright)"
        strokeWidth={lead ? 2 : 1.4}
        strokeDasharray="3 6"
        animate={reduce ? { opacity: peak * 0.8 } : { opacity: [0.18 * fade, peak, 0.18 * fade], scale: [0.92, lead ? 1.08 : 1.0, 0.92] }}
        transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.12 }}
        style={{ transformOrigin: '0px 0px' }}
      />
    </motion.g>
  );
}

// ── one tile on the map ───────────────────────────────────────────────────────
function NodeView({
  node,
  G,
  reachable,
  reduce,
  onPick,
  onHover,
}: {
  node: BoardNode;
  G: GState;
  reachable: boolean;
  reduce: boolean;
  onPick: () => void;
  onHover: (id: number | null) => void;
}) {
  const isGate = node.type === 'gate';
  const eaten = isVoid(G, node.id);
  const fraying = !eaten && G.fraying.includes(node.id);
  const radius = isGate ? 26 : 17;
  const lantern = lanternOnNode(G, node.id);
  const delivered = isGate ? G.lanternsDelivered : 0;
  const gateReady = isGate && G.lanternsDelivered >= LANTERN_COUNT;

  if (eaten) {
    // a tile the dark has DEVOURED — a torn hole bleeding corruption, not a tidy circle
    const torn = tornPath(node.x, node.y, radius + 4, node.id);
    return (
      <motion.g
        style={{ pointerEvents: 'none', transformOrigin: `${node.x}px ${node.y}px` }}
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* corruption bleeding off the hole (collectively the eaten region glows dread) */}
        <circle cx={node.x} cy={node.y} r={radius + 16} fill="url(#rot)" style={{ filter: 'url(#soft)' }} />
        <path d={torn} fill="url(#nd-void)" stroke="var(--color-dread-deep)" strokeWidth={1.5} strokeOpacity={0.7} strokeLinejoin="round" />
        <path d={tornPath(node.x, node.y, radius - 3, node.id + 7)} fill="#000" fillOpacity={0.7} />
      </motion.g>
    );
  }

  return (
    <g
      className={reachable ? 'cursor-pointer' : ''}
      onClick={onPick}
      onMouseEnter={reachable ? () => onHover(node.id) : undefined}
      onMouseLeave={reachable ? () => onHover(null) : undefined}
      style={{ pointerEvents: reachable ? 'auto' : 'none' }}
      role={reachable ? 'button' : undefined}
      aria-label={reachable ? `Move to ${node.label ?? 'this tile'}` : undefined}
    >
      {/* gate glow */}
      {isGate && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={radius + 6}
          fill="var(--color-ember)"
          opacity={0.3}
          filter="url(#soft)"
          animate={gateReady && !reduce ? { opacity: [0.3, 0.7, 0.3], scale: [1, 1.12, 1] } : { opacity: 0.3 }}
          transition={gateReady && !reduce ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        />
      )}

      {/* reachable halo */}
      {reachable && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={radius + 9}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth={2}
          initial={{ opacity: 0.2 }}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 0.7, 0.25] }}
          transition={reduce ? undefined : { duration: 1.4, repeat: Infinity }}
        />
      )}

      {/* fraying telegraph — this tile goes to the dark next */}
      {fraying && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={radius + 4}
          fill="none"
          stroke="var(--color-dread-bright)"
          strokeWidth={1.6}
          strokeDasharray="2 5"
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.3, 0.8, 0.3], rotate: [0, 30, 0] }}
          transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${node.x}px ${node.y}px`, pointerEvents: 'none' }}
        />
      )}

      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={isGate ? 'url(#nd-gate)' : 'url(#nd-tile)'}
        stroke={isGate ? 'var(--color-ember-bright)' : fraying ? 'var(--color-dread-deep)' : 'var(--color-node-rim)'}
        strokeWidth={2}
        opacity={fraying ? 0.72 : 1}
        style={isGate ? { filter: 'drop-shadow(0 0 14px var(--color-ember))' } : undefined}
      />

      {/* the Gate glyph + delivered lanterns */}
      {isGate && <GateGlyph x={node.x} y={node.y} delivered={delivered} />}

      {/* an on-board Lantern waiting to be grabbed */}
      {lantern && <LanternGlyph x={node.x} y={node.y} reduce={reduce} />}

      {/* label */}
      {node.label && (
        <text x={node.x} y={node.y + radius + 15} textAnchor="middle" className="font-display" fontSize={12} fill="var(--color-parchment-dim)" opacity={0.85}>
          {node.label}
        </text>
      )}
    </g>
  );
}

function GateGlyph({ x, y, delivered }: { x: number; y: number; delivered: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* an archway home */}
      <path
        d={`M ${x - 11} ${y + 12} L ${x - 11} ${y - 4} Q ${x} ${y - 17} ${x + 11} ${y - 4} L ${x + 11} ${y + 12}`}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* delivered lanterns line up under the arch */}
      {Array.from({ length: delivered }).map((_, i) => (
        <circle
          key={i}
          cx={x - (delivered - 1) * 4 + i * 8}
          cy={y + 8}
          r={2.4}
          fill="var(--color-ember-glow)"
          style={{ filter: 'drop-shadow(0 0 4px var(--color-ember))' }}
        />
      ))}
    </g>
  );
}

function LanternGlyph({ x, y, reduce }: { x: number; y: number; reduce: boolean }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* a "collectible" halo pulse so it reads as grab-me light */}
      <motion.circle
        cx={x}
        cy={y}
        r={19}
        fill="url(#lantern-glow)"
        animate={reduce ? { opacity: 0.85 } : { opacity: [0.55, 0.95, 0.55], scale: [0.9, 1.08, 0.9] }}
        transition={reduce ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />
      <motion.g
        animate={reduce ? undefined : { y: [0, -2, 0] }}
        transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* top hook + ring */}
        <path d={`M ${x} ${y - 12} v -2.5`} stroke="var(--color-ember-bright)" strokeWidth={1.4} />
        <circle cx={x} cy={y - 15} r={2} fill="none" stroke="var(--color-ember-bright)" strokeWidth={1.2} />
        {/* domed cap */}
        <path d={`M ${x - 5} ${y - 8} Q ${x} ${y - 14} ${x + 5} ${y - 8} Z`} fill="var(--color-ember-deep)" stroke="var(--color-ember-bright)" strokeWidth={1} />
        {/* glass cage body (trapezoid) with a bright flame inside */}
        <path
          d={`M ${x - 5} ${y - 8} L ${x + 5} ${y - 8} L ${x + 6} ${y + 7} L ${x - 6} ${y + 7} Z`}
          fill="var(--color-ember)"
          fillOpacity={0.85}
          stroke="var(--color-ember-bright)"
          strokeWidth={1.2}
          style={{ filter: 'drop-shadow(0 0 6px var(--color-ember))' }}
        />
        <line x1={x} y1={y - 8} x2={x} y2={y + 7} stroke="var(--color-ember-bright)" strokeWidth={0.6} strokeOpacity={0.5} />
        <motion.path
          d={`M ${x} ${y - 5} C ${x + 3} ${y - 1} ${x + 1.5} ${y + 4} ${x} ${y + 4} C ${x - 1.5} ${y + 4} ${x - 3} ${y - 1} ${x} ${y - 5} Z`}
          fill="var(--color-ember-glow)"
          animate={reduce ? undefined : { scaleY: [1, 1.18, 0.94, 1] }}
          transition={reduce ? undefined : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${x}px ${y + 3}px`, filter: 'drop-shadow(0 0 4px var(--color-ember-bright))' }}
        />
        {/* base */}
        <rect x={x - 6.5} y={y + 7} width={13} height={2.4} rx={1} fill="var(--color-ember-deep)" stroke="var(--color-ember-bright)" strokeWidth={0.6} />
      </motion.g>
    </g>
  );
}

function PlayerTokenView({
  x,
  y,
  color,
  name,
  torch,
  carrying,
  showName,
  wisp,
  isCurrent,
}: {
  x: number;
  y: number;
  color: string;
  name: string;
  torch: number;
  carrying: number;
  showName: boolean;
  wisp: boolean;
  isCurrent: boolean;
}) {
  const flame = Math.max(0, Math.min(1, torch / TORCH_MAX));
  return (
    <motion.g initial={false} animate={{ x, y }} transition={{ type: 'spring', stiffness: 200, damping: 24 }}>
      {isCurrent && (
        <motion.circle
          r={15}
          fill="none"
          stroke={wisp ? 'var(--color-fog)' : color}
          strokeWidth={2}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
      {wisp ? (
        <motion.g animate={{ y: [0, -3, 0], opacity: [0.55, 0.85, 0.55] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
          <circle r={7} fill={color} opacity={0.28} style={{ filter: 'url(#soft)' }} />
          <circle r={3.4} fill="var(--color-parchment)" opacity={0.7} />
          <circle r={1.6} fill="var(--color-fog)" />
        </motion.g>
      ) : (
        <>
          <circle r={10} fill={color} stroke="var(--color-void)" strokeWidth={2} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.55))' }} />
          <circle cx={-3} cy={-3.5} r={3} fill="var(--color-parchment)" opacity={0.4} />
          {/* the torch flame — height tracks how much life is left */}
          <g transform="translate(9, -9)">
            <motion.path
              d={`M 0 0 C ${2.2} ${-2 - flame * 5} 0 ${-4 - flame * 8} 0 ${-4 - flame * 8} C 0 ${-4 - flame * 8} ${-2.2} ${-2 - flame * 5} 0 0 Z`}
              fill={flame > 0.34 ? 'var(--color-ember-bright)' : 'var(--color-dread-bright)'}
              animate={{ scaleY: [1, 1.15, 0.92, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '0px 0px', filter: 'drop-shadow(0 0 4px var(--color-ember))' }}
            />
          </g>
          {/* a carried Lantern rides on the token */}
          {carrying > 0 && (
            <g transform="translate(-9, 4)">
              <rect x={-3} y={-3.5} width={6} height={7.5} rx={1.5} fill="var(--color-ember)" stroke="var(--color-ember-bright)" strokeWidth={0.8} style={{ filter: 'drop-shadow(0 0 5px var(--color-ember))' }} />
              {carrying > 1 && (
                <text x={0} y={2} textAnchor="middle" fontSize={5} fill="var(--color-ink)" className="font-display">
                  {carrying}
                </text>
              )}
            </g>
          )}
        </>
      )}
      {showName && (
        <text textAnchor="middle" y={-15} fontSize={11} className="font-display" fill={wisp ? 'var(--color-fog-dim)' : color}>
          {name}
        </text>
      )}
    </motion.g>
  );
}
