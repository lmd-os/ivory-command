import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FleetMap } from '../components/FleetMap';
import { AircraftPanel } from '../components/AircraftPanel';
import { FLEET } from '../data/fleet';

const STATUS_COLOR = {
  ok: 'var(--c-green)',
  no_data: 'var(--c-amber)',
  skipped: 'var(--c-muted)',
  error: 'var(--c-red)',
  timeout: 'var(--c-red)',
  rate_limited: 'var(--c-amber)',
  unauthorized: 'var(--c-amber)',
  unreachable: 'var(--c-red)',
};

const STATUS_LABEL = {
  ok: 'OK',
  no_data: 'NO DATA',
  skipped: 'SKIPPED',
  error: 'ERROR',
  timeout: 'TIMEOUT',
  rate_limited: 'RATE LIMIT',
  unauthorized: 'NO AUTH',
  unreachable: 'UNREACHABLE',
};

export function LiveFleetScreen({
  getLive, getRecord, diagnostics = [], mode = 'real',
  loading, scanning, error, lastScan, onRunScan, detectedCount,
}) {
  const [selected, setSelected]   = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [diagOpen, setDiagOpen]   = useState(false);

  const handleAircraftClick = useCallback((aircraft) => {
    setSelected(aircraft);
    setPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 450);
  }, []);

  const lastUpdate = lastScan
    ? lastScan.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC'
    : null;

  const detected = detectedCount ?? 0;
  const airborne = FLEET.filter((a) => { const l = getLive(a.icao24 || a.id); return l && !l.onGround; }).length;
  const isDemo   = mode === 'demo';
  const showPremium = !loading && !isDemo && detected === 0;

  return (
    <motion.div
      style={styles.screen}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <FleetMap fleet={FLEET} getLive={getLive} onAircraftClick={handleAircraftClick} />

      {/* DEMO banner */}
      {isDemo && (
        <div style={styles.demoBanner}>
          <span style={styles.demoDot} />
          DEMO TRACK MODE — simulated positions, not real ADS-B data
        </div>
      )}

      {/* ── HUD top-left : LIVE NOW ── */}
      <div className="hud-tl" style={styles.hudTL}>
        <div style={styles.hudHeader}>
          <div style={{ ...styles.liveDot, background: isDemo ? 'var(--c-amber)' : 'var(--c-green)', boxShadow: `0 0 8px ${isDemo ? 'var(--c-amber)' : 'var(--c-green)'}` }} />
          <span style={styles.liveLabel}>{isDemo ? 'DEMO NOW' : 'LIVE NOW'}</span>
          <span style={styles.modeBadge}>{isDemo ? 'DEMO' : 'REAL'}</span>
        </div>

        <div style={styles.counterRow}>
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: detected > 0 ? 'var(--c-gold)' : 'var(--c-muted)' }}>{detected}</span>
            <span style={styles.counterLabel}>DETECTED</span>
          </div>
          <div style={styles.counterDivider} />
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: airborne > 0 ? 'var(--c-green)' : 'var(--c-muted)' }}>{airborne}</span>
            <span style={styles.counterLabel}>AIRBORNE</span>
          </div>
          <div style={styles.counterDivider} />
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: 'var(--c-subtle)' }}>{FLEET.length}</span>
            <span style={styles.counterLabel}>FLEET</span>
          </div>
        </div>

        {/* Aircraft list */}
        <div style={styles.acList}>
          {FLEET.map((aircraft) => {
            const live    = getLive(aircraft.icao24 || aircraft.id);
            const tracked = live != null;
            const acAirborne = tracked && !live.onGround;
            return (
              <button key={aircraft.id} className="ac-item" style={styles.acItem}
                onClick={() => handleAircraftClick(aircraft)}
                title={`${aircraft.registration} — ${aircraft.fullType}`}>
                <div style={{
                  ...styles.acDot,
                  background: acAirborne ? 'var(--c-green)' : tracked ? 'var(--c-amber)' : 'var(--c-muted)',
                  boxShadow: acAirborne ? '0 0 6px var(--c-green)' : 'none',
                }} />
                <div style={styles.acInfo}>
                  <span style={styles.acReg}>{aircraft.registration}</span>
                  <span style={styles.acType}>{aircraft.type}</span>
                </div>
                <div style={{
                  ...styles.acState,
                  color: acAirborne ? 'var(--c-green)' : tracked ? 'var(--c-amber)' : 'var(--c-muted)',
                }}>
                  {acAirborne ? 'AIRBORNE' : tracked ? 'GROUND' : 'NO SIGNAL'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Run live scan */}
        <button style={{ ...styles.scanBtn, opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}
          onClick={() => !scanning && onRunScan?.()} disabled={scanning}>
          <span style={{ ...styles.scanSpinner, animation: scanning ? 'spin 0.9s linear infinite' : 'none' }}>
            {scanning ? '◠' : '⟳'}
          </span>
          {scanning ? 'SCANNING…' : 'RUN LIVE SCAN'}
        </button>
      </div>

      {/* ── HUD bottom-left : status + diagnostics toggle ── */}
      <div style={styles.hudBL}>
        <div style={styles.blRow}>
          <span style={styles.blLabel}>LAST UPDATE</span>
          <span style={{ ...styles.blValue, color: lastUpdate ? 'var(--c-subtle)' : 'var(--c-muted)' }}>
            {loading ? 'SCANNING…' : error ? 'DEGRADED' : lastUpdate || '—'}
          </span>
        </div>
        <div style={styles.blRow}>
          <span style={styles.blLabel}>SOURCES</span>
          <span style={styles.blValue}>{diagnostics.length || '—'} scanned</span>
        </div>
        <button style={styles.diagToggle} onClick={() => setDiagOpen((v) => !v)}>
          {diagOpen ? '▾ HIDE DIAGNOSTICS' : '▸ DIAGNOSTICS'}
        </button>
      </div>

      {/* ── Diagnostic panel (discreet, bottom-right) ── */}
      <AnimatePresence>
        {diagOpen && (
          <motion.div
            style={styles.diagPanel}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
          >
            <div style={styles.diagHeader}>
              <span style={styles.diagTitle}>TRACKING DIAGNOSTICS</span>
              <span style={styles.diagMode}>{isDemo ? 'DEMO' : 'REAL'} · {lastUpdate || 'pending'}</span>
            </div>
            <div style={styles.diagList}>
              {diagnostics.length === 0 && (
                <div style={styles.diagEmpty}>Awaiting first scan…</div>
              )}
              {diagnostics.map((d) => (
                <div key={d.provider} style={styles.diagRow}>
                  <div style={styles.diagSource}>
                    <span style={{ ...styles.diagStatusDot, background: STATUS_COLOR[d.status] || 'var(--c-muted)' }} />
                    <span style={styles.diagLabel}>{d.label}</span>
                  </div>
                  <div style={styles.diagMeta}>
                    <span style={{ ...styles.diagStatus, color: STATUS_COLOR[d.status] || 'var(--c-muted)' }}>
                      {STATUS_LABEL[d.status] || (d.status || '').toUpperCase()}
                    </span>
                    <span style={styles.diagCount}>{d.count ?? 0} fix</span>
                  </div>
                  {d.reason && <div style={styles.diagReason}>{d.reason}</div>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Premium overlay when nothing is publicly visible ── */}
      <AnimatePresence>
        {showPremium && (
          <motion.div
            style={styles.premium}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={styles.premiumInner}>
              <div style={styles.premiumEyebrow}>FLEET INTELLIGENCE · LIVE SCAN COMPLETE</div>
              <div style={styles.premiumTitle}>No public ADS-B signal right now</div>
              <div style={styles.premiumText}>
                The system scanned {diagnostics.length} tracking sources in real time.
                These private jets are not currently broadcasting on public networks —
                they may be on the ground, outside ADS-B coverage, or blocked from public tracking.
              </div>
              <div style={styles.premiumDivider} />
              <div style={styles.premiumCta}>
                Real-time position requires a private ADS-B / flight-tracking provider connection.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aircraft detail panel */}
      {panelOpen && selected && (
        <AircraftPanel
          aircraft={selected}
          record={getRecord ? getRecord(selected.icao24 || selected.id) : null}
          onClose={handleClosePanel}
        />
      )}

      <div style={styles.attribution}>© OpenStreetMap contributors, © CARTO</div>
    </motion.div>
  );
}

const styles = {
  screen: { position: 'fixed', inset: 0, paddingTop: 56, background: '#000' },

  demoBanner: {
    position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(240,160,48,0.12)', border: '1px solid rgba(240,160,48,0.4)',
    borderRadius: 3, padding: '6px 14px',
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '1.5px', color: 'var(--c-amber)',
  },
  demoDot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--c-amber)', boxShadow: '0 0 8px var(--c-amber)' },

  hudTL: {
    position: 'absolute', top: 72, left: 16, zIndex: 50,
    background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--c-border)', borderRadius: 3, padding: '14px 16px 12px',
    minWidth: 234, maxWidth: 272,
  },
  hudHeader: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 },
  liveDot: { width: 5, height: 5, borderRadius: '50%', animation: 'pulse-ring 2s infinite', flexShrink: 0 },
  liveLabel: { fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '3px', color: 'var(--c-gold)', fontWeight: 500, flex: 1 },
  modeBadge: {
    fontFamily: 'var(--f-mono)', fontSize: 7, letterSpacing: '1.5px', color: 'var(--c-subtle)',
    border: '1px solid var(--c-border)', borderRadius: 2, padding: '1px 5px',
  },

  counterRow: {
    display: 'flex', alignItems: 'center', marginBottom: 12,
    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--c-border)', borderRadius: 2, overflow: 'hidden',
  },
  counter: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', gap: 2 },
  counterVal: { fontFamily: 'var(--f-mono)', fontSize: 18, fontWeight: 300, lineHeight: 1 },
  counterLabel: { fontFamily: 'var(--f-mono)', fontSize: 7, letterSpacing: '1.5px', color: 'var(--c-muted)' },
  counterDivider: { width: 1, height: 32, background: 'var(--c-border)', flexShrink: 0 },

  acList: { display: 'flex', flexDirection: 'column', gap: 2 },
  acItem: {
    display: 'flex', alignItems: 'center', gap: 10, background: 'none',
    border: '1px solid transparent', borderRadius: 2, padding: '7px 8px',
    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s, border-color 0.15s', width: '100%',
  },
  acDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s, box-shadow 0.3s' },
  acInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' },
  acReg: { fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 400, color: 'var(--c-white)', letterSpacing: '1.5px' },
  acType: { fontFamily: 'var(--f-sans)', fontSize: 9, color: 'var(--c-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  acState: { fontFamily: 'var(--f-mono)', fontSize: 7.5, letterSpacing: '1.5px', flexShrink: 0, transition: 'color 0.3s' },

  scanBtn: {
    marginTop: 12, width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(201,168,76,0.08)', border: '1px solid var(--c-gold-dim)', borderRadius: 2,
    padding: '9px 10px', color: 'var(--c-gold)',
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '2px',
    transition: 'background 0.2s',
  },
  scanSpinner: { display: 'inline-block', fontSize: 11, lineHeight: 1 },

  hudBL: {
    position: 'absolute', bottom: 16, left: 16, zIndex: 50,
    background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--c-border)', borderRadius: 3, padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: 7, minWidth: 200,
  },
  blRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 },
  blLabel: { fontFamily: 'var(--f-mono)', fontSize: 7.5, letterSpacing: '2px', color: 'var(--c-muted)' },
  blValue: { fontFamily: 'var(--f-mono)', fontSize: 8.5, letterSpacing: '0.5px', color: 'var(--c-subtle)' },
  diagToggle: {
    marginTop: 2, background: 'none', border: 'none', padding: 0, textAlign: 'left',
    fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '1.5px', color: 'var(--c-gold)', cursor: 'pointer',
  },

  diagPanel: {
    position: 'absolute', bottom: 16, right: 16, zIndex: 60, width: 'min(330px, calc(100vw - 32px))',
    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--c-border)', borderRadius: 3, padding: '12px 14px', maxHeight: '46vh', overflowY: 'auto',
  },
  diagHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  diagTitle: { fontFamily: 'var(--f-mono)', fontSize: 8.5, letterSpacing: '2.5px', color: 'var(--c-gold)' },
  diagMode: { fontFamily: 'var(--f-mono)', fontSize: 7.5, letterSpacing: '1px', color: 'var(--c-muted)' },
  diagList: { display: 'flex', flexDirection: 'column', gap: 8 },
  diagEmpty: { fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--c-muted)', padding: '8px 0' },
  diagRow: { display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 8, borderBottom: '1px solid var(--c-border)' },
  diagSource: { display: 'flex', alignItems: 'center', gap: 7 },
  diagStatusDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  diagLabel: { fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--c-silver)', letterSpacing: '0.5px' },
  diagMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 12 },
  diagStatus: { fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '1px' },
  diagCount: { fontFamily: 'var(--f-mono)', fontSize: 8, color: 'var(--c-muted)' },
  diagReason: { fontFamily: 'var(--f-sans)', fontSize: 9, color: 'var(--c-muted)', paddingLeft: 12, lineHeight: 1.4 },

  premium: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 40, width: 'min(440px, calc(100vw - 48px))', pointerEvents: 'none',
  },
  premiumInner: {
    background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--c-border)', borderRadius: 4, padding: '28px 28px 24px', textAlign: 'center',
  },
  premiumEyebrow: { fontFamily: 'var(--f-mono)', fontSize: 8.5, letterSpacing: '3px', color: 'var(--c-gold)', marginBottom: 14 },
  premiumTitle: { fontFamily: 'var(--f-sans)', fontWeight: 200, fontSize: 22, letterSpacing: '1px', color: 'var(--c-white)', marginBottom: 12 },
  premiumText: { fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--c-soft)', lineHeight: 1.7 },
  premiumDivider: { height: 1, width: 40, background: 'var(--c-gold-dim)', margin: '18px auto' },
  premiumCta: { fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '1px', color: 'var(--c-silver)', lineHeight: 1.6 },

  attribution: {
    position: 'absolute', bottom: 8, right: 8,
    fontFamily: 'var(--f-mono)', fontSize: 8, color: 'var(--c-muted)', letterSpacing: '0.5px', zIndex: 50,
  },
};
