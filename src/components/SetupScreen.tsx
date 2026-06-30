import { useState } from 'react';
import { motion } from 'framer-motion';
import { SEAT_NAMES, SEAT_COLORS } from '../game/constants';
import { sound } from '../audio/sound';

const MIN = 2;
const MAX = 4; // S1 slice; S2 raises to 6
const MIN_MARKED = 4; // the Marked is offered at 4+ seats

export interface StartOpts {
  marked: boolean;
  ai: boolean;
}

// Seeded organic ember scatter (no diagonal lattice).
const EMBERS = (() => {
  let s = 1337;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: 22 }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    size: 1 + Math.round(rnd() * 2.5),
    blur: rnd() < 0.5 ? 0 : 1,
    rise: 10 + rnd() * 20,
    peak: 0.4 + rnd() * 0.4,
    dur: 3.5 + rnd() * 4,
    delay: rnd() * 5,
  }));
})();

export function SetupScreen({ onStart }: { onStart: (names: string[], opts: StartOpts) => void }) {
  const [count, setCount] = useState(3);
  const [names, setNames] = useState<string[]>(SEAT_NAMES.slice(0, MAX).map((n) => n));
  const [marked, setMarked] = useState(false);
  const [ai, setAi] = useState(false);

  const markedAvailable = count >= MIN_MARKED;

  const start = () => {
    sound.init();
    sound.play('beacon');
    const roster = Array.from({ length: count }, (_, i) => names[i]?.trim() || SEAT_NAMES[i]);
    onStart(roster, { marked: marked && markedAvailable, ai });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void p-6">
      {/* atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 35%, rgba(240,168,48,0.10) 0%, transparent 60%), radial-gradient(80% 80% at 50% 120%, rgba(196,58,99,0.12) 0%, transparent 60%)',
        }}
      />
      {EMBERS.map((e, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full bg-ember/60"
          style={{
            left: `${e.x}%`,
            top: `${e.y}%`,
            width: e.size,
            height: e.size,
            filter: `blur(${e.blur}px)`,
          }}
          animate={{ y: [0, -e.rise, 0], opacity: [0.08, e.peak, 0.08] }}
          transition={{ duration: e.dur, repeat: Infinity, delay: e.delay, ease: 'easeInOut' }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="font-display text-6xl font-bold tracking-[0.18em] text-ember-bright text-glow-ember">
            GLOAMING
          </h1>
          <p className="mt-2 font-body text-sm italic tracking-wide text-fog">
            The board that plays back.
          </p>
        </div>

        <div className="rounded-xl border border-haze/40 bg-dusk/70 p-6 backdrop-blur">
          <p className="mb-5 font-body text-[13px] leading-relaxed text-parchment/80">
            Light the <span className="text-ember">three Beacons</span> and bring every bearer to the{' '}
            <span className="text-ember-bright">Threshold</span> — before the{' '}
            <span className="text-dread-bright">Dread tide</span> drowns the last of the light.
          </p>

          {/* count */}
          <div className="mb-5">
            <label className="mb-2 block font-display text-[11px] uppercase tracking-[0.3em] text-ember/70">
              Bearers
            </label>
            <div className="flex gap-2">
              {Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    sound.play('ui');
                    setCount(n);
                  }}
                  className={`h-11 flex-1 rounded-md border font-display text-lg transition-colors ${
                    count === n
                      ? 'border-ember/70 bg-ember/20 text-ember-bright'
                      : 'border-white/10 bg-white/5 text-fog hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* names */}
          <div className="mb-6 space-y-2">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: SEAT_COLORS[i], boxShadow: `0 0 8px ${SEAT_COLORS[i]}` }}
                />
                <input
                  value={names[i] ?? ''}
                  maxLength={14}
                  onChange={(e) => {
                    const next = [...names];
                    next[i] = e.target.value;
                    setNames(next);
                  }}
                  placeholder={SEAT_NAMES[i]}
                  className="w-full rounded-md border border-white/10 bg-night/60 px-3 py-2 font-body text-sm text-parchment placeholder:text-fog-dim focus:border-ember/50 focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* modes */}
          <div className="mb-6 space-y-2">
            <Toggle
              on={marked && markedAvailable}
              disabled={!markedAvailable}
              onClick={() => setMarked((v) => !v)}
              label="The Marked walks among you"
              hint={markedAvailable ? 'One bearer secretly serves the dark.' : 'Needs 4+ bearers.'}
              tone="dread"
            />
            <Toggle
              on={ai}
              onClick={() => setAi((v) => !v)}
              label="Living Narrator (AI)"
              hint="The Gloaming tells its own story. Falls back to the deck with no key."
              tone="ember"
            />
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={start}
            className="w-full rounded-lg border border-ember-bright bg-ember py-3 font-display text-base uppercase tracking-[0.2em] text-ink shadow-[0_0_28px_-4px_var(--color-ember)] hover:bg-ember-bright"
          >
            Into the Dusk
          </motion.button>
        </div>

        <p className="mt-4 text-center font-body text-[11px] text-fog-dim">
          Pass-and-play · one device · hand it on at each turn
        </p>
      </motion.div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
  hint,
  tone,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  tone: 'dread' | 'ember';
  disabled?: boolean;
}) {
  const accent = tone === 'dread' ? 'var(--color-dread)' : 'var(--color-ember)';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sound.play('ui');
        onClick();
      }}
      className="flex w-full items-center gap-3 rounded-md border border-white/10 bg-night/50 px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-40"
    >
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: on ? accent : 'var(--color-haze)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all"
          style={{ left: on ? '1.25rem' : '0.125rem' }}
        />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xs uppercase tracking-wide text-parchment">{label}</span>
        <span className="block font-body text-[11px] text-fog-dim">{hint}</span>
      </span>
    </button>
  );
}
