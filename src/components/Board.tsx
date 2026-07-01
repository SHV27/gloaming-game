import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion';
import type { BoardProps } from 'boardgame.io/react';
import type { GState, BoardNode } from '../game/types';
import { BOARD_W, BOARD_H, EDGES } from '../game/board';
import { SEAT_COLORS } from '../game/constants';
import { isSealed, strideCostFor } from '../game/effects';
import { nightFilter, NightTide } from './DreadTide';
import { TurnHud } from './TurnHud';
import { EventLog } from './EventLog';
import { HandoffScreen } from './HandoffScreen';
import { GameOver } from './GameOver';
import { RoleReveal } from './RoleReveal';
import { Atmosphere } from './Atmosphere';
import { TopBar } from './TopBar';
import { useGameSound } from '../hooks/useGameSound';
import { sound } from '../audio/sound';
import { useShell } from './shell';

const NODE_GRAD: Record<BoardNode['type'], string> = {
  hearth: 'url(#nd-hearth)',
  hollow: 'url(#nd-hollow)',
  wellspring: 'url(#nd-wellspring)',
  shrine: 'url(#nd-shrine)',
  beacon: 'url(#nd-beacon)',
  threshold: 'url(#nd-threshold)',
};

const NODE_GLOW: Record<BoardNode['type'], string> = {
  hearth: 'var(--color-ember)',
  hollow: 'transparent',
  wellspring: 'var(--color-glow-well)',
  shrine: 'var(--color-glow-shrine)',
  beacon: 'var(--color-ember)',
  threshold: 'var(--color-seat-3)',
};

/** A gently curved path between two nodes so routes feel walked, not plotted. */
function edgePath(ax: number, ay: number, bx: number, by: number, seed: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const off = (seed % 2 ? 1 : -1) * Math.min(26, len * 0.09);
  const cx = mx + (-dy / len) * off;
  const cy = my + (dx / len) * off;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

export function GloamingBoard(props: BoardProps<GState>) {
  const { G, ctx, moves, playerID } = props;
  const shell = useShell();
  useGameSound(G.flash);

  const shake = useAnimationControls();
  const lastStrike = useRef(-1);

  // tapered board shake when the Gloaming lands a blow (RESEARCH §4)
  const IMPACT = new Set(['snuff', 'surge', 'stalker', 'act-change']);
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
  const reduce = !!useReducedMotion();
  const nightRatio = Math.min(1, G.night / G.nightMax);

  // win/lose sting (once)
  const stungRef = useRef(false);
  useEffect(() => {
    if (ctx.gameover && !stungRef.current) {
      stungRef.current = true;
      sound.play(ctx.gameover.winner === 'lanternbearers' ? 'win' : 'lose');
    }
  }, [ctx.gameover]);

  // the Dread heartbeat — quickens as night nears (only once it's felt)
  useEffect(() => {
    if (reduce || ctx.gameover || nightRatio < 0.42) return;
    const interval = Math.max(680, 1850 - nightRatio * 1250);
    const id = setInterval(() => sound.play('heartbeat'), interval);
    return () => clearInterval(id);
  }, [nightRatio, reduce, ctx.gameover]);

  // The Marked's private one-time reveal (after handoff; never the prev player).
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

  // which neighbors the active player can reach right now
  const reachable = useMemo(() => {
    const s = new Set<number>();
    if (!myTurn || !me || me.wisp || G.autoWisp || !G.hasRolled || G.acted) return s;
    const cur = G.nodes[me.nodeId];
    for (const n of cur.neighbors) {
      if (G.stride >= strideCostFor(G, me.nodeId, n)) s.add(n);
    }
    return s;
  }, [myTurn, me, G]);

  // what the Gloaming has telegraphed — drawn ON the board so you see it coming
  const telegraph = useMemo(() => {
    const snuff = new Set<number>();
    const seal: Array<[number, number]> = [];
    for (const it of G.intents) {
      if (it.kind === 'snuff' && it.beaconNodeId != null) snuff.add(it.beaconNodeId);
      if (it.kind === 'seal' && it.edge) seal.push(it.edge);
    }
    return { snuff, seal };
  }, [G.intents]);

  const handoffNeeded = !ctx.gameover && playerID !== ctx.currentPlayer;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-void text-parchment">
      <TopBar />

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-2">
        {/* Night tide */}
        <div className="w-14 py-2">
          <NightTide night={G.night} nightMax={G.nightMax} act={G.act} />
        </div>

        {/* Board */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center">
          <motion.div animate={shake} className="relative h-full w-full">
            <svg
              viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
              className="h-full w-full"
              style={{ filter: nightFilter(G.night, G.nightMax), transition: 'filter 900ms ease' }}
            >
              <defs>
                <radialGradient id="vign" cx="50%" cy="42%" r="75%">
                  <stop offset="55%" stopColor="var(--color-night)" stopOpacity="0" />
                  <stop offset="100%" stopColor="var(--color-void)" stopOpacity="0.92" />
                </radialGradient>
                {/* per-type node materials: a pool of light inside a dark rim */}
                <radialGradient id="nd-hollow" cx="42%" cy="38%" r="70%">
                  <stop offset="0%" stopColor="var(--color-node-hollow-core)" />
                  <stop offset="100%" stopColor="var(--color-node-hollow-rim)" />
                </radialGradient>
                <radialGradient id="nd-wellspring" cx="42%" cy="38%" r="72%">
                  <stop offset="0%" stopColor="var(--color-glow-well)" stopOpacity="0.35" />
                  <stop offset="55%" stopColor="#13343a" />
                  <stop offset="100%" stopColor="var(--color-node-hollow-rim)" />
                </radialGradient>
                <radialGradient id="nd-shrine" cx="42%" cy="38%" r="72%">
                  <stop offset="0%" stopColor="var(--color-glow-shrine)" stopOpacity="0.35" />
                  <stop offset="55%" stopColor="#251a3a" />
                  <stop offset="100%" stopColor="var(--color-node-hollow-rim)" />
                </radialGradient>
                <radialGradient id="nd-hearth" cx="42%" cy="38%" r="72%">
                  <stop offset="0%" stopColor="var(--color-ember-bright)" stopOpacity="0.5" />
                  <stop offset="55%" stopColor="var(--color-node-hearth-core)" />
                  <stop offset="100%" stopColor="#1c130a" />
                </radialGradient>
                <radialGradient id="nd-beacon" cx="42%" cy="38%" r="75%">
                  <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.4" />
                  <stop offset="55%" stopColor="var(--color-node-hearth-core)" />
                  <stop offset="100%" stopColor="#160f08" />
                </radialGradient>
                <radialGradient id="nd-beacon-lit" cx="42%" cy="38%" r="80%">
                  <stop offset="0%" stopColor="var(--color-ember-glow)" />
                  <stop offset="45%" stopColor="var(--color-ember)" />
                  <stop offset="100%" stopColor="var(--color-ember-deep)" />
                </radialGradient>
                <radialGradient id="nd-threshold" cx="42%" cy="38%" r="75%">
                  <stop offset="0%" stopColor="var(--color-seat-3)" stopOpacity="0.4" />
                  <stop offset="55%" stopColor="#241f3e" />
                  <stop offset="100%" stopColor="var(--color-node-hollow-rim)" />
                </radialGradient>
                <filter id="soft" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="7" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* the world the board sits in */}
              <Atmosphere ratio={nightRatio} reduce={reduce} />

              {/* lantern-light each bearer casts on the dark (a Wisp's gutters low) */}
              {Object.values(G.players).map((p) => {
                const node = G.nodes[p.nodeId];
                return (
                  <circle
                    key={`ll-${p.id}`}
                    cx={node.x}
                    cy={node.y}
                    r={p.wisp ? 14 : 42}
                    fill={SEAT_COLORS[p.seat]}
                    opacity={p.wisp ? 0.04 : 0.1}
                    style={{ filter: 'url(#soft)', transition: 'r 600ms ease, opacity 600ms ease' }}
                  />
                );
              })}

              {/* edges — hand-walked curves, not plotted lines */}
              {EDGES.map(([a, b]) => {
                const na = G.nodes[a];
                const nb = G.nodes[b];
                const sealed = isSealed(G, a, b);
                const lit = !!me && ((me.nodeId === a && reachable.has(b)) || (me.nodeId === b && reachable.has(a)));
                const d = edgePath(na.x, na.y, nb.x, nb.y, a * 17 + b);
                if (sealed) {
                  return (
                    <g key={`${a}-${b}`}>
                      <path d={d} fill="none" stroke="var(--color-dread-deep)" strokeWidth={7} strokeOpacity={0.35} strokeLinecap="round" />
                      <path
                        d={d}
                        fill="none"
                        stroke="var(--color-dread)"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray="2 9"
                        style={{ filter: 'drop-shadow(0 0 5px var(--color-dread))' }}
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="22" dur="2.6s" repeatCount="indefinite" />
                      </path>
                    </g>
                  );
                }
                return (
                  <path
                    key={`${a}-${b}`}
                    d={d}
                    fill="none"
                    stroke={lit ? 'var(--color-ember)' : 'var(--color-edge)'}
                    strokeWidth={lit ? 3 : 2}
                    strokeLinecap="round"
                    strokeOpacity={lit ? 0.95 : 0.55}
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
                  onPick={() => myTurn && reachable.has(n.id) && moves.moveTo(n.id)}
                />
              ))}

              {/* the Gloaming's telegraph — dread coiling on what it means to strike */}
              {[...telegraph.snuff].map((id) => {
                const n = G.nodes[id];
                return (
                  <motion.circle
                    key={`tg-snuff-${id}`}
                    cx={n.x}
                    cy={n.y}
                    r={34}
                    fill="none"
                    stroke="var(--color-dread-bright)"
                    strokeWidth={2}
                    strokeDasharray="3 6"
                    style={{ transformOrigin: `${n.x}px ${n.y}px`, pointerEvents: 'none' }}
                    animate={reduce ? { opacity: 0.6 } : { opacity: [0.3, 0.85, 0.3], scale: [1, 1.08, 1], rotate: [0, 20, 0] }}
                    transition={reduce ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                );
              })}
              {telegraph.seal.map(([a, b], i) => {
                const na = G.nodes[a];
                const nb = G.nodes[b];
                return (
                  <motion.path
                    key={`tg-seal-${a}-${b}-${i}`}
                    d={edgePath(na.x, na.y, nb.x, nb.y, a * 17 + b)}
                    fill="none"
                    stroke="var(--color-dread-bright)"
                    strokeWidth={3}
                    strokeDasharray="5 8"
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                    animate={reduce ? { opacity: 0.55 } : { opacity: [0.25, 0.7, 0.25] }}
                    transition={reduce ? undefined : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                );
              })}

              {/* player tokens */}
              {Object.values(G.players).map((p) => {
                const node = G.nodes[p.nodeId];
                const group = byNode.get(p.nodeId) ?? [p.id];
                const idx = group.indexOf(p.id);
                const fan = group.length > 1 ? 17 + group.length * 4 : 0;
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
                    showName={group.length <= 2 || p.id === ctx.currentPlayer}
                    wisp={p.wisp}
                    isCurrent={p.id === ctx.currentPlayer}
                  />
                );
              })}

              {/* the Stalker */}
              {G.stalker && (
                <StalkerToken x={G.nodes[G.stalker.nodeId].x} y={G.nodes[G.stalker.nodeId].y} />
              )}

              <rect
                x={0}
                y={0}
                width={BOARD_W}
                height={BOARD_H}
                fill="url(#vign)"
                pointerEvents="none"
              />
            </svg>
          </motion.div>

          {/* Dread veil — the night closing in, with a heartbeat that quickens */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(125% 95% at 50% 38%, transparent 32%, var(--color-void) 100%)',
                opacity: 0.16 + nightRatio * 0.55,
                transition: 'opacity 900ms ease',
              }}
            />
            <motion.div
              className="absolute inset-0"
              style={{ boxShadow: 'inset 0 0 170px 36px var(--color-dread-deep)' }}
              animate={
                reduce
                  ? { opacity: nightRatio * 0.4 }
                  : { opacity: [nightRatio * 0.16, nightRatio * 0.52, nightRatio * 0.16] }
              }
              transition={
                reduce
                  ? undefined
                  : { duration: Math.max(0.62, 2.3 - nightRatio * 1.5), repeat: Infinity, ease: 'easeInOut' }
              }
            />
          </div>
        </div>

        {/* Log + roster */}
        <div className="hidden w-72 shrink-0 py-2 lg:block">
          <EventLog G={G} currentPlayer={ctx.currentPlayer} />
        </div>
      </div>

      {/* HUD */}
      <TurnHud props={props} myTurn={myTurn} />

      {/* Hotseat handoff */}
      <AnimatePresence>
        {handoffNeeded && (
          <HandoffScreen
            name={shell.names[Number(ctx.currentPlayer)] ?? G.players[ctx.currentPlayer]?.name ?? 'next bearer'}
            color={SEAT_COLORS[G.players[ctx.currentPlayer]?.seat ?? 0]}
            onReady={() => shell.gotoSeat(ctx.currentPlayer)}
          />
        )}
      </AnimatePresence>

      {/* The Marked's private reveal */}
      <AnimatePresence>
        {showRoleReveal && me && (
          <RoleReveal
            name={me.name}
            onDismiss={() => setAckedMarked((s) => ({ ...s, [playerID!]: true }))}
          />
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {ctx.gameover && <GameOver gameover={ctx.gameover} G={G} onRestart={shell.restart} />}
      </AnimatePresence>
    </div>
  );
}

// ── the Stalker ──────────────────────────────────────────────────────────────
function StalkerToken({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      initial={false}
      animate={{ x, y }}
      transition={{ type: 'tween', duration: 0.7, ease: 'easeInOut' }}
    >
      <motion.circle
        fill="var(--color-dread)"
        filter="url(#soft)"
        animate={{ r: [18, 24, 18], opacity: [0.2, 0.42, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* ragged dark body */}
      <path
        d="M0,-15 L6,-4 L14,-2 L7,5 L9,15 L0,9 L-9,15 L-7,5 L-14,-2 L-6,-4 Z"
        fill="var(--color-void)"
        stroke="var(--color-dread)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* the eye */}
      <motion.circle
        r={3.4}
        cy={-2}
        fill="var(--color-dread-bright)"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        style={{ filter: 'drop-shadow(0 0 5px var(--color-dread-bright))' }}
      />
    </motion.g>
  );
}

// ── one node on the map ──────────────────────────────────────────────────────
function NodeView({
  node,
  G,
  reachable,
  onPick,
}: {
  node: BoardNode;
  G: GState;
  reachable: boolean;
  onPick: () => void;
}) {
  const beacon = node.type === 'beacon' ? G.beacons.find((b) => b.nodeId === node.id) : undefined;
  const isThreshold = node.type === 'threshold';
  const sealed = isThreshold && G.beaconsLit < 3;
  const radius = node.type === 'beacon' || isThreshold ? 26 : 18;
  const special = node.type !== 'hollow';
  const glow = NODE_GLOW[node.type];
  const showGlow = special && (node.type !== 'beacon' || beacon?.lit);

  return (
    <g
      className={reachable ? 'cursor-pointer' : ''}
      onClick={onPick}
      style={{ pointerEvents: reachable ? 'auto' : 'none' }}
    >
      {/* ambient glow for places that hold light (wires the #soft filter) */}
      {showGlow && (
        <circle
          cx={node.x}
          cy={node.y}
          r={radius - 2}
          fill={glow}
          opacity={beacon?.lit ? 0.55 : 0.22}
          filter="url(#soft)"
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
          initial={{ opacity: 0.2, scale: 0.9 }}
          animate={{ opacity: [0.25, 0.7, 0.25] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        />
      )}

      {/* threshold ring */}
      {isThreshold && (
        <circle
          cx={node.x}
          cy={node.y}
          r={radius + 6}
          fill="none"
          stroke={sealed ? 'var(--color-haze)' : 'var(--color-ember-bright)'}
          strokeWidth={2}
          strokeDasharray={sealed ? '4 6' : undefined}
          opacity={sealed ? 0.6 : 1}
          style={sealed ? undefined : { filter: 'drop-shadow(0 0 10px var(--color-ember))' }}
        />
      )}

      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={beacon?.lit ? 'url(#nd-beacon-lit)' : NODE_GRAD[node.type]}
        stroke={beacon?.lit ? 'var(--color-ember-bright)' : 'var(--color-node-rim)'}
        strokeWidth={2}
        style={beacon?.lit ? { filter: 'drop-shadow(0 0 16px var(--color-ember))' } : undefined}
      />

      {/* drawn sigils — not Unicode glyphs */}
      <Sigil node={node} sealed={sealed} />

      {/* beacon kindling progress — a ring that fills as ember is poured in */}
      {beacon && !beacon.lit && beacon.progress > 0 && (
        <circle
          cx={node.x}
          cy={node.y}
          r={radius + 5}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, beacon.progress / G.beaconNeed) * 2 * Math.PI * (radius + 5)} ${2 * Math.PI * (radius + 5)}`}
          transform={`rotate(-90 ${node.x} ${node.y})`}
          style={{ filter: 'drop-shadow(0 0 4px var(--color-ember))', transition: 'stroke-dasharray 500ms ease' }}
        />
      )}
      {beacon && !beacon.lit && (
        <text
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          className="font-display"
          fontSize={12}
          fill="var(--color-ember)"
          opacity={0.92}
          style={{ pointerEvents: 'none' }}
        >
          {beacon.progress}/{G.beaconNeed}
        </text>
      )}
      {beacon?.lit && <BeaconFlame x={node.x} y={node.y} />}

      {/* label */}
      {node.label && (
        <text
          x={node.x}
          y={node.y + radius + 16}
          textAnchor="middle"
          className="font-display"
          fontSize={13}
          fill="var(--color-parchment-dim)"
          opacity={0.85}
        >
          {node.label}
        </text>
      )}
    </g>
  );
}

/** Hand-drawn place-sigils (no Unicode). */
function Sigil({ node, sealed }: { node: BoardNode; sealed: boolean }) {
  const { x, y, type } = node;
  const noEvt = { pointerEvents: 'none' as const };
  switch (type) {
    case 'wellspring':
      return (
        <g stroke="var(--color-glow-well)" strokeWidth={1.6} fill="none" opacity={0.95} style={noEvt}>
          <path d={`M ${x - 9} ${y - 1} Q ${x} ${y + 9} ${x + 9} ${y - 1}`} strokeLinecap="round" />
          <path d={`M ${x - 6} ${y - 5} Q ${x} ${y + 3} ${x + 6} ${y - 5}`} strokeLinecap="round" />
          <circle cx={x} cy={y - 7} r={1.7} fill="var(--color-glow-well)" stroke="none" />
        </g>
      );
    case 'shrine':
      return (
        <g fill="var(--color-glow-shrine)" opacity={0.95} style={noEvt}>
          <path d={`M ${x} ${y - 11} L ${x + 3} ${y} L ${x} ${y + 11} L ${x - 3} ${y} Z`} />
          <path d={`M ${x - 11} ${y} L ${x} ${y - 3} L ${x + 11} ${y} L ${x} ${y + 3} Z`} />
        </g>
      );
    case 'hearth':
      return (
        <path
          d={`M ${x} ${y - 11} C ${x + 9} ${y - 1} ${x + 5} ${y + 8} ${x} ${y + 8} C ${x - 5} ${y + 8} ${x - 9} ${y - 1} ${x} ${y - 11} Z`}
          fill="var(--color-ember-bright)"
          opacity={0.95}
          style={{ ...noEvt, filter: 'drop-shadow(0 0 6px var(--color-ember))' }}
        />
      );
    case 'threshold':
      return (
        <g style={noEvt}>
          <path
            d={`M ${x - 9} ${y + 11} L ${x - 9} ${y - 3} Q ${x} ${y - 15} ${x + 9} ${y - 3} L ${x + 9} ${y + 11}`}
            fill="none"
            stroke={sealed ? 'var(--color-fog-dim)' : 'var(--color-ember-bright)'}
            strokeWidth={2}
            strokeLinecap="round"
            style={sealed ? undefined : { filter: 'drop-shadow(0 0 6px var(--color-ember))' }}
          />
          {sealed ? (
            <line x1={x - 9} y1={y + 4} x2={x + 9} y2={y + 4} stroke="var(--color-fog-dim)" strokeWidth={2} strokeDasharray="3 3" />
          ) : (
            <path d={`M ${x} ${y - 4} L ${x + 2.5} ${y + 2} L ${x} ${y + 8} L ${x - 2.5} ${y + 2} Z`} fill="var(--color-ember-glow)" />
          )}
        </g>
      );
    default:
      return null;
  }
}

function BeaconFlame({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* the light it throws on the dark */}
      <motion.circle
        cx={x}
        cy={y}
        r={44}
        fill="var(--color-ember)"
        style={{ filter: 'url(#soft)' }}
        animate={{ opacity: [0.12, 0.24, 0.12] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* bloom-in core */}
      <motion.circle
        cx={x}
        cy={y}
        r={9}
        fill="var(--color-ember-bright)"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.6, 1] }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${x}px ${y}px`, filter: 'drop-shadow(0 0 12px var(--color-ember))' }}
      />
      {/* the living flame */}
      <motion.circle
        cx={x}
        cy={y - 2}
        r={5}
        fill="var(--color-ember-glow)"
        animate={{ scale: [1, 1.22, 0.9, 1.12, 1], opacity: [0.9, 1, 0.82, 1, 0.9] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: `${x}px ${y - 2}px` }}
      />
    </g>
  );
}

function PlayerTokenView({
  x,
  y,
  color,
  name,
  showName,
  wisp,
  isCurrent,
}: {
  x: number;
  y: number;
  color: string;
  name: string;
  showName: boolean;
  wisp: boolean;
  isCurrent: boolean;
}) {
  return (
    <motion.g
      initial={false}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
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
        // a Wisp — a guttering, drifting mote, not a solid pawn
        <motion.g
          animate={{ y: [0, -3, 0], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle r={7} fill={color} opacity={0.28} style={{ filter: 'url(#soft)' }} />
          <circle r={3.4} fill="var(--color-parchment)" opacity={0.7} />
          <circle r={1.6} fill="var(--color-ember-bright)" style={{ filter: 'drop-shadow(0 0 4px var(--color-ember))' }} />
        </motion.g>
      ) : (
        <>
          <circle
            r={10}
            fill={color}
            stroke="var(--color-void)"
            strokeWidth={2}
            style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.55))' }}
          />
          {/* glossy bead highlight */}
          <circle cx={-3} cy={-3.5} r={3} fill="var(--color-parchment)" opacity={0.4} />
          {/* the lantern they carry */}
          <circle cx={8} cy={6} r={2.6} fill="var(--color-ember-bright)" style={{ filter: 'drop-shadow(0 0 5px var(--color-ember))' }} />
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
