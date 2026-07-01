import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BoardProps } from 'boardgame.io/react';
import type { GState, Player, OmenTone, Reaction } from '../game/types';
import { Dice } from './Dice';
import { Button } from '../ui/Button';
import { getReaction } from '../game/effects';
import { eventById } from '../game/events';
import { narrate, type Reskin } from '../game/narrator';
import { useShell } from './shell';
import { SEAT_COLORS, EMBER_MAX, REKINDLE_COST } from '../game/constants';

const TONE_ACCENT: Record<OmenTone | 'calm', string> = {
  gift: 'var(--color-ember)',
  trap: 'var(--color-dread)',
  bargain: 'var(--color-seat-2)',
  riddle: 'var(--color-seat-3)',
  stalker: 'var(--color-dread-bright)',
  calm: 'var(--color-parchment-dim)',
};
const TONE_LABEL: Record<OmenTone | 'calm', string> = {
  gift: 'A Gift',
  trap: 'A Snare',
  bargain: 'A Bargain',
  riddle: 'A Riddle',
  stalker: 'It Draws Near',
  calm: 'The Place',
};

/** The Living Narrator: re-skin the omen's prose for this moment (AI on + key
 *  present); always falls back to the hand-authored text. Only hollow/hearth
 *  reactions carry an omen; special tiles keep their intrinsic flavour. */
function useReskin(ai: boolean, omenId: number | null, G: GState, playerName: string) {
  const [reskin, setReskin] = useState<Reskin | null>(null);
  const [fetching, setFetching] = useState(false);
  const bucket = Math.round((G.night / Math.max(1, G.nightMax)) * 4);
  useEffect(() => {
    setReskin(null);
    if (!ai || omenId == null) {
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    narrate(eventById(omenId), {
      playerName,
      dread: G.night,
      dreadMax: G.nightMax,
      beaconsLit: G.beaconsLit,
      stalker: !!G.stalker,
      recentLog: G.log.slice(-4).map((l) => l.text),
    })
      .then((r) => !cancelled && setReskin(r))
      .finally(() => !cancelled && setFetching(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai, omenId, bucket, G.beaconsLit, playerName]);
  return { reskin, fetching };
}

const INTENT_ICON: Record<string, string> = {
  snuff: 'M4 12 Q8 4 12 12 M8 12 v-5', // a guttering flame
  seal: 'M3 8 h10 M5 5 l-2 3 2 3 M11 5 l2 3 -2 3', // a barred road
  stalk: 'M8 3 v10 M4 7 l4 -3 4 3', // an approaching eye/spike
  surge: 'M2 10 q3 -5 6 0 t6 0', // a rising wave
};

export function TurnHud({ props, myTurn }: { props: BoardProps<GState>; myTurn: boolean }) {
  const { G, ctx, moves } = props;
  const shell = useShell();
  const me = G.players[ctx.currentPlayer];
  const [accusing, setAccusing] = useState(false);

  // A Wisp's turn auto-resolves — drift already happened in onBegin; just pass.
  const autoPassed = useRef(-1);
  useEffect(() => {
    if (!myTurn || !G.autoWisp || ctx.gameover) return;
    if (autoPassed.current === ctx.turn) return;
    autoPassed.current = ctx.turn;
    const id = setTimeout(() => moves.endTurn(), 1500);
    return () => clearTimeout(id);
  }, [myTurn, G.autoWisp, ctx.turn, ctx.gameover, moves]);

  // The Living Narrator re-skins the omen prose (hollow/hearth only) when it's
  // this seat's turn to choose. Hooks stay unconditional (before the null guard).
  const meNode = me ? G.nodes[me.nodeId] : undefined;
  const omenId =
    me && meNode && (meNode.type === 'hollow' || meNode.type === 'hearth') && myTurn && G.hasRolled && !G.acted
      ? G.turnOmen
      : null;
  const { reskin, fetching } = useReskin(shell.aiNarrator, omenId, G, me?.name ?? '');

  if (!me) return null;

  const canChoose = myTurn && !me.wisp && !G.autoWisp && G.hasRolled && !G.acted;
  const reaction = getReaction(G, me);
  const braveLabel = (omenId != null && reskin?.choices?.[0]?.label) || reaction.brave.label;
  const wispAlliesHere = Object.values(G.players).filter(
    (p) => p.wisp && p.id !== me.id && p.nodeId === me.nodeId,
  );
  const canRekindleHere = wispAlliesHere.length > 0 && me.ember >= REKINDLE_COST + 1;

  const beaconsLeft = 3 - G.beaconsLit;
  const goal =
    beaconsLeft > 0
      ? `Light ${beaconsLeft} more Beacon${beaconsLeft === 1 ? '' : 's'}, then gather every bearer at the Threshold.`
      : 'The gate is open — bring every bearer to the Threshold to cross!';

  return (
    <div className="border-t border-haze/30 bg-dusk/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
        {/* identity + Ember */}
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
              {me.wisp && <span className="ml-2 text-xs text-dread-bright">· a Wisp</span>}
            </div>
            <EmberBar ember={me.ember} wisp={me.wisp} />
          </div>
        </div>

        {/* goal — always visible (clarity: "your goal right now") */}
        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <div className="font-display text-[10px] uppercase tracking-[0.3em] text-ember/60">Your goal</div>
          <div className="truncate font-body text-[13px] text-parchment/90">{goal}</div>
        </div>

        {/* the Gloaming's telegraphed intent — you see it coming */}
        <IntentReadout G={G} />

        {/* dice + roll */}
        <div className="flex items-center gap-3">
          <Dice value={G.lastRoll} />
          {myTurn && !me.wisp && !G.autoWisp && !G.hasRolled && (
            <Button variant="primary" onClick={() => moves.rollStride()}>
              Roll Stride
            </Button>
          )}
        </div>
      </div>

      {/* action row */}
      <div className="mx-auto mt-3 max-w-6xl">
        {!myTurn && <span className="font-body text-sm italic text-fog-dim">Not your turn.</span>}

        {myTurn && (me.wisp || G.autoWisp) && (
          <motion.span
            className="font-body text-sm italic text-dread-bright/90"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {me.name} is a Wisp — drifting toward the Hearth. An ally must reach you to Rekindle your light…
          </motion.span>
        )}

        {myTurn && !me.wisp && !G.autoWisp && !G.hasRolled && (
          <span className="font-body text-sm italic text-ember/80">
            Roll the Stride die to begin your turn.
          </span>
        )}

        {canChoose && (
          <div className="flex flex-col gap-3">
            {/* move hint */}
            {G.stride > 0 && (
              <span className="font-body text-xs italic text-ember/70">
                Stride {G.stride} — step to a glowing path, or act where you stand.
              </span>
            )}

            {/* the place reacts + Brave / Steady */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${me.nodeId}-${reaction.title}`}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-2 md:flex-row md:items-stretch"
              >
                {/* the grimoire — the place reacting, writing itself in */}
                <Grimoire
                  reaction={reaction}
                  title={(omenId != null && reskin?.title) || reaction.title}
                  narration={(omenId != null && reskin?.narration) || reaction.narration}
                  ai={shell.aiNarrator && omenId != null}
                  fetching={fetching}
                  living={!!(omenId != null && reskin)}
                />

                {/* choices */}
                <div className="flex shrink-0 gap-2">
                  <ChoiceButton
                    label={braveLabel}
                    preview={reaction.brave.preview}
                    reason={reaction.brave.reason}
                    enabled={reaction.brave.enabled}
                    tone="brave"
                    onClick={() => moves.brave()}
                  />
                  <ChoiceButton
                    label={reaction.steady.label}
                    preview={reaction.steady.preview}
                    enabled
                    tone="steady"
                    onClick={() => moves.steady()}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* fellowship: rekindle a fallen ally on your node */}
            {wispAlliesHere.map((a) => (
              <ChoiceButton
                key={a.id}
                label={`Rekindle ${a.name} (−${REKINDLE_COST} Ember)`}
                preview={canRekindleHere ? `Lift ${a.name} back into the light` : undefined}
                reason={canRekindleHere ? undefined : 'Not enough Ember to spare'}
                enabled={canRekindleHere}
                tone="fellow"
                onClick={() => moves.rekindle(a.id)}
              />
            ))}

            {/* the Marked's covert sabotage (only the Marked ever sees this) */}
            {me.role === 'marked' && !G.markedExposed && (
              <button
                type="button"
                disabled={G.sowedThisTurn || me.ember <= 2}
                onClick={() => moves.sow()}
                title="Quietly feed the dark: +1 Night, but it costs you 1 Ember. Once per turn. No one will know it was you."
                className="self-start rounded-md border border-dread/50 bg-dread/10 px-4 py-1.5 font-display text-xs uppercase tracking-wide text-dread-bright hover:bg-dread/20 disabled:opacity-30"
              >
                Sow the Dark
              </button>
            )}

            {/* the party's one accusation */}
            {G.hasMarked && !G.castOutUsed && (
              <CastOut
                players={Object.values(G.players).filter((p) => p.id !== me.id)}
                accusing={accusing}
                setAccusing={setAccusing}
                onCast={(id) => {
                  moves.castOut(id);
                  setAccusing(false);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── the grimoire: the place reacting, writing itself in like ink ─────────────
function Grimoire({
  reaction,
  title,
  narration,
  ai,
  fetching,
  living,
}: {
  reaction: Reaction;
  title: string;
  narration: string;
  ai: boolean;
  fetching: boolean;
  living: boolean;
}) {
  const accent = TONE_ACCENT[reaction.tone];
  const lines = narration.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-twilight/60 to-night/60 px-4 py-2.5">
      {/* tone seam */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
      />
      <div className="mb-0.5 flex items-center gap-2 pl-1.5">
        <span className="font-display text-[9px] uppercase tracking-[0.3em]" style={{ color: accent }}>
          {TONE_LABEL[reaction.tone]}
        </span>
        {ai && (
          <span
            className="font-body text-[9px] uppercase tracking-widest"
            style={{ color: accent, opacity: fetching ? 1 : living ? 0.75 : 0.3 }}
            title={living ? 'Narrated by the Living Gloaming' : fetching ? 'The Gloaming finds its words…' : ''}
          >
            {fetching ? '✦ stirring…' : living ? '✦ living' : ''}
          </span>
        )}
      </div>
      <div className="pl-1.5 font-display text-sm text-parchment text-engraved">{title}</div>
      <div className="mt-0.5 space-y-0.5 pl-1.5">
        {lines.map((ln, i) => (
          <motion.p
            key={`${title}-${i}`}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.1 + i * 0.14, duration: 0.5 }}
            className="font-body text-[13px] leading-snug text-parchment/80"
          >
            {ln}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

// ── ember readout ────────────────────────────────────────────────────────────
function EmberBar({ ember, wisp }: { ember: number; wisp: boolean }) {
  return (
    <div className="mt-0.5 flex items-center gap-2" title={`Ember ${ember}/${EMBER_MAX}`}>
      <span className={`font-display text-sm ${wisp ? 'text-fog-dim' : 'text-ember-bright'}`}>✦ {ember}</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-night">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (ember / EMBER_MAX) * 100)}%`,
            background: wisp
              ? 'var(--color-fog-dim)'
              : 'linear-gradient(90deg, var(--color-ember-deep), var(--color-ember-bright))',
            boxShadow: wisp ? undefined : '0 0 6px var(--color-ember)',
          }}
        />
      </div>
    </div>
  );
}

// ── the Gloaming's next move, telegraphed ────────────────────────────────────
function IntentReadout({ G }: { G: GState }) {
  if (!G.intents.length) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-haze/40 bg-night/40 px-3 py-1.5">
        <span className="font-body text-xs italic text-fog-dim">The Gloaming watches, and waits.</span>
      </div>
    );
  }
  return (
    <div className="flex max-w-md flex-col gap-1">
      <div className="font-display text-[10px] uppercase tracking-[0.3em] text-dread-bright/70">
        The Gloaming intends…
      </div>
      {G.intents.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--color-dread-bright)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={INTENT_ICON[it.kind]} />
          </svg>
          <span className="font-body text-[12px] leading-tight text-dread-bright/90">{it.telegraph}</span>
        </div>
      ))}
    </div>
  );
}

// ── a Brave / Steady / Rekindle choice ───────────────────────────────────────
function ChoiceButton({
  label,
  preview,
  reason,
  enabled,
  tone,
  onClick,
}: {
  label: string;
  preview?: string;
  reason?: string;
  enabled: boolean;
  tone: 'brave' | 'steady' | 'fellow';
  onClick: () => void;
}) {
  const variant = tone === 'brave' ? 'primary' : tone === 'fellow' ? 'beacon' : 'ghost';
  return (
    <div className="flex min-w-[8.5rem] flex-col">
      <Button variant={variant} disabled={!enabled} onClick={onClick} className="w-full justify-center">
        {label}
      </Button>
      <span
        className={`mt-1 text-center font-body text-[11px] ${
          reason ? 'text-dread-bright/80' : 'text-fog-dim'
        }`}
      >
        {reason ?? preview ?? ' '}
      </span>
    </div>
  );
}

// ── the accusation UI ────────────────────────────────────────────────────────
function CastOut({
  players,
  accusing,
  setAccusing,
  onCast,
}: {
  players: Player[];
  accusing: boolean;
  setAccusing: (v: boolean) => void;
  onCast: (id: string) => void;
}) {
  if (!accusing) {
    return (
      <button
        type="button"
        onClick={() => setAccusing(true)}
        title="Accuse one bearer of being Marked. Right: the dark recoils (−4 Night, their Sow is stilled). Wrong: the party fractures (+4 Night). One accusation per game."
        className="self-start rounded-md border border-haze/50 bg-white/5 px-4 py-1.5 font-display text-xs uppercase tracking-wide text-parchment hover:bg-white/10"
      >
        Cast Out…
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1 self-start rounded-md border border-dread/40 bg-dread/5 px-2 py-1">
      <span className="font-display text-[11px] uppercase tracking-wide text-dread-bright/80">Cast out:</span>
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onCast(p.id)}
          className="rounded border border-white/10 px-1.5 py-0.5 font-display text-[11px] hover:bg-white/10"
          style={{ color: SEAT_COLORS[p.seat] }}
        >
          {p.name}
        </button>
      ))}
      <button type="button" onClick={() => setAccusing(false)} className="px-1 text-[11px] text-fog-dim hover:text-parchment">
        ✕
      </button>
    </span>
  );
}
