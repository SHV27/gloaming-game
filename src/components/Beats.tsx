import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Beat, LogTone } from '../game/types';
import { SEAT_COLORS } from '../game/constants';
import { EventGlyph } from './EventCard';

/**
 * CAUSE → EFFECT beats (S6, Pillar 1). One structured record, two views here: a
 * transient banner that names what just happened, and a turn-log strip of the last
 * few beats as icon lines — so a player who looked away can reconstruct the game.
 */
const TONE_COLOR: Record<LogTone, string> = {
  neutral: 'var(--color-fog)',
  hope: 'var(--color-ember-bright)',
  dread: 'var(--color-dread-bright)',
  fellow: 'var(--color-seat-2)',
};

export function BeatGlyph({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  if (icon === 'gate')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}>
        <path d="M6 20 V9 Q12 2 18 9 V20" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="13" r="2" fill={color} />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}>
      <EventGlyph icon={icon} color={color} />
    </svg>
  );
}

const DRAMATIC = new Set(['event', 'catch', 'wisp', 'rescue', 'gate-open', 'act', 'deliver', 'escape', 'swallowed']);

/** The transient banner — the newest dramatic beat, named cause → effect. */
export function BeatBanner({ beats }: { beats: Beat[] }) {
  const [shown, setShown] = useState<Beat | null>(null);
  const lastId = useRef(-1);
  useEffect(() => {
    let b: Beat | undefined;
    for (let i = beats.length - 1; i >= 0; i--) if (DRAMATIC.has(beats[i].kind)) { b = beats[i]; break; }
    if (!b || b.id === lastId.current) return;
    lastId.current = b.id;
    setShown(b);
    const dwell = b.kind === 'gate-open' || b.kind === 'escape' ? 4200 : b.kind === 'act' ? 3200 : 2600;
    const t = setTimeout(() => setShown((cur) => (cur?.id === b!.id ? null : cur)), dwell);
    return () => clearTimeout(t);
  }, [beats]);

  const big = shown?.kind === 'gate-open' || shown?.kind === 'escape';
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, y: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className={`flex items-center gap-2.5 rounded-full border bg-night/85 backdrop-blur ${big ? 'px-6 py-2.5' : 'px-4 py-1.5'}`}
            style={{ borderColor: `${TONE_COLOR[shown.tone]}66`, boxShadow: `0 0 24px -6px ${TONE_COLOR[shown.tone]}` }}
          >
            <BeatGlyph icon={shown.icon} color={TONE_COLOR[shown.tone]} size={big ? 26 : 18} />
            <span className="font-display uppercase tracking-wide" style={{ color: shown.seat != null ? SEAT_COLORS[shown.seat] : TONE_COLOR[shown.tone], fontSize: big ? 15 : 12 }}>
              {shown.cause}
            </span>
            <span className="font-display text-fog" style={{ fontSize: big ? 13 : 10 }}>→</span>
            <span className="font-body italic text-parchment/90" style={{ fontSize: big ? 14 : 11.5 }}>
              {shown.effect}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The turn-log strip — the last few beats as tiny icon lines. */
export function BeatStrip({ beats }: { beats: Beat[] }) {
  const recent = beats.slice(-4).reverse();
  if (!recent.length) return null;
  return (
    <div className="space-y-1">
      {recent.map((b, i) => (
        <div
          key={b.id}
          className="flex items-center gap-1.5 truncate font-body text-[11px] leading-tight"
          style={{ opacity: 1 - i * 0.18 }}
        >
          <BeatGlyph icon={b.icon} color={TONE_COLOR[b.tone]} size={13} />
          <span className="font-display uppercase" style={{ color: b.seat != null ? SEAT_COLORS[b.seat] : TONE_COLOR[b.tone], fontSize: 9.5 }}>
            {b.cause}
          </span>
          <span className="truncate text-parchment/70">
            {b.effect}
            {b.count && b.count > 1 && <span className="text-fog-dim"> ×{b.count}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
