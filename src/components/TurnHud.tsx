import { useState } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { GState } from '../game/types';
import { Dice } from './Dice';
import { Button } from '../ui/Button';
import { ITEMS } from '../game/events';
import { strikeCount } from '../game/effects';
import {
  AP_BASE,
  PRESS_ON_MAX,
  BASE_STRIKES,
  LIGHT_MAX,
  EMBERS_PER_BEACON,
  GATHER_AMOUNT,
  STEADY_LIGHT,
  SEAT_COLORS,
} from '../game/constants';

export function TurnHud({ props, myTurn }: { props: BoardProps<GState>; myTurn: boolean }) {
  const { G, ctx, moves } = props;
  const [accusing, setAccusing] = useState(false);
  const me = G.players[ctx.currentPlayer];
  if (!me) return null;

  const node = G.nodes[me.nodeId];
  const budget = AP_BASE + G.pressOns;
  const actionsLeft = budget - G.actionsTaken;
  const canAct = myTurn && me.alive && !me.dimmed && !G.pendingEvent && actionsLeft > 0;
  const moveLocked = !myTurn || me.dimmed || !me.alive || !!G.pendingEvent;

  const beacon = node.type === 'beacon' ? G.beacons.find((b) => b.nodeId === node.id) : undefined;
  const onUnlitBeacon = beacon && !beacon.lit;
  const allies = Object.values(G.players).filter(
    (p) => p.id !== me.id && p.alive && p.nodeId === me.nodeId,
  );

  // What the board will do the instant this turn ends — the felt threat.
  const incomingStrikes = strikeCount(G, BASE_STRIKES);
  // Press-On delve success chance: roll a d6 ≥ (3 + current pressOns).
  const pressOdds = Math.max(0, Math.round(((4 - G.pressOns) / 6) * 100));

  return (
    <div className="border-t border-haze/30 bg-dusk/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3">
        {/* identity + vitals */}
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
              {me.dimmed && <span className="ml-2 text-xs text-dread-bright">· dimmed</span>}
              {!me.alive && <span className="ml-2 text-xs text-fog-dim">· lost</span>}
            </div>
            <Vitals light={me.light} embers={me.embers} />
          </div>
        </div>

        {/* beacons + status */}
        <div className="flex items-center gap-4 text-xs text-fog">
          <Tally label="Beacons" value={`${G.beaconsLit}/3`} hot={G.beaconsLit === 3} />
          {G.hasRolled && (
            <Tally label="Stride" value={String(G.stride)} hot={G.stride > 0 && !moveLocked} />
          )}
          <Tally label="Actions" value={`${Math.max(0, actionsLeft)}`} hot={canAct} />
        </div>

        <div className="flex-1" />

        {/* dice */}
        <div className="flex items-center gap-3">
          <Dice value={G.lastRoll} />
          {myTurn && me.alive && !me.dimmed && !G.hasRolled && !G.pendingEvent && (
            <Button variant="primary" onClick={() => moves.rollStride()}>
              Roll Stride
            </Button>
          )}
          {G.hasRolled && !moveLocked && G.stride > 0 && (
            <span className="max-w-[9rem] font-body text-xs italic text-ember/80">
              step to a glowing path…
            </span>
          )}
        </div>
      </div>

      {/* action row */}
      <div className="mx-auto mt-3 flex max-w-6xl flex-wrap items-center gap-2">
        {!myTurn && <span className="font-body text-sm italic text-fog-dim">Not your turn.</span>}

        {myTurn && !me.alive && (
          <span className="font-body text-sm italic text-fog-dim">
            This bearer is lost to the dark.
          </span>
        )}

        {myTurn && me.dimmed && me.alive && (
          <span className="font-body text-sm italic text-dread-bright/90">
            Your lantern is out. End your turn — an ally must reach you to lift you back.
          </span>
        )}

        {myTurn && me.alive && !me.dimmed && (
          <>
            {node.type === 'wellspring' && (
              <>
                <Button variant="ghost" disabled={!canAct} onClick={() => moves.gather('embers')}>
                  Draw +{GATHER_AMOUNT} Embers
                </Button>
                <Button variant="ghost" disabled={!canAct} onClick={() => moves.gather('light')}>
                  Draw +{GATHER_AMOUNT} Warmth
                </Button>
              </>
            )}

            {onUnlitBeacon && (
              <Button
                variant="beacon"
                disabled={!canAct || me.embers <= 0}
                onClick={() => moves.kindle(Math.min(me.embers, EMBERS_PER_BEACON - beacon!.embers))}
              >
                Kindle Beacon ({Math.min(me.embers, EMBERS_PER_BEACON - beacon!.embers)})
              </Button>
            )}

            {node.type === 'shrine' && (
              <Button variant="ghost" disabled={!canAct} onClick={() => moves.commune()}>
                Commune
              </Button>
            )}

            <Button variant="ghost" disabled={!canAct} onClick={() => moves.steady()}>
              Steady (+{STEADY_LIGHT} Warmth)
            </Button>

            {/* aid co-located allies */}
            {allies.map((a) => (
              <span key={a.id} className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1">
                <span className="font-display text-xs" style={{ color: SEAT_COLORS[a.seat] }}>
                  {a.name}:
                </span>
                <MiniBtn disabled={me.embers <= 0 || !myTurn} onClick={() => moves.aid(a.id, 'embers', 1)}>
                  +ember
                </MiniBtn>
                <MiniBtn disabled={me.light <= 1 || !myTurn} onClick={() => moves.aid(a.id, 'light', 1)}>
                  +warmth
                </MiniBtn>
                {a.dimmed && (
                  <MiniBtn disabled={!canAct || me.light <= 1} onClick={() => moves.aid(a.id, 'revive', 0)}>
                    revive
                  </MiniBtn>
                )}
              </span>
            ))}

            {/* items */}
            {me.items.map((it, i) => (
              <Button
                key={`${it}-${i}`}
                variant="ghost"
                title={ITEMS[it].blurb}
                onClick={() => moves.useItem(it)}
              >
                Use {ITEMS[it].name}
              </Button>
            ))}

            {/* the Marked's covert sabotage (only the Marked sees this) */}
            {me.role === 'marked' && (
              <button
                type="button"
                disabled={G.sowedThisTurn || me.light <= 1 || !!G.pendingEvent}
                onClick={() => moves.sow()}
                title="Quietly feed the dark: +1 Dread, but it costs you 1 Light. Once per turn. No one will know it was you."
                className="flex items-center gap-2 rounded-md border border-dread/50 bg-dread/10 px-4 py-2 font-display text-sm uppercase tracking-wide text-dread-bright hover:bg-dread/20 disabled:opacity-30"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 2 V14 M3 6 H13 M4.5 11 L11.5 11" />
                </svg>
                Sow the Dark
              </button>
            )}

            {/* the party's one accusation */}
            {G.hasMarked && !G.castOutUsed &&
              (accusing ? (
                <span className="flex items-center gap-1 rounded-md border border-dread/40 bg-dread/5 px-2 py-1">
                  <span className="font-display text-[11px] uppercase tracking-wide text-dread-bright/80">Cast out:</span>
                  {Object.values(G.players)
                    .filter((p) => p.id !== me.id && p.alive)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          moves.castOut(p.id);
                          setAccusing(false);
                        }}
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
              ) : (
                <button
                  type="button"
                  disabled={!!G.pendingEvent}
                  onClick={() => setAccusing(true)}
                  title="Accuse one bearer of being Marked. Right: the dark recoils (−4 Dread, their Sow is stilled). Wrong: the party fractures (+4 Dread). One accusation per game."
                  className="rounded-md border border-haze/50 bg-white/5 px-4 py-2 font-display text-sm uppercase tracking-wide text-parchment hover:bg-white/10 disabled:opacity-30"
                >
                  Cast Out…
                </button>
              ))}

            <div className="flex-1" />

            <span
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-xs uppercase tracking-wider ${
                incomingStrikes >= 3
                  ? 'border-dread/50 bg-dread/15 text-dread-bright text-glow-dread'
                  : 'border-haze/40 bg-night/40 text-fog'
              }`}
              title="What the Gloaming will do the moment you end your turn."
            >
              Gloaming strikes
              <span className="font-display text-base leading-none">×{incomingStrikes}</span>
            </span>

            <Button
              variant="danger"
              disabled={G.pressOns >= PRESS_ON_MAX || !!G.pendingEvent}
              title={`Delve for an extra action: roll ≥${3 + G.pressOns} to gain a boon (${pressOdds}% chance); fail and the dark takes ${G.pressOns + 1} Light + Dread. Also +1 Gloaming strike this turn.`}
              onClick={() => moves.pressOn()}
            >
              Press On · {pressOdds}%
            </Button>
            <Button variant="primary" disabled={!!G.pendingEvent} onClick={() => moves.endTurn()}>
              End Turn
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Vitals({ light, embers }: { light: number; embers: number }) {
  return (
    <div className="mt-0.5 flex items-center gap-3">
      <div className="flex items-center gap-1" title={`Light ${light}/${LIGHT_MAX}`}>
        {Array.from({ length: LIGHT_MAX }, (_, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: i < light ? 'var(--color-ember-bright)' : 'transparent',
              border: '1px solid var(--color-ember-deep)',
              boxShadow: i < light ? '0 0 6px var(--color-ember)' : 'none',
            }}
          />
        ))}
      </div>
      <span className="font-display text-xs text-ember">✦ {embers}</span>
    </div>
  );
}

function Tally({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="text-center">
      <div className={`font-display text-base leading-none ${hot ? 'text-ember-bright text-glow-ember' : 'text-parchment'}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-fog-dim">{label}</div>
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-white/10 px-1.5 py-0.5 font-body text-[11px] text-fog hover:bg-white/10 hover:text-parchment disabled:opacity-30"
    >
      {children}
    </button>
  );
}
