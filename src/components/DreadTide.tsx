import { motion } from 'framer-motion';
import { DREAD_STRIKE_RATIOS } from '../game/constants';

/**
 * The Dread tide — our visible tension clock (CLAUDE §6 "make time visible").
 * A vertical column of black water that rises toward NIGHT; threshold marks show
 * where the Gloaming starts striking harder.
 */
export function DreadTide({ dread, dreadMax }: { dread: number; dreadMax: number }) {
  const r = Math.min(1, dread / dreadMax);
  const near = r >= 0.66;

  return (
    <div className="flex h-full select-none flex-col items-center gap-2">
      <div className="font-display text-[10px] uppercase tracking-[0.3em] text-dread-bright/80">
        Night
      </div>

      <div className="relative w-9 flex-1 overflow-hidden rounded-full border border-haze/40 bg-night/80">
        {/* threshold ticks */}
        {DREAD_STRIKE_RATIOS.map((ratio) => (
          <div
            key={ratio}
            className="absolute left-0 right-0 z-20 h-px bg-dread/50"
            style={{ bottom: `${ratio * 100}%` }}
            title={`The dark strikes harder past ${Math.round(ratio * dreadMax)}`}
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
          {/* restless wave surface */}
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
          className={`font-display text-lg leading-none ${near ? 'text-dread-bright text-glow-dread' : 'text-fog'}`}
        >
          {dread}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-fog-dim">/ {dreadMax}</div>
      </div>
    </div>
  );
}

/** Filter applied to the board so the world literally desaturates as Dread climbs. */
export function dreadFilter(dread: number, dreadMax: number): string {
  const r = Math.min(1, dread / dreadMax);
  return `saturate(${(1 - r * 0.72).toFixed(3)}) brightness(${(1 - r * 0.32).toFixed(3)})`;
}
