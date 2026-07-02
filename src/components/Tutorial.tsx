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
    eyebrow: 'You are trapped inside',
    title: 'The dark eats the board',
    body: 'You are trapped inside a board game, and the dark is eating it from the edges inward. Every round the outermost tiles turn to void — the tiles fraying with red go next. When the dark reaches the middle, everyone is swallowed. So it herds you all toward the center.',
    accent: dread,
    motif: (c) => (
      <g>
        <circle cx="60" cy="60" r="42" fill="none" stroke="var(--color-void)" strokeWidth="10" opacity="0.9" />
        <circle cx="60" cy="60" r="30" fill="none" stroke={c} strokeWidth="2" strokeDasharray="3 5" opacity="0.7" />
        <circle cx="60" cy="60" r="10" fill="var(--color-ember)" style={{ filter: `drop-shadow(0 0 12px var(--color-ember))` }} />
        <path d="M60 18 A42 42 0 0 1 96 60" fill="none" stroke={c} strokeWidth="4" opacity="0.9" />
      </g>
    ),
  },
  {
    eyebrow: 'Your life is a flame',
    title: 'Keep your torch lit',
    body: 'Your torch burns down one notch every round. Refill it to full by reaching a Lantern or the Gate at the center. If it ever goes out you become a drifting Wisp — you cannot act, only drift toward the Gate, until a friend reaches you and relights your torch.',
    accent: ember,
    motif: (c) => (
      <g>
        <path d={`M60 22 C 80 44 72 68 60 68 C 48 68 40 44 60 22 Z`} fill={c} opacity="0.95" style={{ filter: `drop-shadow(0 0 12px ${c})` }} />
        <circle cx="60" cy="56" r="5" fill="var(--color-ember-glow)" />
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={38 + k * 12} y="84" width="7" height="14" rx="2" fill={k < 3 ? c : 'var(--color-night)'} opacity={k < 3 ? 0.9 : 0.5} />
        ))}
      </g>
    ),
  },
  {
    eyebrow: 'Grab, carry, deliver',
    title: 'The three Lanterns',
    body: 'Three Lanterns sit out at the dangerous edge. Walk onto one to grab it — it fills your torch, but its weight makes you move one slower. Carry it to the Gate to deliver it. If you are caught, you drop it where you fall, and someone must fetch it before the dark eats that tile.',
    accent: ember,
    motif: (c) => (
      <g>
        <rect x="24" y="50" width="20" height="24" rx="4" fill={c} stroke="var(--color-ember-bright)" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 8px ${c})` }} />
        <path d="M28 50 Q34 40 40 50" fill="none" stroke="var(--color-ember-bright)" strokeWidth="1.5" />
        <path d="M52 62 h30" stroke={c} strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#a)" />
        <path d="M80 56 l10 6 -10 6" fill="none" stroke={c} strokeWidth="2" />
        <path d="M96 50 v24 M90 55 q6 -8 12 0" fill="none" stroke="var(--color-ember-bright)" strokeWidth="2" />
      </g>
    ),
  },
  {
    eyebrow: 'It walks toward you',
    title: 'The Hollow One hunts',
    body: 'A thing called the Hollow One stalks the board, stepping toward the nearest torch each round — its glowing trail shows the whole path it will take, so you always see it coming. Reach you and you drop what you carry and are flung back into the dark. As the night deepens it wakes and quickens, and at the end it hunts whoever carries a Lantern. Bait it; the Gate is the one place it cannot follow.',
    accent: dread,
    motif: (c) => (
      <g>
        <path d="M60 30 l9 15 18 3 -12 12 4 18 -19 -10 -19 10 4 -18 -12 -12 18 -3 z" fill="var(--color-void)" stroke={c} strokeWidth="2" />
        <circle cx="60" cy="58" r="5" fill="var(--color-dread-bright)" style={{ filter: `drop-shadow(0 0 6px var(--color-dread-bright))` }} />
        <circle cx="90" cy="88" r="9" fill="none" stroke={c} strokeWidth="2" strokeDasharray="3 5" opacity="0.8" />
      </g>
    ),
  },
  {
    eyebrow: 'Your turn — the whole rule',
    title: 'Roll · Move · one action',
    body: 'Roll to move, then step to a glowing tile. Then one clear button appears for what you can do here: Grab a Lantern, Deliver it, Relight a friend, or End Turn. Then you watch the board: the dark eats, the Hollow One steps, a card flips. Win when all three Lanterns are home and everyone steps through the Gate — together.',
    accent: glacier,
    motif: (c) => (
      <g>
        <rect x="20" y="48" width="26" height="26" rx="6" fill="none" stroke={c} strokeWidth="2" />
        <circle cx="28" cy="56" r="2.2" fill={c} />
        <circle cx="38" cy="66" r="2.2" fill={c} />
        <text x="60" y="58" fontSize="11" fill={c} textAnchor="middle" className="font-display">①②③</text>
        <path d="M78 66 h20" stroke="var(--color-ember)" strokeWidth="2" strokeDasharray="3 4" />
        <path d="M92 50 l10 0 0 22 -10 0" fill="none" stroke="var(--color-ember)" strokeWidth="2" />
        <path d="M97 50 q5 -8 10 0" fill="none" stroke="var(--color-ember-bright)" strokeWidth="2" />
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
              {last ? "I'm ready" : 'Next'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
