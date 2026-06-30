import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { eventById } from '../game/events';
import type { EventType, Effect } from '../game/types';
import { sound } from '../audio/sound';
import { narrate, type NarrationContext, type Reskin } from '../game/narrator';

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

type Chip = { text: string; tone: 'good' | 'bad' | 'neutral' };
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Mechanical cost of a choice, shown as chips so AI flavour never hides the trade. */
function costChips(effects: Effect[]): Chip[] {
  const out: Chip[] = [];
  for (const e of effects) {
    const a = e.amount ?? 0;
    switch (e.kind) {
      case 'light':
        out.push({ text: `${sign(a)} ☼`, tone: a >= 0 ? 'good' : 'bad' });
        break;
      case 'embers':
        out.push({ text: `${sign(a)} ✦`, tone: a >= 0 ? 'good' : 'bad' });
        break;
      case 'dread':
        out.push({ text: `${sign(a)} dread`, tone: a > 0 ? 'bad' : 'good' });
        break;
      case 'beaconEmber':
        out.push({ text: '+ beacon', tone: 'good' });
        break;
      case 'grantItem':
        out.push({ text: '+ item', tone: 'good' });
        break;
      case 'ward':
        out.push({ text: 'ward', tone: 'good' });
        break;
      case 'cleanseEdge':
        out.push({ text: 'path mends', tone: 'good' });
        break;
      case 'corruptEdge':
        out.push({ text: 'path rots', tone: 'bad' });
        break;
      case 'doubleNextDrain':
        out.push({ text: 'hunted', tone: 'bad' });
        break;
      case 'pullToDark':
        out.push({ text: 'dragged', tone: 'bad' });
        break;
    }
  }
  return out;
}

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
  ai,
  context,
}: {
  cardId: number;
  onChoose: (index: number) => void;
  ai: boolean;
  context: NarrationContext;
}) {
  const card = eventById(cardId);
  const [reskin, setReskin] = useState<Reskin | null>(null);
  const [fetching, setFetching] = useState(ai);

  // Render the hand-authored card immediately; if the Living Narrator answers,
  // crossfade to its words. Never block the game on the network.
  useEffect(() => {
    let cancelled = false;
    if (!ai) return;
    setFetching(true);
    narrate(card, context)
      .then((r) => {
        if (!cancelled) setReskin(r);
      })
      .finally(() => !cancelled && setFetching(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const title = reskin?.title ?? card.title;
  const narration = reskin?.narration ?? card.narrator;
  const choices = card.choices.map((c, i) => ({
    label: reskin?.choices[i]?.label ?? c.label,
    outcome: reskin?.choices[i]?.outcome ?? c.outcome,
    effects: c.effects,
  }));
  const lines = narration.split(/(?<=[.!?])\s+/).filter(Boolean);
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

            <motion.h2 variants={line} className="mb-4 flex items-center gap-2 font-display text-2xl text-parchment text-engraved">
              {title}
              {ai && (
                <span
                  className="font-body text-[10px] uppercase tracking-widest"
                  style={{ color: accent, opacity: fetching ? 1 : reskin ? 0.7 : 0.3 }}
                  title={reskin ? 'Narrated by the Living Gloaming' : fetching ? 'The Gloaming finds its words…' : 'The Gloaming kept its silence'}
                >
                  {fetching ? '✦ stirring…' : reskin ? '✦ living' : ''}
                </span>
              )}
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
              {choices.map((c, i) => (
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
                  <span className="flex-1 font-body text-[15px] text-parchment/90 group-hover:text-parchment">
                    {c.label}
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {costChips(c.effects).map((chip, k) => (
                      <span
                        key={k}
                        className="rounded px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wide"
                        style={{
                          color: chip.tone === 'good' ? 'var(--color-ember-bright)' : chip.tone === 'bad' ? 'var(--color-dread-bright)' : 'var(--color-fog)',
                          background: chip.tone === 'good' ? 'rgba(240,168,48,0.12)' : chip.tone === 'bad' ? 'rgba(196,58,99,0.14)' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        {chip.text}
                      </span>
                    ))}
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
