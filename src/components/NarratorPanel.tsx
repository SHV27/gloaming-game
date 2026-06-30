import { motion } from 'framer-motion';
import { eventById } from '../game/events';
import type { EventType } from '../game/types';
import { sound } from '../audio/sound';

const TYPE_LABEL: Record<EventType, string> = {
  gift: 'A Gift',
  trap: 'A Snare',
  riddle: 'A Riddle',
  bargain: 'A Bargain',
  stalker: 'It Draws Near',
};

const TYPE_COLOR: Record<EventType, string> = {
  gift: 'var(--color-ember)',
  trap: 'var(--color-dread)',
  riddle: 'var(--color-seat-3)',
  bargain: 'var(--color-seat-2)',
  stalker: 'var(--color-dread-bright)',
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: 'beforeChildren', delayChildren: 0.35, staggerChildren: 0.12 },
  },
};
const line = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function NarratorPanel({
  cardId,
  onChoose,
}: {
  cardId: number;
  onChoose: (index: number) => void;
}) {
  const card = eventById(cardId);
  const lines = card.narrator.split(/(?<=[.!?])\s+/).filter(Boolean);
  const accent = TYPE_COLOR[card.type];

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
    >
      {/* backdrop */}
      <motion.div
        className="absolute inset-0 bg-[rgba(8,7,16,0.74)] backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
      />

      {/* card */}
      <motion.div
        className="relative z-50 w-full max-w-xl"
        initial={{ y: 48, scale: 0.92, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.96, opacity: 0, transition: { duration: 0.22 } }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div
          className="overflow-hidden rounded-xl border bg-gradient-to-b from-twilight to-night p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
          style={{ borderColor: `${accent}66` }}
        >
          {/* glow seam */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: accent, boxShadow: `0 0 18px 1px ${accent}` }}
          />

          <motion.div variants={container} initial="hidden" animate="visible">
            <motion.div variants={line} className="mb-1 font-display text-[11px] uppercase tracking-[0.4em]" style={{ color: accent }}>
              {TYPE_LABEL[card.type]}
            </motion.div>

            <motion.h2 variants={line} className="mb-4 font-display text-2xl text-parchment text-engraved">
              {card.title}
            </motion.h2>

            <div className="mb-6 space-y-2">
              {lines.map((ln, i) => (
                <motion.p key={i} variants={line} className="font-body text-[15px] leading-relaxed text-parchment/90">
                  {ln}
                </motion.p>
              ))}
            </div>

            {/* choices — staggered in after the prose */}
            <motion.div
              className="flex flex-col gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { delayChildren: 0.5 + lines.length * 0.12, staggerChildren: 0.08 } },
              }}
            >
              {card.choices.map((c, i) => (
                <motion.button
                  key={i}
                  type="button"
                  variants={{
                    hidden: { opacity: 0, y: 10, scale: 0.97 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 26 } },
                  }}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    sound.play('ui');
                    onChoose(i);
                  }}
                  className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rotate-45 rounded-[1px]"
                    style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                  />
                  <span className="font-body text-[15px] text-parchment/90 group-hover:text-parchment">
                    {c.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
