import { motion } from 'framer-motion';
import type { GState, GameoverState, LogTone } from '../game/types';
import { matchVerdict, matchTimeline, matchNumbers } from '../game/story';
import { SEAT_COLORS } from '../game/constants';
import { BeatGlyph } from './Beats';
import { sound } from '../audio/sound';

/**
 * THE MATCH STORY (S6, Pillar 2) — the post-game recap that turns every game into
 * a tale: a tiered NAMED ending, an illustrated timeline of the key beats, the few
 * numbers that matter, and — on a loss — what killed the run (losses become lessons).
 * A big warm Play Again closes the compulsion loop at its strongest moment.
 */
const TIER_ACCENT: Record<string, string> = {
  flawless: 'var(--color-ember-bright)',
  breath: 'var(--color-ember)',
  soclose: 'var(--color-dread-bright)',
  swallowed: 'var(--color-dread)',
};
const TONE_COLOR: Record<LogTone, string> = {
  neutral: 'var(--color-fog)',
  hope: 'var(--color-ember-bright)',
  dread: 'var(--color-dread-bright)',
  fellow: 'var(--color-seat-2)',
};

export function MatchStory({
  gameover,
  G,
  onPlayAgain,
  onChangeHeroes,
  onRestart,
}: {
  gameover: GameoverState;
  G: GState;
  onPlayAgain: () => void;
  onChangeHeroes: () => void;
  onRestart: () => void;
}) {
  const v = matchVerdict(G, gameover);
  const accent = TIER_ACCENT[v.tier];
  const timeline = matchTimeline(G);
  const numbers = matchNumbers(G);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-void/96 p-4 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-none fixed h-[44rem] w-[44rem] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 62%)` }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="relative my-6 w-full max-w-lg"
        initial={{ y: 26, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 24 }}
      >
        {/* verdict */}
        <div className="text-center">
          <div className="font-display text-xs uppercase tracking-[0.5em]" style={{ color: accent }}>
            {v.eyebrow}
          </div>
          <h1 className="mt-2 font-display text-5xl" style={{ color: accent, textShadow: `0 0 32px ${accent}66` }}>
            {v.title}
          </h1>
          <p className="mx-auto mt-4 max-w-md font-body text-[15px] italic leading-relaxed text-parchment/85">{v.line}</p>
        </div>

        {/* the loss-teacher — a lesson from the defeat */}
        {v.lossReason && (
          <div className="mx-auto mt-5 max-w-md rounded-lg border border-dread/40 bg-dread/10 px-4 py-3 text-center">
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-dread-bright/80">What ended it</div>
            <div className="mt-1 font-body text-[13px] text-parchment/90">{v.lossReason}</div>
          </div>
        )}

        {/* the timeline of key beats */}
        {timeline.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-center font-display text-[10px] uppercase tracking-[0.34em] text-fog">The tale</div>
            <div className="space-y-1.5 rounded-xl border border-haze/30 bg-night/50 p-3">
              {timeline.map((b, i) => (
                <motion.div
                  key={b.id}
                  className="flex items-center gap-2.5"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                >
                  <span className="w-8 shrink-0 text-right font-display text-[9px] uppercase tracking-wider text-fog-dim">
                    R{b.round}
                  </span>
                  <BeatGlyph icon={b.icon} color={TONE_COLOR[b.tone]} size={15} />
                  <span className="font-display text-[10px] uppercase tracking-wide" style={{ color: b.seat != null ? SEAT_COLORS[b.seat] : TONE_COLOR[b.tone] }}>
                    {b.cause}
                  </span>
                  <span className="truncate font-body text-[12px] text-parchment/75">{b.effect}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* the numbers that matter */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {numbers.map((num) => (
            <div key={num.label} className="rounded-lg border border-haze/25 bg-night/40 px-2 py-2 text-center">
              <div className="font-display text-base" style={{ color: accent }}>
                {num.value}
              </div>
              <div className="mt-0.5 font-body text-[9px] uppercase tracking-wide leading-tight text-fog-dim">{num.label}</div>
            </div>
          ))}
        </div>

        {/* close the compulsion loop */}
        <div className="mt-7 flex flex-col items-center gap-3">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              sound.play('beacon');
              onPlayAgain();
            }}
            className="w-full max-w-xs rounded-lg border border-ember-bright bg-ember py-3 font-display text-base uppercase tracking-[0.22em] text-ink shadow-[0_0_30px_-4px_var(--color-ember)] hover:bg-ember-bright"
          >
            Play Again
          </motion.button>
          <div className="flex items-center gap-5 font-display text-[11px] uppercase tracking-widest">
            <button type="button" onClick={onChangeHeroes} className="text-ember/80 hover:text-ember-bright">
              Change Heroes
            </button>
            <span className="text-haze">·</span>
            <button type="button" onClick={onRestart} className="text-fog-dim hover:text-parchment">
              New Party
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
