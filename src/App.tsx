import { Suspense, lazy, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SetupScreen, type StartOpts } from './components/SetupScreen';
import { HeroSelect } from './components/HeroSelect';
import { Splash, splashSeen, markSplashSeen } from './components/Splash';
import { ShellContext, type ShellApi } from './components/shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader } from './components/Loader';
import type { HeroId } from './game/heroes';

// Heavy game chunk (boardgame.io + the whole board UI) loads only on play.
const GameMount = lazy(() => import('./components/GameMount'));

export default function App() {
  const [showSplash, setShowSplash] = useState(!splashSeen());
  const [names, setNames] = useState<string[] | null>(null);
  const [heroes, setHeroes] = useState<HeroId[] | null>(null);
  const [opts, setOpts] = useState<StartOpts>({ marked: false });
  const [seat, setSeat] = useState('0');
  const [runId, setRunId] = useState(0);

  const shell: ShellApi = useMemo(
    () => ({
      names: names ?? [],
      gotoSeat: (s) => setSeat(s),
      restart: () => {
        setNames(null);
        setHeroes(null);
        setSeat('0');
        setRunId((r) => r + 1);
      },
      changeHeroes: () => {
        setHeroes(null);
        setSeat('0');
        setRunId((r) => r + 1);
      },
    }),
    [names],
  );

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {showSplash && (
          <Splash
            onDone={() => {
              markSplashSeen();
              setShowSplash(false);
            }}
          />
        )}
      </AnimatePresence>

      {!names ? (
        <SetupScreen
          onStart={(roster, o) => {
            setSeat('0');
            setOpts(o);
            setHeroes(null);
            setNames(roster);
          }}
        />
      ) : !heroes ? (
        <HeroSelect
          names={names}
          onConfirm={(chosen) => {
            setSeat('0');
            setHeroes(chosen);
          }}
          onBack={() => setNames(null)}
        />
      ) : (
        <ShellContext.Provider value={shell}>
          <Suspense fallback={<Loader />}>
            <GameMount key={runId} names={names} heroes={heroes} marked={opts.marked} seat={seat} />
          </Suspense>
        </ShellContext.Provider>
      )}
    </ErrorBoundary>
  );
}
