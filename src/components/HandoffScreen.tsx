import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Pass-the-device interstitial. Covers the screen between turns so the previous
 * bearer's view is never on display when the next picks up — the hidden-info-safe
 * seam the S2 Marked reveal will plug into.
 */
export function HandoffScreen({
  name,
  color,
  onReady,
}: {
  name: string;
  color: string;
  onReady: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void/98 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <div className="font-display text-xs uppercase tracking-[0.5em] text-fog-dim">
          The lantern passes
        </div>

        <motion.div
          className="grid h-28 w-28 place-items-center rounded-full border-2"
          style={{ borderColor: color }}
          animate={{ boxShadow: [`0 0 0px ${color}`, `0 0 36px -4px ${color}`, `0 0 0px ${color}`] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <span className="font-display text-5xl" style={{ color }}>
            {name[0]}
          </span>
        </motion.div>

        <div>
          <div className="font-body text-sm text-fog">Hand the device to</div>
          <div className="font-display text-3xl tracking-wide" style={{ color }}>
            {name}
          </div>
        </div>

        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-display text-sm uppercase tracking-widest text-parchment hover:bg-white/10"
          >
            I am {name} — reveal my turn
          </button>
        ) : (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onReady}
            className="mt-2 rounded-lg border px-8 py-3 font-display text-sm uppercase tracking-widest"
            style={{ borderColor: color, color, background: `${color}1a` }}
          >
            Begin →
          </motion.button>
        )}

        <p className="mt-2 max-w-xs font-body text-xs italic text-fog-dim">
          Others, look away — the dark keeps its own counsel.
        </p>
      </motion.div>
    </motion.div>
  );
}
