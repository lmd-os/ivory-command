import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FleetMap } from '../components/FleetMap';
import { AircraftPanel } from '../components/AircraftPanel';
import { FLEET } from '../data/fleet';

export function LiveFleetScreen({ getLive, loading, lastUpdated, error, detectedCount }) {
  const [selected, setSelected]   = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleAircraftClick = useCallback((aircraft) => {
    setSelected(aircraft);
    setPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 450);
  }, []);

  const lastUpdate = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC',
      }) + ' UTC'
    : null;

  const detected  = detectedCount ?? 0;
  const airborne  = FLEET.filter(a => { const l = getLive(a.icao24); return l && !l.onGround; }).length;

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

      {/* ── HUD top-left : LIVE NOW ── */}
      <div style={styles.hudTL}>
        {/* Header */}
        <div style={styles.hudHeader}>
          <div style={styles.liveDot} />
          <span style={styles.liveLabel}>LIVE NOW</span>
        </div>

        {/* Counters row */}
        <div style={styles.counterRow}>
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: detected > 0 ? 'var(--c-gold)' : 'var(--c-muted)' }}>
              {detected}
            </span>
            <span style={styles.counterLabel}>DETECTED</span>
          </div>
          <div style={styles.counterDivider} />
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: airborne > 0 ? 'var(--c-green)' : 'var(--c-muted)' }}>
              {airborne}
            </span>
            <span style={styles.counterLabel}>AIRBORNE</span>
          </div>
          <div style={styles.counterDivider} />
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: 'var(--c-subtle)' }}>
              {FLEET.length}
            </span>
            <span style={styles.counterLabel}>FLEET</span>
          </div>
        </div>

        {/* Aircraft list */}
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
                title={`${aircraft.registration} — ${aircraft.fullType}`}
              >
                <div style={{
                  ...styles.acDot,
                  background: airborne ? 'var(--c-green)' : tracked ? 'var(--c-amber)' : 'var(--c-muted)',
                  boxShadow: airborne ? '0 0 6px var(--c-green)' : 'none',
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

        {/* No aircraft detected — elegant message */}
        {!loading && detected === 0 && !error && (
          <div style={styles.noSignal}>
            <div style={styles.noSignalLine} />
            <span style={styles.noSignalText}>No transponder signal detected</span>
            <div style={styles.noSignalLine} />
          </div>
        )}
      </div>

      {/* ── HUD bottom-left : data status ── */}
      <div style={styles.hudBL}>
        <div style={styles.blRow}>
          <span style={styles.blLabel}>LAST UPDATE</span>
          <span style={{ ...styles.blValue, color: lastUpdate ? 'var(--c-subtle)' : 'var(--c-muted)' }}>
            {loading ? 'CONNECTING...' : error ? 'DATA ERROR' : lastUpdate || '—'}
          </span>
        </div>
        <div style={styles.blRow}>
          <span style={styles.blLabel}>SOURCE</span>
          <span style={styles.blValue}>
            OpenSky · ADS-B Exch.
          </span>
        </div>
        <div style={styles.blRow}>
          <span style={styles.blLabel}>REFRESH</span>
          <span style={styles.blValue}>45 s</span>
        </div>
      </div>

      {/* Aircraft detail panel */}
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

  // ── HUD top-left ──
  hudTL: {
    position: 'absolute',
    top: 72,
    left: 16,
    zIndex: 50,
    background: 'rgba(0,0,0,0.82)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--c-border)',
    borderRadius: 3,
    padding: '14px 16px 12px',
    minWidth: 230,
    maxWidth: 270,
  },

  hudHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--c-green)',
    boxShadow: '0 0 8px var(--c-green)',
    animation: 'pulse-ring 2s infinite',
    flexShrink: 0,
  },
  liveLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    color: 'var(--c-gold)',
    fontWeight: 500,
  },

  // Counter row
  counterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginBottom: 12,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--c-border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  counter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 4px',
    gap: 2,
  },
  counterVal: {
    fontFamily: 'var(--f-mono)',
    fontSize: 18,
    fontWeight: 300,
    lineHeight: 1,
  },
  counterLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 7,
    letterSpacing: '1.5px',
    color: 'var(--c-muted)',
  },
  counterDivider: {
    width: 1,
    height: 32,
    background: 'var(--c-border)',
    flexShrink: 0,
  },

  // Aircraft list
  acList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
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
    transition: 'background 0.15s, border-color 0.15s',
    width: '100%',
  },
  acDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 0.3s, box-shadow 0.3s',
  },
  acInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflow: 'hidden',
  },
  acReg: {
    fontFamily: 'var(--f-mono)',
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--c-white)',
    letterSpacing: '1.5px',
  },
  acType: {
    fontFamily: 'var(--f-sans)',
    fontSize: 9,
    color: 'var(--c-subtle)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  acState: {
    fontFamily: 'var(--f-mono)',
    fontSize: 7.5,
    letterSpacing: '1.5px',
    flexShrink: 0,
    transition: 'color 0.3s',
  },

  // No signal
  noSignal: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    opacity: 0.6,
  },
  noSignalLine: {
    flex: 1,
    height: 1,
    background: 'var(--c-border)',
  },
  noSignalText: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '1px',
    color: 'var(--c-muted)',
    whiteSpace: 'nowrap',
  },

  // ── HUD bottom-left ──
  hudBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 50,
    background: 'rgba(0,0,0,0.82)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--c-border)',
    borderRadius: 3,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  blRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  blLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 7.5,
    letterSpacing: '2px',
    color: 'var(--c-muted)',
  },
  blValue: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8.5,
    letterSpacing: '0.5px',
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
