import { motion } from 'framer-motion';
import type { Act } from '../game/types';
import { ACT_RATIOS, ACT_NAMES } from '../game/constants';

/**
 * The Night tide — our visible tension clock (CLAUDE §6 "make time visible").
 * A vertical column of black water that rises toward nightfall; the tick marks
 * are the Act boundaries (Dusk → Gloaming → Pitch), where the Gloaming gains a
 * new power and the tide quickens.
 */
export function NightTide({
  night,
  nightMax,
  act,
}: {
  night: number;
  nightMax: number;
  act: Act;
}) {
  const r = Math.min(1, night / nightMax);
  const near = r >= 0.66;

  return (
    <div className="flex h-full select-none flex-col items-center gap-2">
      <div className="font-display text-[10px] uppercase tracking-[0.28em] text-dread-bright/80">
        Night
      </div>

      <div className="relative w-9 flex-1 overflow-hidden rounded-full border border-haze/40 bg-night/80">
        {/* Act boundaries */}
        {ACT_RATIOS.map((ratio, i) => (
          <div
            key={ratio}
            className="absolute left-0 right-0 z-20 h-px bg-dread/50"
            style={{ bottom: `${ratio * 100}%` }}
            title={`${ACT_NAMES[i + 1]} begins`}
          />
        ))}

        {/* the rising water */}
        <motion.div
          className="absolute inset-x-0 bottom-0 z-10"
          animate={{ height: `${r * 100}%` }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          style={{
            background:
              'linear-gradient(180deg, var(--color-dread-bright) 0%, var(--color-dread) 35%, var(--color-dread-deep) 100%)',
            boxShadow: '0 0 22px -2px var(--color-dread)',
          }}
        >
          <motion.svg
            className="absolute inset-x-0 top-0 h-3 w-full overflow-visible"
            viewBox="0 0 48 8"
            preserveAspectRatio="none"
            animate={near ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.85 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.path
              fill="var(--color-dread-bright)"
              d="M-48 4 Q-36 0 -24 4 T0 4 T24 4 T48 4 T72 4 V8 H-48 Z"
              animate={{ x: [0, 48] }}
              transition={{ duration: near ? 2.2 : 3.6, repeat: Infinity, ease: 'linear' }}
            />
          </motion.svg>
        </motion.div>
      </div>

      <div className="text-center">
        <div
          className={`font-display text-[10px] uppercase leading-none tracking-wider ${near ? 'text-dread-bright text-glow-dread' : 'text-fog'}`}
        >
          {ACT_NAMES[act]}
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-widest text-fog-dim">
          {night}/{nightMax}
        </div>
      </div>
    </div>
  );
}

/** Filter applied to the board so the world literally desaturates as Night climbs. */
export function nightFilter(night: number, nightMax: number): string {
  const r = Math.min(1, night / nightMax);
  return `saturate(${(1 - r * 0.78).toFixed(3)}) brightness(${(1 - r * 0.16).toFixed(3)})`;
}
