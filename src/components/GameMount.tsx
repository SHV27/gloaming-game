import { useMemo } from 'react';
import { makeGloamingClient } from '../game/client';
import type { HeroId } from '../game/heroes';

/**
 * The in-game experience, lazy-loaded so boardgame.io + the whole board UI ship
 * in a separate chunk — the landing/setup paints fast, the heavy code arrives
 * only when a run begins.
 */
export default function GameMount({
  names,
  heroes,
  marked,
  seat,
}: {
  names: string[];
  heroes: HeroId[];
  marked: boolean;
  seat: string;
}) {
  const GloamingClient = useMemo(
    () => makeGloamingClient(names, { marked, heroes }),
    [names, heroes, marked],
  );
  return <GloamingClient playerID={seat} />;
}
