import { motion } from 'framer-motion';

/**
 * The Marked's private reveal — shown once, at the start of their turn, AFTER
 * the handoff (so the role has entered this client's filtered view and the
 * previous bearer never glimpsed it). Hidden-info safe.
 */
export function RoleReveal({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-void/97 p-6 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute h-[34rem] w-[34rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(196,58,99,0.22) 0%, transparent 60%)' }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="relative max-w-md text-center"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="font-display text-[11px] uppercase tracking-[0.5em] text-dread-bright/80">
          A secret, for {name} alone
        </div>
        <h1 className="mt-4 font-display text-4xl text-dread-bright text-glow-dread">
          You are Marked.
        </h1>
        <p className="mx-auto mt-5 max-w-sm font-body text-[15px] italic leading-relaxed text-parchment/85">
          The Gloaming whispers only to you. Wear the bearers' face. Help just enough to be trusted —
          and see that the night falls before they ever reach the Threshold. Let the Dread rise. Let
          the beacons gutter. <span className="text-dread-bright">Win when the dark wins.</span>
        </p>
        <p className="mt-4 font-body text-xs text-fog-dim">
          On your turn you may quietly <span className="text-dread-bright">Sow</span> the dark — once
          each turn — and none will know it was you.
        </p>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDismiss}
          className="mt-7 rounded-lg border border-dread/60 bg-dread/15 px-8 py-3 font-display text-sm uppercase tracking-[0.2em] text-dread-bright hover:bg-dread/25"
        >
          I understand the dark
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
