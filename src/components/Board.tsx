import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import type { BoardProps } from 'boardgame.io/react';
import type { GState, BoardNode } from '../game/types';
import { BOARD_W, BOARD_H, EDGES, edgeKey } from '../game/board';
import { SEAT_COLORS, EMBERS_PER_BEACON } from '../game/constants';
import { dreadFilter, DreadTide } from './DreadTide';
import { TurnHud } from './TurnHud';
import { EventLog } from './EventLog';
import { NarratorPanel } from './NarratorPanel';
import { HandoffScreen } from './HandoffScreen';
import { GameOver } from './GameOver';
import { TopBar } from './TopBar';
import { useGameSound } from '../hooks/useGameSound';
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

function isCorruptedEdge(G: GState, a: number, b: number) {
  const k = edgeKey(a, b);
  return G.corruptedEdges.some(([x, y]) => edgeKey(x, y) === k);
}

export function GloamingBoard(props: BoardProps<GState>) {
  const { G, ctx, moves, playerID } = props;
  const shell = useShell();
  useGameSound(G.flash);

  const shake = useAnimationControls();
  const lastStrike = useRef(-1);

  // tapered board shake on a Dread strike (RESEARCH §3C)
  useEffect(() => {
    if (!G.flash || G.flash.kind !== 'dread-strike') return;
    if (G.flash.nonce === lastStrike.current) return;
    lastStrike.current = G.flash.nonce;
    shake.start({
      x: [0, -7, 6, -4, 3, 0],
      y: [0, 4, -3, 2, -1, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    });
  }, [G.flash, shake]);

  const myTurn = playerID === ctx.currentPlayer && !ctx.gameover;
  const me = playerID ? G.players[playerID] : undefined;

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
    if (!myTurn || !me || !me.alive || me.dimmed || !G.hasRolled || G.pendingEvent) return s;
    const cur = G.nodes[me.nodeId];
    for (const n of cur.neighbors) {
      const cost = isCorruptedEdge(G, me.nodeId, n) ? 2 : 1;
      if (G.stride >= cost) s.add(n);
    }
    return s;
  }, [myTurn, me, G]);

  const handoffNeeded = !ctx.gameover && playerID !== ctx.currentPlayer;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-void text-parchment">
      <TopBar />

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-2">
        {/* Dread tide */}
        <div className="w-14 py-2">
          <DreadTide dread={G.dread} dreadMax={G.dreadMax} />
        </div>

        {/* Board */}
        <div className="relative flex min-w-0 flex-1 items-center justify-center">
          <motion.div animate={shake} className="relative h-full w-full">
            <svg
              viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
              className="h-full w-full"
              style={{ filter: dreadFilter(G.dread, G.dreadMax), transition: 'filter 900ms ease' }}
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

              <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="var(--color-node-hollow-rim)" />

              {/* edges — hand-walked curves, not plotted lines */}
              {EDGES.map(([a, b]) => {
                const na = G.nodes[a];
                const nb = G.nodes[b];
                const corrupt = isCorruptedEdge(G, a, b);
                const lit = !!me && ((me.nodeId === a && reachable.has(b)) || (me.nodeId === b && reachable.has(a)));
                const d = edgePath(na.x, na.y, nb.x, nb.y, a * 17 + b);
                if (corrupt) {
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

              {/* player tokens */}
              {Object.values(G.players).map((p) => {
                const node = G.nodes[p.nodeId];
                const group = byNode.get(p.nodeId) ?? [p.id];
                const idx = group.indexOf(p.id);
                const fan = group.length > 1 ? 16 : 0;
                const angle = (idx / Math.max(1, group.length)) * Math.PI * 2;
                const ox = fan ? Math.cos(angle) * fan : 0;
                const oy = fan ? Math.sin(angle) * fan : 0;
                return (
                  <PlayerTokenView
                    key={p.id}
                    x={node.x + ox}
                    y={node.y + oy}
                    color={SEAT_COLORS[p.seat]}
                    name={p.name}
                    dimmed={p.dimmed}
                    alive={p.alive}
                    isCurrent={p.id === ctx.currentPlayer}
                  />
                );
              })}

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
        </div>

        {/* Log + roster */}
        <div className="hidden w-72 shrink-0 py-2 lg:block">
          <EventLog G={G} currentPlayer={ctx.currentPlayer} />
        </div>
      </div>

      {/* HUD */}
      <TurnHud props={props} myTurn={myTurn} />

      {/* Narrator omen */}
      <AnimatePresence>
        {G.pendingEvent && myTurn && (
          <NarratorPanel
            cardId={G.pendingEvent.cardId}
            onChoose={(i) => moves.resolveOmen(i)}
          />
        )}
      </AnimatePresence>

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

      {/* Game over */}
      <AnimatePresence>
        {ctx.gameover && <GameOver gameover={ctx.gameover} G={G} onRestart={shell.restart} />}
      </AnimatePresence>
    </div>
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

      {/* beacon ember pips */}
      {beacon && !beacon.lit && (
        <g>
          {Array.from({ length: EMBERS_PER_BEACON }, (_, i) => (
            <circle
              key={i}
              cx={node.x - ((EMBERS_PER_BEACON - 1) * 11) / 2 + i * 11}
              cy={node.y + 11}
              r={3.5}
              fill={i < beacon.embers ? 'var(--color-ember)' : 'var(--color-node-hollow-core)'}
              stroke="var(--color-ember-deep)"
              strokeWidth={0.75}
              style={i < beacon.embers ? { filter: 'drop-shadow(0 0 4px var(--color-ember))' } : undefined}
            />
          ))}
        </g>
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
    <motion.circle
      cx={x}
      cy={y}
      r={9}
      fill="var(--color-ember-bright)"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.95] }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: `${x}px ${y}px`, filter: 'drop-shadow(0 0 12px var(--color-ember))' }}
    />
  );
}

function PlayerTokenView({
  x,
  y,
  color,
  name,
  dimmed,
  alive,
  isCurrent,
}: {
  x: number;
  y: number;
  color: string;
  name: string;
  dimmed: boolean;
  alive: boolean;
  isCurrent: boolean;
}) {
  return (
    <motion.g
      initial={false}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      {isCurrent && alive && (
        <motion.circle
          r={15}
          fill="none"
          stroke={color}
          strokeWidth={2}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
      <circle r={10} fill={alive ? color : 'var(--color-token-dead)'} stroke="var(--color-void)" strokeWidth={2} opacity={dimmed ? 0.4 : 1} />
      <circle r={4} fill="var(--color-void)" opacity={dimmed ? 0.8 : 0.25} />
      {!alive && (
        <g stroke="var(--color-fog)" strokeWidth={1.6} strokeLinecap="round">
          <line x1={-4} y1={-4} x2={4} y2={4} />
          <line x1={4} y1={-4} x2={-4} y2={4} />
        </g>
      )}
      <text textAnchor="middle" y={-15} fontSize={11} className="font-display" fill={alive ? color : 'var(--color-fog-dim)'}>
        {name}
      </text>
    </motion.g>
  );
}
