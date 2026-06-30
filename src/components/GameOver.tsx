import { motion } from 'framer-motion';
import type { GState, GameoverState } from '../game/types';
import { Button } from '../ui/Button';

const COPY: Record<
  GameoverState['reason'],
  { title: string; line: string; tone: 'win' | 'lose' }
> = {
  crossed: {
    title: 'The Threshold Opens',
    line: 'Three beacons burn behind you. Hand in hand, the bearers step through into a morning no one was promised. You crossed.',
    tone: 'win',
  },
  nightfell: {
    title: 'Night Falls',
    line: 'The tide reaches the last of the light and pulls it under. The Gloaming was patient, and the Gloaming has won.',
    tone: 'lose',
  },
  'all-lost': {
    title: 'No One Remains',
    line: 'One by one the lanterns went out. The board keeps its silence, and its new and quiet guests.',
    tone: 'lose',
  },
  'marked-foiled': {
    title: 'The Threshold Opens',
    line: 'The true bearers cross into the dawn — and the one who walked among them, willing the dark to win, is left behind on the wrong side of the light.',
    tone: 'win',
  },
  'marked-triumph': {
    title: 'The Night Was Always Theirs',
    line: 'The dark wins — as one of you always meant it to. The traitor smiles in the dying light.',
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

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-void/96 p-6 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* slow swell behind the verdict */}
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
          {win ? 'Survivors' : 'The Gloaming'}
        </div>
        <h1
          className="mt-3 font-display text-5xl"
          style={{ color: accent, textShadow: `0 0 30px ${accent}66` }}
        >
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-md font-body text-base italic leading-relaxed text-parchment/85">
          {copy.line}
        </p>

        {gameover.markedId != null && G.players[gameover.markedId] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mx-auto mt-6 max-w-sm rounded-lg border border-dread/40 bg-dread/10 px-5 py-3"
          >
            <div className="font-display text-[10px] uppercase tracking-[0.35em] text-dread-bright/80">
              The Marked
            </div>
            <div className="mt-1 font-display text-xl text-dread-bright text-glow-dread">
              {G.players[gameover.markedId].name} walked among you.
            </div>
          </motion.div>
        )}

        <div className="mt-6 flex items-center justify-center gap-6 font-display text-sm text-fog">
          <span>{G.beaconsLit}/3 beacons lit</span>
          <span className="text-haze">·</span>
          <span>
            {Object.values(G.players).filter((p) => p.alive).length}/
            {Object.values(G.players).length} bearers stood
          </span>
        </div>

        <div className="mt-8">
          <Button variant={win ? 'beacon' : 'primary'} onClick={onRestart}>
            Walk the dusk again
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
