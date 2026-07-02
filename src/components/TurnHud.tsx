import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BoardProps } from 'boardgame.io/react';
import type { GState, TileAction } from '../game/types';
import { Dice } from './Dice';
import { Button } from '../ui/Button';
import { EventCardView } from './EventCard';
import { getTileAction } from '../game/effects';
import { eventById } from '../game/events';
import { SEAT_COLORS, TORCH_MAX, LANTERN_COUNT } from '../game/constants';

/** The turn HUD — walks the player through ① ROLL → ② MOVE → ③ ACT, one glowing
 *  step at a time. Every legal action is a single obvious button; a turn can never
 *  dead-end (End Turn / Warm are always offered). */
export function TurnHud({
  props,
  myTurn,
  onWalk,
  reachableCount,
}: {
  props: BoardProps<GState>;
  myTurn: boolean;
  onWalk: (nodeId: number) => void;
  reachableCount: number;
}) {
  const { G, ctx, moves } = props;
  const me = G.players[ctx.currentPlayer];
  void onWalk;

  // A Wisp's turn auto-resolves — drift already happened in onBegin; just pass.
  const autoPassed = useRef(-1);
  useEffect(() => {
    if (!myTurn || !G.autoWisp || ctx.gameover) return;
    if (autoPassed.current === ctx.turn) return;
    autoPassed.current = ctx.turn;
    const id = setTimeout(() => moves.endTurn(), 1600);
    return () => clearTimeout(id);
  }, [myTurn, G.autoWisp, ctx.turn, ctx.gameover, moves]);

  if (!me) return null;

  const preRoll = myTurn && !me.wisp && !G.autoWisp && !G.hasRolled;
  const canAct = myTurn && !me.wisp && !G.autoWisp && G.hasRolled && !G.acted;
  const action = getTileAction(G, me);
  const lanternsLeft = LANTERN_COUNT - G.lanternsDelivered;
  const goal =
    lanternsLeft > 0
      ? `Carry ${lanternsLeft} more Lantern${lanternsLeft === 1 ? '' : 's'} to the Gate.`
      : 'All Lanterns home — gather everyone at the Gate and step through!';

  const doAction = (a: TileAction) => {
    switch (a.kind) {
      case 'grab': moves.grab(); break;
      case 'deliver': moves.deliver(); break;
      case 'relight': if (a.targetId) moves.relight(a.targetId); break;
      case 'warm': moves.warm(); break;
      case 'stepThrough': moves.stepThrough(); break;
      default: moves.endTurn();
    }
  };

  return (
    <div className="border-t border-haze/30 bg-dusk/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
        {/* identity + torch */}
        <div className="flex items-center gap-3">
          <span
            className="grid h-9 w-9 place-items-center rounded-full border-2 font-display text-sm"
            style={{ borderColor: SEAT_COLORS[me.seat], color: SEAT_COLORS[me.seat] }}
          >
            {me.name[0]}
          </span>
          <div>
            <div className="font-display text-sm tracking-wide" style={{ color: SEAT_COLORS[me.seat] }}>
              {me.name}
              {me.wisp && <span className="ml-2 text-xs text-fog">· a Wisp</span>}
              {me.carrying.length > 0 && <span className="ml-2 text-xs text-ember-bright">· carrying {me.carrying.length}</span>}
            </div>
            <TorchBar torch={me.torch} wisp={me.wisp} />
          </div>
        </div>

        {/* goal — always visible */}
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <div className="font-display text-[10px] uppercase tracking-[0.3em] text-ember/60">Your goal</div>
          <div className="truncate font-body text-[13px] text-parchment/90">{goal}</div>
        </div>

        {/* the last event card */}
        {G.lastEvent != null && (
          <AnimatePresence mode="wait">
            <EventCardView key={G.lastEvent} card={eventById(G.lastEvent)} compact />
          </AnimatePresence>
        )}

        {/* dice + roll (step ①) */}
        <div className="flex items-center gap-3">
          <Dice value={G.lastRoll} />
          {preRoll && (
            <Button variant="primary" onClick={() => moves.rollStride()}>
              ① Roll to Move
            </Button>
          )}
        </div>
      </div>

      {/* action row */}
      <div className="mx-auto mt-3 flex max-w-6xl flex-wrap items-center gap-4">
        {!myTurn && <span className="font-body text-sm italic text-fog-dim">Not your turn — watch the dark.</span>}

        {myTurn && (me.wisp || G.autoWisp) && (
          <motion.span
            className="font-body text-sm italic text-fog"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {me.name} is a Wisp — drifting to the Gate. A friend must reach you and Relight your torch…
          </motion.span>
        )}

        {preRoll && (
          <span className="font-body text-sm italic text-ember/80">Roll the die to begin — then step to a glowing tile.</span>
        )}

        {canAct && (
          <>
            {/* ② move hint */}
            <span className="font-body text-xs italic text-ember/70">
              {G.stride > 0 && reachableCount > 0
                ? `② Stride ${G.stride} — tap a glowing tile to move${me.carrying.length ? ' (a Lantern slows you)' : ''}, or act where you stand.`
                : '② No tile to reach — act where you stand.'}
            </span>

            {/* ③ the one obvious action */}
            <div className="flex flex-1 items-center justify-end gap-3">
              {action.preview && !action.reason && (
                <span className="hidden font-body text-xs text-fog sm:inline">{action.preview}</span>
              )}
              <div className="flex flex-col items-end">
                <Button
                  variant={action.kind === 'stepThrough' ? 'beacon' : action.kind === 'endTurn' ? 'ghost' : 'primary'}
                  disabled={!action.enabled}
                  onClick={() => doAction(action)}
                  title={action.reason ?? action.preview}
                >
                  ③ {action.label}
                </Button>
                {(action.reason || action.kind === 'endTurn') && (
                  <span className="mt-1 text-right font-body text-[11px] text-fog-dim">
                    {action.reason ?? 'Nothing to do here — pass the turn.'}
                  </span>
                )}
              </div>
              {action.kind !== 'endTurn' && (
                <Button variant="ghost" onClick={() => moves.endTurn()} title="Skip your action and pass.">
                  End Turn
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── the torch flame readout ──────────────────────────────────────────────────
function TorchBar({ torch, wisp }: { torch: number; wisp: boolean }) {
  return (
    <div className="mt-0.5 flex items-center gap-2" title={`Torch ${torch}/${TORCH_MAX}`}>
      <span className="flex items-center gap-0.5" aria-label={`Torch ${torch} of ${TORCH_MAX}`}>
        {Array.from({ length: TORCH_MAX }).map((_, i) => (
          <span
            key={i}
            className="inline-block h-3 w-1.5 rounded-full transition-all"
            style={{
              background: wisp
                ? 'var(--color-fog-dim)'
                : i < torch
                  ? 'linear-gradient(180deg, var(--color-ember-bright), var(--color-ember-deep))'
                  : 'var(--color-night)',
              boxShadow: !wisp && i < torch ? '0 0 5px var(--color-ember)' : undefined,
              opacity: i < torch || wisp ? 1 : 0.4,
            }}
          />
        ))}
      </span>
      <span className={`font-display text-xs ${wisp ? 'text-fog-dim' : torch <= 2 ? 'text-dread-bright' : 'text-ember-bright'}`}>
        {wisp ? 'out' : torch}
      </span>
    </div>
  );
}
