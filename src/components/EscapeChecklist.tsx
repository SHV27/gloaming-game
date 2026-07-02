import { motion } from 'framer-motion';
import type { GState } from '../game/types';
import { LANTERN_COUNT } from '../game/constants';

/**
 * THE ESCAPE CHECKLIST (S6, Pillar 1) — a small, always-visible, diegetic emblem of
 * the three win requirements. Each lights as it is satisfied, so anyone can answer
 * "what do we still need?" in half a second: 🏮×3 delivered · 👥 everyone home ·
 * 🔥 no one a Wisp. Drawn glyphs (never emoji).
 */
export function EscapeChecklist({ G }: { G: GState }) {
  const players = Object.values(G.players);
  const total = players.length;
  const atGate = players.filter((p) => p.nodeId === G.gateId).length;
  const lit = players.filter((p) => !p.wisp).length;

  const items = [
    { key: 'lanterns', label: 'Lanterns', have: G.lanternsDelivered, need: LANTERN_COUNT, glyph: 'lantern' as const },
    { key: 'gather', label: 'At the Gate', have: atGate, need: total, glyph: 'party' as const },
    { key: 'lit', label: 'Torches lit', have: lit, need: total, glyph: 'flame' as const },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-haze/40 bg-night/70 px-1.5 py-1 backdrop-blur"
      title="What you need to escape: 3 Lanterns delivered · everyone at the Gate · no one a Wisp"
      aria-label="Escape checklist"
    >
      {items.map((it) => {
        const done = it.have >= it.need;
        const color = done ? 'var(--color-ember-bright)' : 'var(--color-fog-dim)';
        return (
          <div
            key={it.key}
            className="flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: done ? 'rgba(240,168,48,0.12)' : 'transparent' }}
            title={`${it.label}: ${it.have} of ${it.need}`}
          >
            <motion.svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              animate={done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={done ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
              style={done ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
            >
              <ChecklistGlyph glyph={it.glyph} color={color} />
            </motion.svg>
            <span className="font-display text-[11px] tabular-nums" style={{ color }}>
              {it.have}/{it.need}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistGlyph({ glyph, color }: { glyph: 'lantern' | 'party' | 'flame'; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (glyph === 'lantern')
    return (
      <g {...common}>
        <path d="M9 8 Q12 3 15 8" />
        <rect x="7.5" y="8" width="9" height="12" rx="2" />
        <path d="M12 11 v6" />
      </g>
    );
  if (glyph === 'party')
    return (
      <g {...common}>
        <circle cx="8" cy="8" r="2.4" />
        <path d="M4.5 20 v-3 a3.5 3.5 0 0 1 7 0 v3" />
        <circle cx="16" cy="8" r="2.4" />
        <path d="M12.5 20 v-3 a3.5 3.5 0 0 1 7 0 v3" />
      </g>
    );
  // flame
  return (
    <g {...common}>
      <path d="M12 3 C 17 9 14.5 15 12 15 C 9.5 15 7 9 12 3 Z" fill={color} fillOpacity={0.3} />
      <path d="M8 18 h8 M9 21 h6" />
    </g>
  );
}
