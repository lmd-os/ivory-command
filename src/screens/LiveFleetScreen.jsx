import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FleetMap } from '../components/FleetMap';
import { AircraftPanel } from '../components/AircraftPanel';
import { FLEET } from '../data/fleet';

export function LiveFleetScreen({ getLive, loading, lastUpdated, error }) {
  const [selected, setSelected]         = useState(null);
  const [panelOpen, setPanelOpen]       = useState(false);

  const handleAircraftClick = useCallback((aircraft) => {
    setSelected(aircraft);
    setPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 450);
  }, []);

  const airborneList = FLEET.filter((a) => {
    const live = getLive(a.icao24);
    return live && !live.onGround;
  });

  const lastUpdate = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
    : null;

  return (
    <motion.div
      style={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Full-screen Map */}
      <FleetMap
        fleet={FLEET}
        getLive={getLive}
        onAircraftClick={handleAircraftClick}
      />

      {/* HUD overlay — top left */}
      <div style={styles.hudTL}>
        <div style={styles.hudTitle}>LIVE FLEET</div>
        <div style={styles.hudSub}>
          Ivory Jet Services — {FLEET.length} aircraft registered
        </div>

        <div style={styles.acList}>
          {FLEET.map((aircraft) => {
            const live    = getLive(aircraft.icao24);
            const tracked = live != null;
            const airborne = tracked && !live.onGround;

            return (
              <button
                key={aircraft.id}
                style={styles.acItem}
                onClick={() => handleAircraftClick(aircraft)}
              >
                <div style={{
                  ...styles.acStatus,
                  background: airborne ? 'var(--c-green)' : tracked ? 'var(--c-amber)' : 'var(--c-muted)',
                }} />
                <div style={styles.acInfo}>
                  <span style={styles.acReg}>{aircraft.registration}</span>
                  <span style={styles.acType}>{aircraft.type}</span>
                </div>
                <div style={{
                  ...styles.acState,
                  color: airborne ? 'var(--c-green)' : tracked ? 'var(--c-amber)' : 'var(--c-muted)',
                }}>
                  {airborne ? 'AIRBORNE' : tracked ? 'GROUND' : 'N/A'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* HUD overlay — bottom left */}
      <div style={styles.hudBL}>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>AIRBORNE</span>
          <span style={{ ...styles.dataValue, color: airborneList.length > 0 ? 'var(--c-green)' : 'var(--c-subtle)' }}>
            {airborneList.length}/{FLEET.length}
          </span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>DATA</span>
          <span style={{ ...styles.dataValue, color: error ? 'var(--c-red)' : 'var(--c-subtle)' }}>
            {loading ? 'CONNECTING...' : error ? 'ERROR' : lastUpdate ? `LIVE · ${lastUpdate}` : 'READY'}
          </span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>SOURCE</span>
          <span style={styles.dataValue}>OpenSky Network</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>REFRESH</span>
          <span style={styles.dataValue}>60s</span>
        </div>
      </div>

      {/* Aircraft side panel */}
      {panelOpen && selected && (
        <AircraftPanel
          aircraft={selected}
          liveData={getLive(selected.icao24)}
          onClose={handleClosePanel}
        />
      )}

      {/* Attribution */}
      <div style={styles.attribution}>
        © OpenStreetMap contributors, © CARTO
      </div>
    </motion.div>
  );
}

const styles = {
  screen: {
    position: 'fixed',
    inset: 0,
    paddingTop: 56,
    background: '#000',
  },
  hudTL: {
    position: 'absolute',
    top: 72,
    left: 16,
    zIndex: 50,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--c-border)',
    borderRadius: 3,
    padding: '16px 16px 12px',
    minWidth: 220,
    maxWidth: 260,
  },
  hudTitle: {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    letterSpacing: '3px',
    color: 'var(--c-gold)',
    marginBottom: 4,
  },
  hudSub: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    marginBottom: 14,
    lineHeight: 1.4,
  },
  acList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  acItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'none',
    border: '1px solid transparent',
    borderRadius: 2,
    padding: '7px 8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s',
    width: '100%',
  },
  acStatus: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  },
  acInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  acReg: {
    fontFamily: 'var(--f-mono)',
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--c-white)',
    letterSpacing: '1px',
  },
  acType: {
    fontFamily: 'var(--f-sans)',
    fontSize: 10,
    color: 'var(--c-subtle)',
  },
  acState: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '1.5px',
    flexShrink: 0,
  },
  hudBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 50,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--c-border)',
    borderRadius: 3,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
  },
  dataLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '2px',
    color: 'var(--c-muted)',
  },
  dataValue: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '1px',
    color: 'var(--c-subtle)',
  },
  attribution: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    color: 'var(--c-muted)',
    letterSpacing: '0.5px',
    zIndex: 50,
  },
};
