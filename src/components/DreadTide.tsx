import { motion } from 'framer-motion';
import type { Act } from '../game/types';
import { ACT_NAMES } from '../game/constants';

/**
 * The Dark gauge — the visible doom clock. The board itself *is* the clock (it is
 * being eaten inward), so this is only a slim read of how far the dark has come and
 * which Act we're in. A column that fills from the top down (the dark pressing in).
 */
export function DarkColumn({
  eaten,
  total,
  act,
}: {
  eaten: number;
  total: number;
  act: Act;
}) {
  const r = Math.min(1, total > 0 ? eaten / total : 0);
  const near = r >= 0.6;

  return (
    <div
      className="flex h-full select-none flex-col items-center gap-2"
      role="meter"
      aria-label={`The dark — ${ACT_NAMES[act]}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={eaten}
      aria-valuetext={`${ACT_NAMES[act]}: the dark has eaten ${eaten} of ${total} tiles`}
    >
      <div className="font-display text-[10px] uppercase tracking-[0.24em] text-dread-bright/80">
        Dark
      </div>

      <div className="relative w-9 flex-1 overflow-hidden rounded-full border border-haze/40 bg-night/80" aria-hidden="true">
        {/* the dark pressing DOWN from the top (the edges closing to the center) */}
        <motion.div
          className="absolute inset-x-0 top-0 z-10"
          animate={{ height: `${r * 100}%` }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          style={{
            background:
              'linear-gradient(180deg, var(--color-void) 0%, var(--color-dread-deep) 60%, var(--color-dread) 100%)',
            boxShadow: '0 0 22px -2px var(--color-dread)',
          }}
        >
          <motion.svg
            className="absolute inset-x-0 bottom-0 h-3 w-full overflow-visible"
            viewBox="0 0 48 8"
            preserveAspectRatio="none"
            animate={near ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.85 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.path
              fill="var(--color-dread)"
              d="M-48 4 Q-36 8 -24 4 T0 4 T24 4 T48 4 T72 4 V-4 H-48 Z"
              animate={{ x: [0, 48] }}
              transition={{ duration: near ? 2.2 : 3.6, repeat: Infinity, ease: 'linear' }}
            />
          </motion.svg>
        </motion.div>

        {/* the surviving island of light at the bottom */}
        <div className="absolute inset-x-0 bottom-0 z-0 h-full bg-gradient-to-t from-ember/10 to-transparent" />
      </div>

      <div className="text-center">
        <div
          className={`font-display text-[10px] uppercase leading-none tracking-wider ${near ? 'text-dread-bright text-glow-dread' : 'text-fog'}`}
        >
          {ACT_NAMES[act]}
        </div>
      </div>
    </div>
  );
}

/** Filter applied to the board so the world desaturates + darkens as the dark spreads. */
export function boardFilter(eaten: number, total: number): string {
  const r = Math.min(1, total > 0 ? eaten / total : 0);
  return `saturate(${(1 - r * 0.6).toFixed(3)}) brightness(${(1 - r * 0.14).toFixed(3)})`;
}
