import type { BoardNode } from './types';

/**
 * GLOAMING v3 — *Trapped Inside*. The board is a **concentric-ring graph** so the
 * one thing the game is about — the dark eating the edge inward and herding everyone
 * to the center — is native to the geometry (PLAN §D). Ring 0 is the Gate (home +
 * refuel + deliver + escape). Rings spiral out; the dark consumes the outermost
 * surviving tiles each round. Generated programmatically so it is symmetric and the
 * ring sizes are a single tunable. Every node has a path inward → no unreachable tile.
 */
export const BOARD_W = 960;
export const BOARD_H = 960;
const CX = BOARD_W / 2;
const CY = BOARD_H / 2;

/** Ring sizes (index = ring). Ring 0 is the single center Gate. Outer ring = Lanterns. */
export const RING_SIZES = [1, 6, 12, 12] as const;
export const OUTER_RING = RING_SIZES.length - 1;
const RING_RADIUS = [0, 150, 300, 435] as const;
/** A small per-ring angular offset so rings interleave into a spiderweb, not spokes. */
const RING_OFFSET = [0, -Math.PI / 2, -Math.PI / 2 + Math.PI / 12, -Math.PI / 2] as const;

interface GenNode extends BoardNode {
  ring: number;
  angle: number; // radians, for eat-order + placement
}

/** Angular distance between two angles, in [0, π]. */
function angDist(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

const gen: GenNode[] = (() => {
  const nodes: GenNode[] = [];
  const byRing: number[][] = RING_SIZES.map(() => []);
  let id = 0;

  RING_SIZES.forEach((count, ring) => {
    for (let i = 0; i < count; i++) {
      const angle = ring === 0 ? 0 : RING_OFFSET[ring] + (i / count) * Math.PI * 2;
      const r = RING_RADIUS[ring];
      nodes.push({
        id,
        x: Math.round(CX + r * Math.cos(angle)),
        y: Math.round(CY + r * Math.sin(angle)),
        type: ring === 0 ? 'gate' : 'tile',
        neighbors: [],
        ring,
        angle,
        label: ring === 0 ? 'The Gate' : undefined,
      });
      byRing[ring].push(id);
      id++;
    }
  });

  const link = (a: number, b: number) => {
    if (a === b) return;
    if (!nodes[a].neighbors.includes(b)) nodes[a].neighbors.push(b);
    if (!nodes[b].neighbors.includes(a)) nodes[b].neighbors.push(a);
  };

  RING_SIZES.forEach((count, ring) => {
    const ids = byRing[ring];
    // circular neighbours within the ring (ring 0 has none)
    if (ring > 0 && count > 1) {
      for (let i = 0; i < count; i++) link(ids[i], ids[(i + 1) % count]);
    }
    // link each node to its nearest node in the adjacent inner ring (guarantees an inward path)
    if (ring > 0) {
      const inner = byRing[ring - 1];
      for (const nid of ids) {
        let best = inner[0];
        let bestD = Infinity;
        for (const iid of inner) {
          const d = angDist(nodes[nid].angle, nodes[iid].angle);
          if (d < bestD) {
            bestD = d;
            best = iid;
          }
        }
        link(nid, best);
      }
    }
  });

  return nodes;
})();

export const BOARD: BoardNode[] = gen.map((n) => ({
  id: n.id,
  x: n.x,
  y: n.y,
  type: n.type,
  neighbors: [...n.neighbors].sort((a, b) => a - b),
  label: n.label,
}));

/** ring index per node id (drives the dark's eat-order + Act, and placement). */
export const RING_OF: number[] = gen.map((n) => n.ring);
/** angle per node id (for even Lantern spacing on the outer ring). */
export const ANGLE_OF: number[] = gen.map((n) => n.angle);

export const GATE_ID = BOARD.find((n) => n.type === 'gate')!.id;
/** Node ids of the outer ring, evenly ordered by angle (where Lanterns spawn). */
export const OUTER_RING_IDS: number[] = gen
  .filter((n) => n.ring === OUTER_RING)
  .sort((a, b) => a.angle - b.angle)
  .map((n) => n.id);

/** Unique undirected edges, for rendering. */
export const EDGES: Array<[number, number]> = (() => {
  const seen = new Set<string>();
  const out: Array<[number, number]> = [];
  for (const n of BOARD) {
    for (const m of n.neighbors) {
      const key = n.id < m ? `${n.id}-${m}` : `${m}-${n.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([Math.min(n.id, m), Math.max(n.id, m)]);
      }
    }
  }
  return out;
})();

export function nodeById(nodes: BoardNode[], id: number): BoardNode {
  return nodes[id];
}

export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Pick `count` outer-ring node ids spread as evenly as possible (Lantern spawns). */
export function spreadOuter(count: number): number[] {
  const ids = OUTER_RING_IDS;
  if (count >= ids.length) return ids.slice();
  const step = ids.length / count;
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(ids[Math.floor(i * step) % ids.length]);
  return out;
}
