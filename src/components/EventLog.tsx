import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GState, LogTone } from '../game/types';
import { SEAT_COLORS, TORCH_MAX } from '../game/constants';
import { heroById } from '../game/heroes';
import { BeatStrip } from './Beats';
import { Panel, PanelTitle } from '../ui/Panel';

const TONE_COLOR: Record<LogTone, string> = {
  neutral: '#b8ad94',
  hope: 'var(--color-ember)',
  dread: 'var(--color-dread-bright)',
  fellow: 'var(--color-seat-2)',
};

/** The story so far — party roster + scrolling chronicle. */
export function EventLog({ G, currentPlayer }: { G: GState; currentPlayer: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [G.logSeq]);

  return (
    <div className="flex h-full flex-col gap-3">
      <Panel className="p-3">
        <PanelTitle>The Party</PanelTitle>
        <div className="mt-2 space-y-1.5">
          {Object.values(G.players).map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded px-2 py-1 ${
                p.id === currentPlayer ? 'bg-white/[0.06]' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.wisp ? '#3a3550' : SEAT_COLORS[p.seat], opacity: p.wisp ? 0.5 : 1 }}
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="font-display text-xs"
                      style={{ color: p.wisp ? '#8a84a8' : SEAT_COLORS[p.seat] }}
                    >
                      {p.name}
                    </span>
                    {p.wisp && <span className="text-[10px] text-fog">a Wisp</span>}
                    {p.carrying.length > 0 && (
                      <span className="rounded bg-ember/20 px-1 text-[9px] font-display text-ember-bright" title="carrying a Lantern">
                        ◈{p.carrying.length > 1 ? `×${p.carrying.length}` : ''}
                      </span>
                    )}
                  </span>
                  {heroById(p.hero) && (
                    <span className="truncate font-body text-[9px] text-fog-dim" title={heroById(p.hero)!.ability}>
                      {heroById(p.hero)!.name}
                    </span>
                  )}
                </span>
              </span>
              <span className="font-display text-[11px] text-fog" aria-label={p.wisp ? 'torch out' : `torch ${p.torch} of ${TORCH_MAX}`}>
                {p.wisp ? (
                  <span className="text-fog-dim italic">drifting…</span>
                ) : (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: TORCH_MAX }).map((_, i) => (
                      <span
                        key={i}
                        className="inline-block h-2.5 w-1 rounded-full"
                        style={{
                          background: i < p.torch ? 'var(--color-ember)' : 'var(--color-night)',
                          boxShadow: i < p.torch ? '0 0 4px var(--color-ember)' : undefined,
                          opacity: i < p.torch ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {G.beats.length > 0 && (
        <Panel className="p-3">
          <PanelTitle>Just now</PanelTitle>
          <div className="mt-2">
            <BeatStrip beats={G.beats} />
          </div>
        </Panel>
      )}

      <Panel className="flex min-h-0 flex-1 flex-col p-3">
        <PanelTitle>Chronicle</PanelTitle>
        <div ref={scroller} className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {G.log.map((e) => (
            <motion.p
              key={e.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-body text-[13px] leading-snug"
              style={{ color: TONE_COLOR[e.tone] }}
            >
              {e.text}
            </motion.p>
          ))}
        </div>
      </Panel>
    </div>
  );
}
