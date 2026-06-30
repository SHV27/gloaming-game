import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sound } from '../audio/sound';

// In-memory "seen" flag (no localStorage, per the brief).
let _seen = false;
export const tutorialSeen = () => _seen;
export const markTutorialSeen = () => {
  _seen = true;
};

/**
 * "The Gloaming teaches you" — a skippable, in-character first-play tour. Six
 * grimoire beats that get a player to "I get it" in ~60s. Each step has a drawn
 * motif (no Unicode glyphs) so it reads like an illustrated rulebook.
 */

type Step = {
  eyebrow: string;
  title: string;
  body: string;
  motif: (c: string) => ReactNode;
  accent: string;
};

const ember = 'var(--color-ember)';
const dread = 'var(--color-dread)';
const glacier = 'var(--color-seat-2)';

const STEPS: Step[] = [
  {
    eyebrow: 'The world',
    title: 'You walk into the Gloaming',
    body: 'Dusk is becoming night, and night here is a hungry thing. You are Lanternbearers. Light the three Beacons, then bring every bearer to the Threshold — and cross before the dark drinks the last of your light.',
    accent: ember,
    motif: (c) => (
      <g>
        <circle cx="60" cy="60" r="34" fill="none" stroke={c} strokeWidth="2" opacity="0.5" />
        <circle cx="60" cy="60" r="10" fill={c} style={{ filter: `drop-shadow(0 0 10px ${c})` }} />
        <path d="M60 6 v-0 M60 110 v4 M6 60 h-0 M110 60 h4" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </g>
    ),
  },
  {
    eyebrow: 'The clock',
    title: 'The Dread tide only rises',
    body: 'On the left, a column of black water. Every turn it climbs — and as it does, the whole world dims and cools and a heartbeat quickens. Past its midnight, the dark strikes harder and a Stalker wakes. Read the tide. Race it.',
    accent: dread,
    motif: (c) => (
      <g>
        <rect x="48" y="14" width="24" height="92" rx="12" fill="none" stroke={c} strokeWidth="2" opacity="0.5" />
        <rect x="48" y="56" width="24" height="50" rx="12" fill={c} opacity="0.85" />
        <path d="M48 56 q12 -8 24 0" fill="none" stroke="var(--color-dread-bright)" strokeWidth="2" />
      </g>
    ),
  },
  {
    eyebrow: 'Your turn — first',
    title: 'An Omen, and a price',
    body: 'Each turn opens with an Omen the board whispers to you. Every choice has a cost shown in plain chips — embers, warmth, dread. There are no free gifts in the dark; choose the price you can pay.',
    accent: glacier,
    motif: (c) => (
      <g>
        <rect x="34" y="22" width="52" height="72" rx="6" fill="none" stroke={c} strokeWidth="2" />
        <path d="M44 40 h32 M44 52 h32 M44 64 h20" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <rect x="44" y="76" width="32" height="10" rx="3" fill={c} opacity="0.3" />
      </g>
    ),
  },
  {
    eyebrow: 'Your turn — then',
    title: 'Roll, walk, and act',
    body: 'Roll your Stride, then step along the glowing paths. Where you stand decides what you can do: feed embers to a Beacon, draw embers or warmth at a Wellspring, gamble at a Shrine, or steady your flame. Dare to Press On for more — at a rising risk.',
    accent: ember,
    motif: (c) => (
      <g>
        <rect x="22" y="44" width="32" height="32" rx="6" fill="none" stroke={c} strokeWidth="2" />
        <circle cx="32" cy="54" r="2.5" fill={c} />
        <circle cx="44" cy="66" r="2.5" fill={c} />
        <path d="M58 60 h22" stroke={c} strokeWidth="2" strokeDasharray="3 4" />
        <circle cx="92" cy="60" r="12" fill="none" stroke={c} strokeWidth="2" />
        <circle cx="92" cy="60" r="4" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
      </g>
    ),
  },
  {
    eyebrow: 'Your turn — last',
    title: 'End your turn — the board answers',
    body: 'When you pass, the Gloaming plays back: the tide rises, it strikes, the Stalker steps closer. Share embers and warmth with allies on your node, and lift the fallen — alone, no one crosses. This is a game you win together.',
    accent: glacier,
    motif: (c) => (
      <g>
        <circle cx="44" cy="60" r="10" fill={c} opacity="0.8" />
        <circle cx="76" cy="60" r="10" fill="var(--color-seat-1)" opacity="0.8" />
        <path d="M54 60 h12" stroke={c} strokeWidth="2" />
        <path d="M60 44 v32" stroke={c} strokeWidth="1.5" opacity="0.4" />
      </g>
    ),
  },
  {
    eyebrow: 'And one more thing',
    title: 'Not everyone wants the dawn',
    body: 'In larger parties, one of you may be secretly Marked by the Gloaming — willing the night to fall. Trust carefully. You have a single accusation to Cast Out a traitor: be right and the dark recoils; be wrong and it feasts. Now — light the dark, and cross together.',
    accent: dread,
    motif: (c) => (
      <g>
        <path d="M60 28 l8 14 16 2 -12 11 4 16 -16 -9 -16 9 4 -16 -12 -11 16 -2 z" fill="none" stroke={c} strokeWidth="2" />
        <circle cx="60" cy="62" r="4" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
      </g>
    ),
  },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const next = () => {
    sound.play('ui');
    if (last) onClose();
    else setI((n) => n + 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-[rgba(6,5,14,0.92)] backdrop-blur-md" />

      <motion.div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border bg-gradient-to-b from-twilight to-night shadow-[0_40px_100px_-24px_rgba(0,0,0,0.9)]"
        style={{ borderColor: `${step.accent}55` }}
        initial={{ y: 24, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: step.accent, boxShadow: `0 0 18px 1px ${step.accent}` }}
        />

        <div className="flex flex-col items-center px-8 pb-7 pt-9 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <svg width="120" height="120" viewBox="0 0 120 120" className="mb-4">
                {step.motif(step.accent)}
              </svg>
              <div className="font-display text-[11px] uppercase tracking-[0.4em]" style={{ color: step.accent }}>
                {step.eyebrow}
              </div>
              <h2 className="mt-2 font-display text-2xl text-parchment text-engraved">{step.title}</h2>
              <p className="mt-4 max-w-md font-body text-[15px] leading-relaxed text-parchment/85">{step.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* progress */}
          <div className="mt-7 flex items-center gap-2">
            {STEPS.map((_, k) => (
              <button
                key={k}
                type="button"
                aria-label={`Step ${k + 1}`}
                onClick={() => setI(k)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: k === i ? 22 : 7,
                  background: k === i ? step.accent : 'var(--color-haze)',
                }}
              />
            ))}
          </div>

          <div className="mt-6 flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => {
                sound.play('ui');
                onClose();
              }}
              className="font-display text-xs uppercase tracking-widest text-fog-dim hover:text-parchment"
            >
              Skip
            </button>
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={next}
              className="rounded-lg border px-7 py-2.5 font-display text-sm uppercase tracking-[0.18em]"
              style={{ borderColor: step.accent, color: last ? 'var(--color-ink)' : step.accent, background: last ? step.accent : `${step.accent}1a` }}
            >
              {last ? 'Into the Dusk' : 'Next'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
