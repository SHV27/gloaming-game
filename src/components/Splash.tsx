import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SHV Studios splash → the title. Embers coalesce into "SHV STUDIOS", hold, then
 * dissolve into "GLOAMING". Short, gorgeous, skippable (tap / any key). Shown once
 * per session. This is the first of the first-60-seconds beats (PLAN onboarding).
 */
let _splashSeen = false;
export const splashSeen = () => _splashSeen;
export const markSplashSeen = () => {
  _splashSeen = true;
};

// Seeded ember scatter that converges toward the wordmark.
const EMBERS = (() => {
  let s = 4242;
  const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  return Array.from({ length: 40 }, () => ({
    fromX: (rnd() - 0.5) * 900,
    fromY: (rnd() - 0.5) * 700,
    size: 1.5 + rnd() * 3,
    delay: rnd() * 0.7,
    dur: 1.1 + rnd() * 0.8,
  }));
})();

export function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<0 | 1>(0); // 0 = studio, 1 = title

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2600);
    const t2 = setTimeout(() => onDone(), 5200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex cursor-pointer items-center justify-center overflow-hidden bg-void"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="button"
      aria-label="Skip intro"
    >
      {/* warm floor glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 50% at 50% 50%, rgba(240,168,48,0.12) 0%, transparent 60%)' }}
      />

      <AnimatePresence mode="wait">
        {phase === 0 ? (
          <motion.div
            key="studio"
            className="relative flex flex-col items-center"
            exit={{ opacity: 0, filter: 'blur(8px)', scale: 1.04 }}
            transition={{ duration: 0.6 }}
          >
            {/* embers converging into the wordmark */}
            {EMBERS.map((e, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-ember"
                style={{ width: e.size, height: e.size, filter: 'blur(0.5px)' }}
                initial={{ x: e.fromX, y: e.fromY, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: [0, 0.9, 0] }}
                transition={{ duration: e.dur, delay: e.delay, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
            <motion.div
              className="font-display text-5xl font-bold tracking-[0.32em] text-ember-bright text-glow-ember sm:text-6xl"
              initial={{ opacity: 0, letterSpacing: '0.6em', filter: 'blur(10px)' }}
              animate={{ opacity: 1, letterSpacing: '0.32em', filter: 'blur(0px)' }}
              transition={{ delay: 0.7, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              SHV STUDIOS
            </motion.div>
            <motion.div
              className="mt-3 font-body text-[11px] uppercase tracking-[0.5em] text-fog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
            >
              presents
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="title" className="relative flex flex-col items-center">
            <motion.h1
              className="font-display text-6xl font-bold tracking-[0.16em] text-ember-bright text-glow-ember sm:text-8xl"
              initial={{ opacity: 0, scale: 0.86, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              GLOAMING
            </motion.h1>
            <motion.p
              className="mt-4 font-body text-sm italic tracking-[0.2em] text-fog"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.9 }}
            >
              trapped inside
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute bottom-8 font-display text-[10px] uppercase tracking-[0.4em] text-fog-dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1.6 }}
      >
        tap to skip
      </motion.div>
    </motion.div>
  );
}
