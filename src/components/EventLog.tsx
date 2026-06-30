import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { GState, LogTone } from '../game/types';
import { SEAT_COLORS } from '../game/constants';
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
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: p.alive ? SEAT_COLORS[p.seat] : '#3a3550', opacity: p.dimmed ? 0.4 : 1 }}
                />
                <span
                  className="font-display text-xs"
                  style={{ color: p.alive ? SEAT_COLORS[p.seat] : '#6b6589' }}
                >
                  {p.name}
                </span>
                {p.dimmed && <span className="text-[10px] text-dread-bright">dimmed</span>}
                {!p.alive && <span className="text-[10px] text-fog-dim">lost</span>}
              </span>
              <span className="font-display text-[11px] text-fog">
                <span className="text-ember-bright">{'✦'.repeat(Math.min(p.embers, 6)) || '·'}</span>
                <span className="ml-1 text-ember/70">{p.light}♦</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

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
