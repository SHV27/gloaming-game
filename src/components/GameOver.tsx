import { motion } from 'framer-motion';
import type { GState, GameoverState } from '../game/types';
import { Button } from '../ui/Button';
import { LANTERN_COUNT } from '../game/constants';

const COPY: Record<GameoverState['reason'], { title: string; line: string; tone: 'win' | 'lose' }> = {
  escaped: {
    title: 'Out Into the Dawn',
    line: 'Three Lanterns burn at the Gate, and not one of you is left behind. Hand in hand, you step through — out of the board, into a morning no one promised you. You made it. Together.',
    tone: 'win',
  },
  swallowed: {
    title: 'The Dark Takes the Middle',
    line: 'The edges came in and in, and the last warm stone goes under. The board closes over you. There is no more light to reach.',
    tone: 'lose',
  },
};

export function GameOver({
  gameover,
  G,
  onRestart,
}: {
  gameover: GameoverState;
  G: GState;
  onRestart: () => void;
}) {
  const copy = COPY[gameover.reason];
  const win = copy.tone === 'win';
  const accent = win ? 'var(--color-ember-bright)' : 'var(--color-dread-bright)';
  const alight = Object.values(G.players).filter((p) => !p.wisp).length;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-void/96 p-6 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute h-[40rem] w-[40rem] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 60%)` }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="relative max-w-lg text-center"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 24 }}
      >
        <div className="font-display text-xs uppercase tracking-[0.5em]" style={{ color: accent }}>
          {win ? 'You Escaped' : 'The Dark'}
        </div>
        <h1 className="mt-3 font-display text-5xl" style={{ color: accent, textShadow: `0 0 30px ${accent}66` }}>
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-md font-body text-base italic leading-relaxed text-parchment/85">
          {copy.line}
        </p>

        <div className="mt-6 flex items-center justify-center gap-6 font-display text-sm text-fog">
          <span>{G.lanternsDelivered}/{LANTERN_COUNT} Lanterns home</span>
          <span className="text-haze">·</span>
          <span>{alight}/{Object.values(G.players).length} torches still lit</span>
        </div>

        <div className="mt-8">
          <Button variant={win ? 'beacon' : 'primary'} onClick={onRestart}>
            Play again
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
