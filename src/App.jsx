import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

import { IntroScreen }        from './screens/IntroScreen';
import { LiveFleetScreen }    from './screens/LiveFleetScreen';
import { AircraftViewScreen } from './screens/AircraftViewScreen';
import { OperationsScreen }   from './screens/OperationsScreen';
import { CommandScreen }      from './screens/CommandScreen';
import { Navigation }         from './components/Navigation';
import { useOpenSky }         from './hooks/useOpenSky';

export default function App() {
  const [phase,  setPhase]  = useState('intro');
  const [screen, setScreen] = useState('fleet');

  const {
    getLive,
    loading,
    error,
    lastUpdated,
    detectedCount,
    airborneCount,
    groundCount,
  } = useOpenSky();

  const handleIntroComplete = useCallback(() => {
    setPhase('main');
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <IntroScreen key="intro" onComplete={handleIntroComplete} />
        ) : (
          <div key="main" style={{ position: 'fixed', inset: 0 }}>
            <Navigation screen={screen} onNavigate={setScreen} />

            <AnimatePresence mode="wait">
              {screen === 'fleet' && (
                <LiveFleetScreen
                  key="fleet"
                  getLive={getLive}
                  loading={loading}
                  error={error}
                  lastUpdated={lastUpdated}
                  detectedCount={detectedCount}
                />
              )}
              {screen === 'aircraft' && (
                <AircraftViewScreen
                  key="aircraft"
                  getLive={getLive}
                />
              )}
              {screen === 'operations' && (
                <OperationsScreen
                  key="operations"
                  airborneCount={airborneCount}
                  groundCount={groundCount}
                />
              )}
              {screen === 'command' && (
                <CommandScreen key="command" />
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
