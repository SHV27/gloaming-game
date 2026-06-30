import { motion } from 'framer-motion';

/** Themed loading state while the game chunk arrives. */
export function Loader({ label = 'Kindling the dark…' }: { label?: string }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 bg-void">
      <motion.div
        className="h-4 w-4 rounded-full bg-ember"
        style={{ filter: 'drop-shadow(0 0 12px var(--color-ember))' }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="font-display text-xs uppercase tracking-[0.4em] text-ember/70">{label}</span>
    </div>
  );
}
