import { useMemo } from 'react';
import { makeGloamingClient } from '../game/client';

/**
 * The in-game experience, lazy-loaded so boardgame.io + the whole board UI ship
 * in a separate chunk — the landing/setup paints fast, the heavy code arrives
 * only when a run begins.
 */
export default function GameMount({
  names,
  marked,
  seat,
}: {
  names: string[];
  marked: boolean;
  seat: string;
}) {
  const GloamingClient = useMemo(() => makeGloamingClient(names, { marked }), [names, marked]);
  return <GloamingClient playerID={seat} />;
}
