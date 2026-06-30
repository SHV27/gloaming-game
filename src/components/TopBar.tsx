import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { sound } from '../audio/sound';
import { useShell } from './shell';
import { Tutorial } from './Tutorial';

/** Slim header: title, sound toggle, abandon-run. */
export function TopBar() {
  const shell = useShell();
  const [muted, setMuted] = useState(sound.muted);
  const [vol, setVol] = useState(sound.volume);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-2">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-lg font-semibold tracking-[0.35em] text-ember-bright text-glow-ember">
          GLOAMING
        </h1>
        <span className="hidden font-body text-xs italic text-fog-dim sm:inline">
          the board that plays back
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMuted(sound.toggleMute())}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-display text-xs uppercase tracking-widest text-fog hover:text-parchment"
          title={muted ? 'Unmute' : 'Mute'}
        >
          <SpeakerIcon muted={muted} />
          {muted ? 'muted' : 'sound'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          aria-label="Volume"
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVol(v);
            sound.setVolume(v);
          }}
          className="hidden h-1 w-20 cursor-pointer accent-ember sm:block"
        />
        <button
          type="button"
          onClick={() => {
            sound.play('ui');
            setShowHelp(true);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 font-display text-xs text-fog hover:text-parchment"
          title="How to play"
          aria-label="How to play"
        >
          ?
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Abandon this run and return to the gate?')) shell.restart();
          }}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-display text-xs uppercase tracking-widest text-fog hover:text-dread-bright"
        >
          <RestartIcon />
          abandon
        </button>
      </div>
      <AnimatePresence>{showHelp && <Tutorial onClose={() => setShowHelp(false)} />}</AnimatePresence>
    </header>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6 H5 L9 3 V13 L5 10 H3 Z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M11 6 L14 10 M14 6 L11 10" />
      ) : (
        <>
          <path d="M11 6 Q12.5 8 11 10" />
          <path d="M12.5 4.5 Q15 8 12.5 11.5" />
        </>
      )}
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8 a5 5 0 1 1 -1.6 -3.7" />
      <path d="M12.4 1.5 L11.8 4.6 L8.8 4" />
    </svg>
  );
}
