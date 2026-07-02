import { useEffect, useRef } from 'react';
import type { Flash } from '../game/types';
import { sound } from '../audio/sound';

/** Fire SFX off the pure `flash` cue channel — one sound per new nonce. v3
 *  maps the visible/physical beats onto the existing procedural WAV cues. */
export function useGameSound(flash: Flash | null): void {
  const last = useRef(-1);
  useEffect(() => {
    if (!flash || flash.nonce === last.current) return;
    last.current = flash.nonce;
    switch (flash.kind) {
      case 'dice':
        sound.play('dice');
        break;
      case 'step':
        sound.play('ui');
        break;
      case 'grab':
        sound.play('kindle');
        break;
      case 'deliver':
      case 'escape':
        sound.play('beacon');
        break;
      case 'dark-eat':
        sound.play('surge');
        break;
      case 'nightmare':
        sound.play('stalker');
        break;
      case 'snuff':
        sound.play('snuff');
        break;
      case 'wisp':
        sound.play('wisp');
        break;
      case 'relight':
        sound.play('rekindle');
        break;
      case 'act-change':
        sound.play('act');
        break;
      case 'event':
        sound.play('ui');
        break;
    }
  }, [flash]);
}
