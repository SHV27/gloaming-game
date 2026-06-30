import { useMemo, useState } from 'react';
import { SetupScreen, type StartOpts } from './components/SetupScreen';
import { makeGloamingClient } from './game/client';
import { ShellContext, type ShellApi } from './components/shell';

export default function App() {
  const [names, setNames] = useState<string[] | null>(null);
  const [opts, setOpts] = useState<StartOpts>({ marked: false, ai: false });
  const [seat, setSeat] = useState('0');
  const [runId, setRunId] = useState(0);

  // One hotseat client per run; rebuilt (fresh shuffle / role draw) on a new roster.
  const GloamingClient = useMemo(
    () => (names ? makeGloamingClient(names, { marked: opts.marked }) : null),
    [names, opts.marked, runId],
  );

  const shell: ShellApi = useMemo(
    () => ({
      names: names ?? [],
      aiNarrator: opts.ai,
      gotoSeat: (s) => setSeat(s),
      restart: () => {
        setNames(null);
        setSeat('0');
        setRunId((r) => r + 1);
      },
    }),
    [names, opts.ai],
  );

  if (!names || !GloamingClient) {
    return (
      <SetupScreen
        onStart={(roster, o) => {
          setSeat('0');
          setOpts(o);
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
