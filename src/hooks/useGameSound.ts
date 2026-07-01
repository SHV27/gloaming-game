import { useEffect, useRef } from 'react';
import type { Flash } from '../game/types';
import { sound } from '../audio/sound';

/** Fire SFX off the pure `flash` cue channel — one sound per new nonce. */
export function useGameSound(flash: Flash | null): void {
  const last = useRef(-1);
  useEffect(() => {
    if (!flash || flash.nonce === last.current) return;
    last.current = flash.nonce;
    switch (flash.kind) {
      case 'dice':
        sound.play('dice');
        break;
      case 'beacon-lit':
      case 'rekindle':
      case 'cross':
        sound.play('beacon');
        break;
      case 'snuff':
      case 'surge':
      case 'act-change':
        sound.play('dread');
        break;
      case 'wisp':
        sound.play('dimmed');
        break;
      case 'stalker':
        sound.play('stalker');
        break;
      case 'kindle':
        sound.play('ui');
        break;
    }
  }, [flash]);
}
