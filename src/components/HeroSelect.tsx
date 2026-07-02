import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HEROES, type HeroId } from '../game/heroes';
import { SEAT_COLORS, SEAT_NAMES } from '../game/constants';
import { sound } from '../audio/sound';

/**
 * THE HEROES — character select (S6, Pillar 3). Silhouette art in the dusk style,
 * one line of rules each, hotseat pick order. The pairing itself is strategy: each
 * hero breaks one rule and no hero can win alone. 2-player games pick 2, etc.
 */
export function HeroSelect({
  names,
  onConfirm,
  onBack,
}: {
  names: string[];
  onConfirm: (heroes: HeroId[]) => void;
  onBack: () => void;
}) {
  const [picks, setPicks] = useState<(HeroId | null)[]>(() => Array(names.length).fill(null));
  const [active, setActive] = useState(0);
  const allPicked = picks.every(Boolean);

  const choose = (id: HeroId) => {
    sound.play('ui');
    const next = [...picks];
    next[active] = id;
    setPicks(next);
    const after = next.findIndex((p, i) => !p && i > active);
    const any = after >= 0 ? after : next.findIndex((p) => !p);
    if (any >= 0) setActive(any);
  };

  const begin = () => {
    if (!allPicked) return;
    sound.init();
    sound.play('beacon');
    onConfirm(picks as HeroId[]);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-y-auto bg-void px-4 py-8">
      {/* atmosphere */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 20%, rgba(240,168,48,0.09) 0%, transparent 60%), radial-gradient(80% 70% at 50% 120%, rgba(196,58,99,0.10) 0%, transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="mb-1 text-center">
          <h1 className="font-display text-3xl font-bold tracking-[0.18em] text-ember-bright text-glow-ember sm:text-4xl">
            CHOOSE YOUR HEROES
          </h1>
          <p className="mt-2 font-body text-sm italic text-fog">
            Every hero breaks one rule. No one gets out alone — the team does.
          </p>
        </div>

        {/* whose pick */}
        <div className="mt-5 flex items-center justify-center gap-2 font-display text-sm uppercase tracking-[0.2em]">
          {allPicked ? (
            <span className="text-ember-bright">All chosen — into the dusk</span>
          ) : (
            <motion.span
              key={active}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-parchment"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: SEAT_COLORS[active], boxShadow: `0 0 10px ${SEAT_COLORS[active]}` }}
              />
              <span style={{ color: SEAT_COLORS[active] }}>{names[active] || SEAT_NAMES[active]}</span>
              <span className="text-fog">— pick a hero</span>
            </motion.span>
          )}
        </div>

        {/* the roster of heroes */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HEROES.map((h) => {
            const chosenBy = picks
              .map((p, i) => (p === h.id ? i : -1))
              .filter((i) => i >= 0);
            return (
              <motion.button
                key={h.id}
                type="button"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => choose(h.id)}
                className="group relative flex flex-col items-center overflow-hidden rounded-xl border bg-dusk/70 p-4 text-center backdrop-blur transition-colors hover:bg-dusk"
                style={{ borderColor: `${h.accent}55` }}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: h.accent, boxShadow: `0 0 14px 1px ${h.accent}` }}
                />
                <div className="mt-1 h-28">
                  <svg width="86" height="112" viewBox="0 0 100 120">
                    <HeroSilhouette motif={h.motif} color={h.accent} />
                  </svg>
                </div>
                <div className="mt-1 font-display text-[13px] uppercase tracking-wide" style={{ color: h.accent }}>
                  {h.name}
                </div>
                <div className="font-body text-[10px] italic text-fog-dim">{h.epithet}</div>
                <div className="mt-2 min-h-[2.5rem] font-body text-[12px] leading-snug text-parchment/90">
                  {h.ability}
                </div>
                <div className="mt-2 min-h-[2rem] border-t border-white/5 pt-2 font-body text-[10px] leading-snug text-fog">
                  {h.play}
                </div>

                {/* who has already taken this hero */}
                {chosenBy.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {chosenBy.map((i) => (
                      <span
                        key={i}
                        className="rounded-full px-1.5 py-0.5 font-display text-[8px] uppercase tracking-wide"
                        style={{ background: `${SEAT_COLORS[i]}22`, color: SEAT_COLORS[i] }}
                      >
                        {names[i] || SEAT_NAMES[i]}
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* the party — click a seat to (re)assign it */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {names.map((nm, i) => {
            const hero = HEROES.find((h) => h.id === picks[i]);
            const isActive = i === active;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  sound.play('ui');
                  setActive(i);
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-white/[0.07]' : 'bg-night/40 hover:bg-white/[0.04]'
                }`}
                style={{ borderColor: isActive ? SEAT_COLORS[i] : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: SEAT_COLORS[i], boxShadow: `0 0 8px ${SEAT_COLORS[i]}` }}
                />
                <span className="min-w-0">
                  <span className="block font-display text-xs" style={{ color: SEAT_COLORS[i] }}>
                    {nm || SEAT_NAMES[i]}
                  </span>
                  <span className="block font-body text-[10px] text-fog-dim">
                    {hero ? hero.name : 'choosing…'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* controls */}
        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              sound.play('ui');
              onBack();
            }}
            className="font-display text-xs uppercase tracking-widest text-fog-dim hover:text-parchment"
          >
            ‹ Back
          </button>
          <AnimatePresence>
            {allPicked && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={begin}
                className="rounded-lg border border-ember-bright bg-ember px-8 py-3 font-display text-base uppercase tracking-[0.2em] text-ink shadow-[0_0_28px_-4px_var(--color-ember)] hover:bg-ember-bright"
              >
                Into the Dusk
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/** Drawn silhouettes (never Unicode glyphs) — each reads its ability at a glance. */
function HeroSilhouette({ motif, color }: { motif: string; color: string }) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (motif) {
    case 'swift': // a runner mid-stride, motion streaks behind
      return (
        <g>
          <g {...line} strokeOpacity={0.4}>
            <path d="M8 42 h18 M2 58 h20 M10 74 h14" />
          </g>
          <circle cx="60" cy="26" r="9" fill={color} />
          <g {...line}>
            <path d="M60 35 L52 66" />
            <path d="M52 66 L40 92 M52 66 L70 86" />
            <path d="M56 46 L76 40 M56 50 L38 60" />
          </g>
        </g>
      );
    case 'lamplighter': // a figure holding a lantern aloft
      return (
        <g>
          <circle cx="44" cy="30" r="9" fill={color} />
          <g {...line}>
            <path d="M44 39 V78" />
            <path d="M44 78 L34 104 M44 78 L56 104" />
            <path d="M44 52 L30 64" />
            <path d="M44 50 L66 34" />
          </g>
          {/* the lantern, glowing */}
          <g style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
            <path d={`M70 20 h14 l2 20 h-18 z`} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={2} />
            <path d="M72 20 q5 -8 10 0" fill="none" stroke={color} strokeWidth={2} />
          </g>
        </g>
      );
    case 'emberheart': // a line figure with a small glowing heart at the chest
      return (
        <g>
          <circle cx="50" cy="26" r="9" fill={color} />
          <g {...line}>
            <path d="M50 35 V74" />
            <path d="M50 74 L40 100 M50 74 L60 100" />
            <path d="M50 52 L34 66 M50 52 L66 66" />
          </g>
          <path
            d="M50 40 c -3.5 -4.5 -10 -1 -7 4.5 c 1.6 3 7 6 7 7 c 0 -1 5.4 -4 7 -7 c 3 -5.5 -3.5 -9 -7 -4.5 z"
            fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </g>
      );
    case 'unseen': // a hooded, half-faded figure
      return (
        <g opacity={0.85}>
          <path
            d="M50 14 C 30 14 26 40 28 60 C 30 84 34 98 34 104 L 66 104 C 66 98 70 84 72 60 C 74 40 70 14 50 14 Z"
            fill={color}
            fillOpacity={0.14}
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray="4 5"
          />
          <path d="M40 40 q10 -10 20 0" fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.6} />
          <circle cx="50" cy="46" r="2.4" fill={color} />
        </g>
      );
    case 'stubborn': // a planted figure with a tall, steady flame above
      return (
        <g>
          <path
            d="M50 30 C 62 44 58 60 50 60 C 42 60 38 44 50 30 Z"
            fill={color}
            style={{ filter: `drop-shadow(0 0 10px ${color})` }}
          />
          <circle cx="50" cy="52" r="4" fill="var(--color-ember-glow)" />
          <g {...line}>
            <path d="M50 62 V90" />
            <path d="M50 90 L40 106 M50 90 L60 106" />
            <path d="M50 70 L36 78 M50 70 L64 78" />
          </g>
          {/* firm ground */}
          <path d="M34 108 h32" stroke={color} strokeWidth={2} strokeOpacity={0.5} />
        </g>
      );
    default:
      return <circle cx="50" cy="60" r="20" fill={color} />;
  }
}
