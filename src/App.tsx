import { Suspense, lazy, useMemo, useState } from 'react';
import { SetupScreen, type StartOpts } from './components/SetupScreen';
import { ShellContext, type ShellApi } from './components/shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader } from './components/Loader';

// Heavy game chunk (boardgame.io + the whole board UI) loads only on play.
const GameMount = lazy(() => import('./components/GameMount'));

export default function App() {
  const [names, setNames] = useState<string[] | null>(null);
  const [opts, setOpts] = useState<StartOpts>({ marked: false });
  const [seat, setSeat] = useState('0');
  const [runId, setRunId] = useState(0);

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

  return (
    <ErrorBoundary>
      {!names ? (
        <SetupScreen
          onStart={(roster, o) => {
            setSeat('0');
            setOpts(o);
            setNames(roster);
          }}
        />
      ) : (
        <ShellContext.Provider value={shell}>
          <Suspense fallback={<Loader />}>
            <GameMount key={runId} names={names} marked={opts.marked} seat={seat} />
          </Suspense>
        </ShellContext.Provider>
      )}
    </ErrorBoundary>
  );
}
