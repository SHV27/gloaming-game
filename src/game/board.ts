import type { BoardNode } from './types';

/**
 * The Gloaming board — a hand-designed graph on a 1000×680 viewBox.
 * Irregular web so routing is a real choice: the North beacon (12) sits on the
 * road to the Threshold, but West (4) and East (8) demand detours through a
 * Shrine — so the party must split or commit. Adjacency is explicit (`neighbors`),
 * never index math (RESEARCH §2). All edges verified symmetric.
 */
export const BOARD_W = 1000;
export const BOARD_H = 680;

export const BOARD: BoardNode[] = [
  { id: 0, x: 500, y: 610, type: 'hearth', neighbors: [1, 2, 11], label: 'The Hearth' },

  { id: 1, x: 310, y: 520, type: 'hollow', neighbors: [0, 3, 6] },
  { id: 2, x: 690, y: 520, type: 'hollow', neighbors: [0, 7, 10] },

  { id: 3, x: 165, y: 425, type: 'wellspring', neighbors: [1, 5, 6], label: 'Westwell' },
  { id: 7, x: 835, y: 425, type: 'wellspring', neighbors: [2, 9, 10], label: 'Eastwell' },

  { id: 5, x: 250, y: 330, type: 'shrine', neighbors: [3, 4, 6], label: 'Pale Shrine' },
  { id: 9, x: 750, y: 330, type: 'shrine', neighbors: [7, 8, 10], label: 'Hollow Shrine' },

  { id: 4, x: 95, y: 290, type: 'beacon', neighbors: [5], label: 'West Beacon' },
  { id: 8, x: 905, y: 290, type: 'beacon', neighbors: [9], label: 'East Beacon' },

  { id: 6, x: 390, y: 375, type: 'hollow', neighbors: [1, 3, 5, 11, 13] },
  { id: 10, x: 610, y: 375, type: 'hollow', neighbors: [2, 7, 9, 11, 15] },
  { id: 11, x: 500, y: 455, type: 'hollow', neighbors: [0, 6, 10, 12] },

  { id: 12, x: 500, y: 205, type: 'beacon', neighbors: [11, 13, 15, 14], label: 'North Beacon' },

  { id: 13, x: 375, y: 250, type: 'hollow', neighbors: [6, 12, 14] },
  { id: 15, x: 625, y: 250, type: 'hollow', neighbors: [10, 12, 14] },

  { id: 14, x: 500, y: 85, type: 'threshold', neighbors: [12, 13, 15], label: 'The Threshold' },
];

export const BEACON_NODE_IDS = BOARD.filter((n) => n.type === 'beacon').map((n) => n.id);
export const THRESHOLD_ID = BOARD.find((n) => n.type === 'threshold')!.id;
export const HEARTH_ID = BOARD.find((n) => n.type === 'hearth')!.id;

/** Unique undirected edges, for rendering and corruption. */
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
