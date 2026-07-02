import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GState } from '../game/types';
import { turnControls } from '../game/phase';
import { lanternOnNode } from '../game/effects';

/**
 * THE SCRIPTED FIRST TURN (S6, §8) — teach-by-playing. On the very first game, a
 * light coach walks the player through their real first turn: roll → step to a
 * glowing tile → (grab a Lantern if one's in reach) → watch the board take its
 * turn → "this is how you leave" (the Escape Checklist). ~60–90s, skippable,
 * re-openable. No rules to read; the world teaches itself.
 */
let _coachDone = false;
export const coachActive = () => !_coachDone;
export const markCoachDone = () => {
  _coachDone = true;
};
export const reopenCoach = () => {
  _coachDone = false;
};

interface Step {
  text: string;
  arrow: 'down' | 'up' | null;
}

function currentStep(G: GState, currentPlayer: string, playerID: string | null): Step {
  const ctrl = turnControls(G, currentPlayer, playerID);
  const me = G.players[currentPlayer];
  if (ctrl.phase === 'roll')
    return { text: 'Welcome. Tap ① Roll to Move to begin your turn — the die decides how far you go.', arrow: 'down' };
  if (ctrl.phase === 'move')
    return { text: 'Now tap a glowing gold tile to walk there. The gold shows how far you can reach.', arrow: null };
  // rolled + no move left, or moved — time to act
  const onLantern = me && lanternOnNode(G, me.nodeId);
  if (onLantern) return { text: "You're on a Lantern! Tap ③ Grab the Lantern — it fills your torch. Carry it to the Gate.", arrow: 'down' };
  return { text: 'Take your one action, or tap End Turn. Then watch the board: the dark eats an edge and the Hollow One steps.', arrow: 'down' };
}

export function Coach({
  G,
  currentPlayer,
  playerID,
  turn,
  onDone,
}: {
  G: GState;
  currentPlayer: string;
  playerID: string | null;
  turn: number;
  onDone: () => void;
}) {
  // the coach covers only the very first turn; once it ends, we're done
  useEffect(() => {
    if (turn > 1) onDone();
  }, [turn, onDone]);

  const myTurn = playerID === currentPlayer;
  if (turn > 1 || !myTurn) return null;
  const step = currentStep(G, currentPlayer, playerID);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.text}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-ember/50 bg-night/90 px-4 py-3 backdrop-blur"
          style={{ boxShadow: '0 0 30px -8px var(--color-ember)' }}
        >
          <motion.span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ember/20 font-display text-ember-bright"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            ✦
          </motion.span>
          <p className="font-body text-[13px] leading-snug text-parchment/90">{step.text}</p>
          <button
            type="button"
            onClick={onDone}
            className="shrink-0 self-start font-display text-[10px] uppercase tracking-widest text-fog-dim hover:text-parchment"
          >
            Skip
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
