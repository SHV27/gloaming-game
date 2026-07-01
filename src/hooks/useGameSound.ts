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
      case 'cross':
        sound.play('beacon');
        break;
      case 'kindle':
        sound.play('kindle');
        break;
      case 'snuff':
        sound.play('snuff');
        break;
      case 'surge':
        sound.play('surge');
        break;
      case 'act-change':
        sound.play('act');
        break;
      case 'wisp':
        sound.play('wisp');
        break;
      case 'rekindle':
        sound.play('rekindle');
        break;
      case 'stalker':
        sound.play('stalker');
        break;
    }
  }, [flash]);
}
