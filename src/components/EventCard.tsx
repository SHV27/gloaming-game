import { motion } from 'framer-motion';
import type { EventCard as EventCardT, EventTone } from '../game/types';

/**
 * An Event, as an illustrated card — icon + ≤4 words + a one-line effect + a tone.
 * No prose paragraphs (PLAN §B.5). Icons are hand-drawn SVG (never Unicode emoji).
 */
const TONE: Record<EventTone, string> = {
  dread: 'var(--color-dread-bright)',
  hope: 'var(--color-ember-bright)',
  calm: 'var(--color-fog)',
};

/** A tiny, plain-language effect so a first-timer knows what the card just did. */
export function effectText(card: EventCardT): string {
  const a = card.effect.amount ?? 0;
  switch (card.effect.kind) {
    case 'torchAll':
      return a >= 0 ? `every torch +${a}` : `every torch −${-a}`;
    case 'nightmareStep':
      return `the Hollow One lurches +${a} step${a === 1 ? '' : 's'}`;
    case 'darkBite':
      return `the dark eats +${a} more tile${a === 1 ? '' : 's'}`;
    case 'lanternFlare':
      return 'torches near a Lantern flare up';
    case 'falseDawn':
      return 'a lost tile flickers back';
    default:
      return 'a held breath — nothing stirs';
  }
}

export function EventGlyph({ icon, color }: { icon: string; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (icon) {
    case 'frost': // a six-armed frost star
      return (
        <g {...common}>
          <path d="M12 3 v18 M4.5 7 l15 10 M19.5 7 l-15 10" />
          <path d="M12 6 l-2 -2 M12 6 l2 -2 M12 18 l-2 2 M12 18 l2 2" />
        </g>
      );
    case 'eye': // the Nightmare's opening eye
      return (
        <g {...common}>
          <path d="M3 12 Q12 5 21 12 Q12 19 3 12 Z" />
          <circle cx="12" cy="12" r="3" fill={color} stroke="none" />
        </g>
      );
    case 'crack': // a splitting edge / falling bridge
      return (
        <g {...common}>
          <path d="M4 4 L10 10 L7 13 L13 19" />
          <path d="M20 5 L14 11 L17 14 L11 20" />
        </g>
      );
    case 'lantern': // a flaring lantern
      return (
        <g {...common}>
          <rect x="7" y="8" width="10" height="12" rx="2" />
          <path d="M9 8 Q12 3 15 8" />
          <path d="M12 12 v4 M10 14 h4" />
        </g>
      );
    case 'dawn': // a rising sun over the horizon
      return (
        <g {...common}>
          <path d="M3 18 h18" />
          <path d="M7 18 a5 5 0 0 1 10 0" />
          <path d="M12 6 v-2 M5 9 l-1.5 -1.5 M19 9 l1.5 -1.5" />
        </g>
      );
    case 'wind': // a warm current
      return (
        <g {...common}>
          <path d="M3 9 h11 a2 2 0 1 0 -2 -2" />
          <path d="M3 14 h14 a2 2 0 1 1 -2 2" />
        </g>
      );
    default: // calm — a held breath
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 9 v6" strokeOpacity="0.5" />
        </g>
      );
  }
}

// ── The Omen — the next card sits face-down, but its SUIT is visible: one glance
//    of dread or hope, still uncertain in detail (telegraphed-but-uncertain). ────
const SUIT: Record<EventTone, { label: string; color: string }> = {
  dread: { label: 'cruel', color: 'var(--color-dread-bright)' },
  hope: { label: 'kind', color: 'var(--color-ember-bright)' },
  calm: { label: 'wild', color: 'var(--color-fog)' },
};

function SuitGlyph({ tone, color }: { tone: EventTone | null; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tone === 'dread')
    // a bared skull — cruelty coming
    return (
      <g {...common}>
        <path d="M6 10 a6 6 0 0 1 12 0 v3 a3 3 0 0 1 -2 2 v2 h-8 v-2 a3 3 0 0 1 -2 -2 z" />
        <circle cx="9.5" cy="10.5" r="1.6" fill={color} stroke="none" />
        <circle cx="14.5" cy="10.5" r="1.6" fill={color} stroke="none" />
        <path d="M12 13 v2 M10 19 v2 M12 19 v2 M14 19 v2" />
      </g>
    );
  if (tone === 'hope')
    // a four-point spark — a kindness
    return (
      <g {...common}>
        <path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z" fill={color} fillOpacity={0.25} />
      </g>
    );
  if (tone === 'calm')
    // a bolt — wild, unpredictable
    return (
      <g {...common}>
        <path d="M13 3 L7 13 h4 l-2 8 8 -11 h-4 z" fill={color} fillOpacity={0.25} />
      </g>
    );
  // unknown (the deck is about to reshuffle)
  return (
    <g {...common}>
      <path d="M9 9 a3 3 0 1 1 4 2.5 c -1 0.7 -1 1.5 -1 2.5" />
      <circle cx="12" cy="18" r="0.6" fill={color} stroke="none" />
    </g>
  );
}

/** The face-down next card, showing only its suit. */
export function OmenCard({ tone }: { tone: EventTone | null }) {
  const s = tone ? SUIT[tone] : { label: 'unknown', color: 'var(--color-fog-dim)' };
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-lg border border-dashed bg-gradient-to-b from-twilight/50 to-night/50 px-2.5 py-1.5"
      style={{ borderColor: `${s.color}66` }}
      title={`The dark's next card is ${s.label}`}
    >
      <svg width={20} height={20} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 4px ${s.color}55)` }}>
        <SuitGlyph tone={tone} color={s.color} />
      </svg>
      <div className="min-w-0">
        <div className="font-display text-[8px] uppercase tracking-[0.28em] text-fog-dim">Next omen</div>
        <div className="font-display text-[11px] uppercase tracking-wide" style={{ color: s.color }}>
          {s.label}
        </div>
      </div>
    </motion.div>
  );
}

export function EventCardView({ card, compact }: { card: EventCardT; compact?: boolean }) {
  const color = TONE[card.tone];
  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, rotateY: 90, y: 6 }}
      animate={{ opacity: 1, rotateY: 0, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-2.5 rounded-lg border bg-gradient-to-b from-twilight/70 to-night/70 ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}
      style={{ borderColor: `${color}55` }}
      title={`${card.words} — ${effectText(card)}`}
    >
      <svg width={compact ? 22 : 30} height={compact ? 22 : 30} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 5px ${color}66)` }}>
        <EventGlyph icon={card.icon} color={color} />
      </svg>
      <div className="min-w-0">
        <div className="font-display text-[8px] uppercase tracking-[0.3em] text-fog-dim">The dark plays</div>
        <div className="truncate font-display text-sm uppercase tracking-wide" style={{ color }}>
          {card.words}
        </div>
        <div className={`mt-0.5 truncate font-body italic text-parchment/70 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {effectText(card)}
        </div>
      </div>
    </motion.div>
  );
}
