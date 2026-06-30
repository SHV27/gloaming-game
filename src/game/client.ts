import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { makeGloaming } from './gloaming';
import { GloamingBoard } from '../components/Board';

/**
 * Build a hotseat (pass-and-play) client for the chosen roster. One client,
 * one device; App swaps the `playerID` prop behind a handoff interstitial so
 * the previous bearer's screen is never on display (hidden-info safe → S2).
 */
export function makeGloamingClient(names: string[], opts: { marked?: boolean } = {}) {
  return Client({
    game: makeGloaming({ names, marked: opts.marked }),
    board: GloamingBoard,
    numPlayers: names.length,
    multiplayer: Local(),
    debug: false,
  });
}

export type GloamingClient = ReturnType<typeof makeGloamingClient>;
