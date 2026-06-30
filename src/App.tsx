import { useMemo, useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { makeGloamingClient } from './game/client';
import { ShellContext, type ShellApi } from './components/shell';

export default function App() {
  const [names, setNames] = useState<string[] | null>(null);
  const [seat, setSeat] = useState('0');
  const [runId, setRunId] = useState(0);

  // One hotseat client per run; rebuilt (fresh shuffle) when a new roster starts.
  const GloamingClient = useMemo(
    () => (names ? makeGloamingClient(names) : null),
    [names, runId],
  );

  const shell: ShellApi = useMemo(
    () => ({
      names: names ?? [],
      gotoSeat: (s) => setSeat(s),
      restart: () => {
        setNames(null);
        setSeat('0');
        setRunId((r) => r + 1);
      },
    }),
    [names],
  );

  if (!names || !GloamingClient) {
    return (
      <SetupScreen
        onStart={(roster) => {
          setSeat('0');
          setNames(roster);
        }}
      />
    );
  }

  return (
    <ShellContext.Provider value={shell}>
      <GloamingClient playerID={seat} />
    </ShellContext.Provider>
  );
}
