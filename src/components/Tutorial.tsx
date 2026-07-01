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
    body: 'Dusk is becoming night, and the night here is alive — and it is hunting you. You are Lanternbearers. Light the three Beacons, gather every bearer at the Threshold, and cross together — before the Night drowns the last of the light.',
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
    eyebrow: 'Your lifeline',
    title: 'Ember is everything',
    body: "One resource: Ember. It is your life, your fuel, and your fire — you spend it to be Bold, and to feed the Beacons. Each round the deepening night gnaws a little away. If your Ember ever reaches zero you don't die — you become a drifting Wisp, and an ally must reach you to bring you back.",
    accent: ember,
    motif: (c) => (
      <g>
        <path d={`M60 24 C 78 44 72 66 60 66 C 48 66 42 44 60 24 Z`} fill={c} opacity="0.9" style={{ filter: `drop-shadow(0 0 10px ${c})` }} />
        <rect x="40" y="82" width="40" height="7" rx="3.5" fill="none" stroke={c} strokeWidth="1.5" opacity="0.6" />
        <rect x="40" y="82" width="26" height="7" rx="3.5" fill={c} opacity="0.85" />
      </g>
    ),
  },
  {
    eyebrow: 'Your turn — the whole rule',
    title: 'Roll, walk, then Brave or Steady',
    body: 'Roll your Stride die and step along the glowing paths. Then the place you stand on reacts — and you make ONE choice. BRAVE it: a bold play that spends Ember for a bigger prize and a real risk. Or STEADY: play it safe and gather Ember. Every turn is just that. The game shows you the cost before you commit.',
    accent: glacier,
    motif: (c) => (
      <g>
        <rect x="18" y="46" width="30" height="30" rx="6" fill="none" stroke={c} strokeWidth="2" />
        <circle cx="27" cy="55" r="2.4" fill={c} />
        <circle cx="39" cy="67" r="2.4" fill={c} />
        <path d="M52 61 h14" stroke={c} strokeWidth="2" strokeDasharray="3 4" />
        <path d="M74 50 l12 0 0 22 -12 0" fill="none" stroke="var(--color-ember)" strokeWidth="2" />
        <path d="M92 50 l10 0 0 22 -10 0" fill="none" stroke={c} strokeWidth="2" />
        <text x="80" y="66" fontSize="9" fill="var(--color-ember)" textAnchor="middle" className="font-display">B</text>
        <text x="97" y="66" fontSize="9" fill={c} textAnchor="middle" className="font-display">S</text>
      </g>
    ),
  },
  {
    eyebrow: 'The board plays back',
    title: 'The Gloaming shows its hand',
    body: 'After you act, the board takes its turn — and it tells you what it means to do NEXT: snuff a Beacon, thorn a road shut, wake a Stalker toward your weakest, or surge the Night. You see the blow coming — so outwit it. As the Night deepens through Dusk, the Gloaming, and Pitch, it grows bolder and faster.',
    accent: dread,
    motif: (c) => (
      <g>
        <path d="M60 26 l7 12 14 2 -10 10 3 14 -14 -8 -14 8 3 -14 -10 -10 14 -2 z" fill="none" stroke={c} strokeWidth="2" />
        <circle cx="60" cy="60" r="4.5" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
        <path d="M30 92 q30 -14 60 0" fill="none" stroke="var(--color-dread-bright)" strokeWidth="2" opacity="0.7" />
      </g>
    ),
  },
  {
    eyebrow: 'Together, or not at all',
    title: 'Carry each other into the dawn',
    body: 'No one crosses alone. Reach a fallen ally and Rekindle their light. To win, every bearer must stand at the Threshold with all three Beacons lit — and the Gloaming will try to snuff one out just as you gather. In larger parties, one of you may be secretly Marked, willing the dark to win: you get one accusation to Cast them Out. Now — light the dark.',
    accent: glacier,
    motif: (c) => (
      <g>
        <circle cx="44" cy="60" r="10" fill={c} opacity="0.85" />
        <circle cx="76" cy="60" r="6" fill="none" stroke="var(--color-ember)" strokeWidth="2" strokeDasharray="2 3" />
        <circle cx="76" cy="60" r="2.5" fill="var(--color-ember)" style={{ filter: `drop-shadow(0 0 5px var(--color-ember))` }} />
        <path d="M55 60 q10 -10 16 0" fill="none" stroke="var(--color-ember)" strokeWidth="2" />
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
