import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

import { IntroScreen }        from './screens/IntroScreen';
import { LiveFleetScreen }    from './screens/LiveFleetScreen';
import { AircraftViewScreen } from './screens/AircraftViewScreen';
import { OperationsScreen }   from './screens/OperationsScreen';
import { CommandScreen }      from './screens/CommandScreen';
import { Navigation }         from './components/Navigation';
import { useFlyTrack }        from './hooks/useFlyTrack';

export default function App() {
  const [phase,  setPhase]  = useState('intro');
  const [screen, setScreen] = useState('fleet');

  const {
    getLive,
    getRecord,
    getStatus,
    diagnostics,
    mode,
    loading,
    scanning,
    error,
    lastScan,
    runScan,
    detectedCount,
    airborneCount,
    groundCount,
  } = useFlyTrack();

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
                  getRecord={getRecord}
                  getStatus={getStatus}
                  diagnostics={diagnostics}
                  mode={mode}
                  loading={loading}
                  scanning={scanning}
                  error={error}
                  lastScan={lastScan}
                  onRunScan={runScan}
                  detectedCount={detectedCount}
                  onNavigate={setScreen}
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
