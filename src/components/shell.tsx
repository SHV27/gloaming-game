import { createContext, useContext } from 'react';

/**
 * Shell context — lets the boardgame.io board talk back to App (hotseat seat
 * handoff, restart) without relying on prop-forwarding through Client().
 */
export interface ShellApi {
  names: string[];
  /** Advance the on-device seat to `seat` once the handoff is acknowledged. */
  gotoSeat: (seat: string) => void;
  restart: () => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside <ShellContext.Provider>');
  return ctx;
}
