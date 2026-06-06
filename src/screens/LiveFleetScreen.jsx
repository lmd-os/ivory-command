import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FleetMap } from '../components/FleetMap';
import { AircraftPanel } from '../components/AircraftPanel';
import { FLEET } from '../data/fleet';
import { TRACK_STATUS } from '../services/flytrack/statusEnrich';

// ── Diagnostic color map ──────────────────────────────────────────────────────
const DIAG_COLOR = {
  ok: 'var(--c-green)', no_data: 'var(--c-amber)', skipped: 'var(--c-muted)',
  error: 'var(--c-red)', timeout: 'var(--c-red)', rate_limited: 'var(--c-amber)',
  unauthorized: 'var(--c-amber)', unreachable: 'var(--c-red)',
};
const DIAG_LABEL = {
  ok: 'OK', no_data: 'NO DATA', skipped: 'SKIPPED', error: 'ERROR',
  timeout: 'TIMEOUT', rate_limited: 'RATE LIMIT', unauthorized: 'NO AUTH', unreachable: 'UNREACHABLE',
};

// ── Status helpers ────────────────────────────────────────────────────────────
function statusDotStyle(s) {
  if (!s) return { dot: 'var(--c-muted)', text: 'var(--c-muted)', glow: 'none' };
  switch (s.status) {
    case TRACK_STATUS.LIVE:
      return {
        dot:  s.label === 'AIRBORNE' ? 'var(--c-green)' : 'var(--c-amber)',
        text: s.label === 'AIRBORNE' ? 'var(--c-green)' : 'var(--c-amber)',
        glow: s.label === 'AIRBORNE' ? '0 0 6px var(--c-green)' : 'none',
      };
    case TRACK_STATUS.LAST_SEEN:
      return { dot: 'var(--c-amber)', text: 'var(--c-amber)', glow: 'none' };
    case TRACK_STATUS.BASE_VERIFIED:
      return { dot: 'var(--c-blue)', text: 'var(--c-blue)', glow: 'none' };
    default:
      return { dot: '#3a3a3a', text: 'var(--c-muted)', glow: 'none' };
  }
}

function statusShortLabel(s) {
  if (!s) return 'NO SIGNAL';
  switch (s.status) {
    case TRACK_STATUS.LIVE:          return s.label;
    case TRACK_STATUS.LAST_SEEN:     return s.ageLabel ? `SEEN ${s.ageLabel}` : 'LAST SEEN';
    case TRACK_STATUS.BASE_VERIFIED: return 'BASE';
    default:                          return 'PRIVATE';
  }
}

// ── Status color for cards ────────────────────────────────────────────────────
const STATUS_COLOR = {
  [TRACK_STATUS.LIVE]:          'var(--c-green)',
  [TRACK_STATUS.LAST_SEEN]:     'var(--c-amber)',
  [TRACK_STATUS.BASE_VERIFIED]: 'var(--c-blue)',
  [TRACK_STATUS.NOT_VISIBLE]:   'var(--c-muted)',
};
const STATUS_ICON = {
  [TRACK_STATUS.LIVE]:          '●',
  [TRACK_STATUS.LAST_SEEN]:     '◌',
  [TRACK_STATUS.BASE_VERIFIED]: '◎',
  [TRACK_STATUS.NOT_VISIBLE]:   '○',
};

// ── Per-aircraft summary card (inside Fleet Intelligence Report) ───────────────
function AircraftIntelCard({ aircraft, status, onClick }) {
  const color = STATUS_COLOR[status?.status] || 'var(--c-muted)';
  const icon  = STATUS_ICON[status?.status] || '○';
  const hasPosition = status?.lat != null && status?.lon != null;
  const isBase = status?.status === TRACK_STATUS.BASE_VERIFIED;

  return (
    <button style={cStyles.card} onClick={() => onClick(aircraft)}>
      {/* Header */}
      <div style={cStyles.cardHeader}>
        <div>
          <div style={cStyles.cardReg}>{aircraft.registration}</div>
          <div style={cStyles.cardType}>{aircraft.type}</div>
        </div>
        <div style={{ ...cStyles.cardStatus, color }}>
          {icon} {status?.label || 'PRIVATE VISIBILITY'}
        </div>
      </div>

      {/* Location */}
      <div style={cStyles.cardBody}>
        {hasPosition && (
          <div style={cStyles.cardLocation}>
            {isBase ? status.primaryBase : (status.region || 'Location tracked')}
          </div>
        )}

        {status?.timestamp && (
          <div style={cStyles.cardTime}>
            Last public activity:<br />
            <span style={cStyles.cardTimeVal}>{status.timestamp}</span>
          </div>
        )}

        {!status?.timestamp && isBase && (
          <div style={{ ...cStyles.cardTime, color: 'var(--c-subtle)' }}>
            Operational base confirmed
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={cStyles.cardFooter}>
        <span style={cStyles.cardSource}>
          {status?.source || 'Public flight network'}
        </span>
        {status?.confidence > 0 && (
          <span style={{ ...cStyles.cardConfidence, color }}>
            {status.confidence}%
          </span>
        )}
      </div>
    </button>
  );
}

// ── Connect Live Fleet modal ──────────────────────────────────────────────────
function ConnectModal({ onClose, onNavigate }) {
  return (
    <motion.div
      style={mStyles.overlay}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={mStyles.modal}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={mStyles.eyebrow}>PRIVATE FLEET CONNECTIVITY</div>
        <div style={mStyles.title}>Connect Live Fleet</div>
        <div style={mStyles.divider} />
        <div style={mStyles.body}>
          Your aircraft can be connected to a dedicated private ADS-B monitoring
          network for real-time position, status, and alert capabilities.
        </div>
        <div style={mStyles.features}>
          {['Real-time position updates every 10–30 seconds',
            'Private data channel — not visible on public trackers',
            'Fleet status dashboard with alerts',
            'Full historical route archive'].map((f) => (
            <div key={f} style={mStyles.feat}>
              <span style={mStyles.featDot}>—</span>
              <span style={mStyles.featText}>{f}</span>
            </div>
          ))}
        </div>
        <div style={mStyles.actions}>
          <button
            style={mStyles.primaryBtn}
            onClick={() => { onNavigate?.('command'); onClose(); }}
          >
            REQUEST COMMAND CENTER
          </button>
          <button style={mStyles.ghostBtn} onClick={onClose}>
            CLOSE
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function LiveFleetScreen({
  getLive, getRecord, getStatus, diagnostics = [], mode = 'real',
  loading, scanning, error, lastScan, onRunScan, detectedCount,
  onNavigate,
}) {
  const [selected, setSelected]         = useState(null);
  const [panelOpen, setPanelOpen]       = useState(false);
  const [diagOpen, setDiagOpen]         = useState(false);
  const [connectOpen, setConnectOpen]   = useState(false);

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

  const showReport = !loading && !isDemo && detected === 0;

  return (
    <motion.div
      className="lf-screen"
      style={styles.screen}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <FleetMap
        fleet={FLEET}
        getLive={getLive}
        getStatus={getStatus}
        onAircraftClick={handleAircraftClick}
      />

      {/* DEMO banner */}
      {isDemo && (
        <div style={styles.demoBanner}>
          <span style={styles.demoDot} />
          DEMO TRACK MODE — simulated positions, not real ADS-B data
        </div>
      )}

      {/* ── HUD top-left ── */}
      <div className="hud-tl" style={styles.hudTL}>
        <div style={styles.hudHeader}>
          <div style={{
            ...styles.liveDot,
            background: isDemo ? 'var(--c-amber)' : 'var(--c-green)',
            boxShadow: `0 0 8px ${isDemo ? 'var(--c-amber)' : 'var(--c-green)'}`,
          }} />
          <span style={styles.liveLabel}>{isDemo ? 'DEMO NOW' : 'LIVE NOW'}</span>
          <span style={styles.modeBadge}>{isDemo ? 'DEMO' : 'REAL'}</span>
        </div>

        {/* Fleet Intelligence status lines */}
        <div className="intel-status" style={styles.intelStatus}>
          <div style={styles.intelRow}>
            <span style={styles.intelDot}>◈</span>
            <span className="intel-status-text" style={styles.intelText}>Fleet Intelligence active</span>
          </div>
          <div style={styles.intelRow}>
            <span style={styles.intelDot}>◈</span>
            <span className="intel-status-text" style={styles.intelText}>{FLEET.length} aircraft monitored</span>
          </div>
          <div style={styles.intelRow}>
            <span style={styles.intelDot}>◈</span>
            <span className="intel-status-text" style={styles.intelText}>
              {loading ? 'Live scan in progress…' : 'Live scan complete'}
            </span>
          </div>
          <div style={styles.intelRow}>
            <span style={styles.intelDot}>◈</span>
            <span className="intel-status-text" style={styles.intelText}>Last known positions searched</span>
          </div>
          <div style={styles.intelRow}>
            <span style={styles.intelDot}>◈</span>
            <span className="intel-status-text" style={styles.intelText}>Operational bases displayed</span>
          </div>
        </div>

        <div style={styles.hudDivider} />

        {/* Counters */}
        <div style={styles.counterRow}>
          <div style={styles.counter}>
            <span style={{ ...styles.counterVal, color: detected > 0 ? 'var(--c-gold)' : 'var(--c-muted)' }}>{detected}</span>
            <span style={styles.counterLabel}>LIVE</span>
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
            const s  = getStatus ? getStatus(aircraft.id) : null;
            const ss = statusDotStyle(s);
            return (
              <button key={aircraft.id} className="ac-item" style={styles.acItem}
                onClick={() => handleAircraftClick(aircraft)}
                title={`${aircraft.registration} — ${aircraft.fullType}`}>
                <div style={{ ...styles.acDot, background: ss.dot, boxShadow: ss.glow || 'none' }} />
                <div style={styles.acInfo}>
                  <span style={styles.acReg}>{aircraft.registration}</span>
                  <span style={styles.acType}>{aircraft.type}</span>
                </div>
                <div style={{ ...styles.acState, color: ss.text }}>
                  {statusShortLabel(s)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scan button */}
        <button
          style={{ ...styles.scanBtn, opacity: scanning ? 0.6 : 1, cursor: scanning ? 'default' : 'pointer' }}
          onClick={() => !scanning && onRunScan?.()} disabled={scanning}
        >
          <span style={{ ...styles.scanSpinner, animation: scanning ? 'spin 0.9s linear infinite' : 'none' }}>
            {scanning ? '◠' : '⟳'}
          </span>
          {scanning ? 'SCANNING…' : 'RUN LIVE SCAN'}
        </button>
      </div>

      {/* ── HUD bottom-left ── */}
      <div className="hud-bl" style={styles.hudBL}>
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

      {/* ── Diagnostics panel ── */}
      <AnimatePresence>
        {diagOpen && (
          <motion.div className="diag-panel" style={styles.diagPanel}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}>
            <div style={styles.diagHeader}>
              <span style={styles.diagTitle}>TRACKING DIAGNOSTICS</span>
              <span style={styles.diagMode}>{isDemo ? 'DEMO' : 'REAL'} · {lastUpdate || 'pending'}</span>
            </div>
            <div style={styles.diagList}>
              {diagnostics.length === 0 && <div style={styles.diagEmpty}>Awaiting first scan…</div>}
              {diagnostics.map((d) => (
                <div key={d.provider} style={styles.diagRow}>
                  <div style={styles.diagSource}>
                    <span style={{ ...styles.diagStatusDot, background: DIAG_COLOR[d.status] || 'var(--c-muted)' }} />
                    <span style={styles.diagLabel}>{d.label}</span>
                  </div>
                  <div style={styles.diagMeta}>
                    <span style={{ ...styles.diagStatus, color: DIAG_COLOR[d.status] || 'var(--c-muted)' }}>
                      {DIAG_LABEL[d.status] || (d.status || '').toUpperCase()}
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

      {/* ── Fleet Intelligence Report (replaces old "No signal" overlay) ── */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            className="intel-report"
            style={styles.report}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div style={styles.reportInner}>
              {/* Header */}
              <div style={styles.reportEyebrow}>FLEET INTELLIGENCE REPORT</div>
              <div style={styles.reportSummary}>
                Public tracking scan complete.&ensp;
                <span style={{ color: 'var(--c-gold)' }}>{FLEET.length} aircraft monitored.</span>
              </div>
              <div style={styles.reportNote}>
                No active public broadcast detected at this moment.
                Latest known operational data has been recovered.
              </div>

              <div style={styles.reportDivider} />

              {/* Per-aircraft cards */}
              <div className="intel-cards" style={styles.reportCards}>
                {FLEET.map((aircraft) => (
                  <AircraftIntelCard
                    key={aircraft.id}
                    aircraft={aircraft}
                    status={getStatus ? getStatus(aircraft.id) : null}
                    onClick={handleAircraftClick}
                  />
                ))}
              </div>

              <div style={styles.reportDivider} />

              {/* CTA */}
              <div style={styles.reportCtaLine}>
                Private fleet visibility can be unlocked.
              </div>
              <button
                style={styles.connectBtn}
                onClick={() => setConnectOpen(true)}
              >
                CONNECT LIVE FLEET
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connect modal */}
      <AnimatePresence>
        {connectOpen && (
          <ConnectModal
            onClose={() => setConnectOpen(false)}
            onNavigate={onNavigate}
          />
        )}
      </AnimatePresence>

      {/* Aircraft detail panel */}
      {panelOpen && selected && (
        <AircraftPanel
          aircraft={selected}
          record={getRecord ? getRecord(selected.icao24 || selected.id) : null}
          statusInfo={getStatus ? getStatus(selected.id) : null}
          onClose={handleClosePanel}
        />
      )}

      <div className="map-attribution" style={styles.attribution}>© OpenStreetMap contributors, © CARTO</div>
    </motion.div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
    maxHeight: 'calc(100vh - 130px)', overflowY: 'auto',
  },
  hudHeader: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 },
  liveDot: { width: 5, height: 5, borderRadius: '50%', animation: 'pulse-ring 2s infinite', flexShrink: 0 },
  liveLabel: { fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '3px', color: 'var(--c-gold)', fontWeight: 500, flex: 1 },
  modeBadge: {
    fontFamily: 'var(--f-mono)', fontSize: 7, letterSpacing: '1.5px', color: 'var(--c-subtle)',
    border: '1px solid var(--c-border)', borderRadius: 2, padding: '1px 5px',
  },
  intelStatus: {
    display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--c-border)', borderRadius: 2,
  },
  intelRow: { display: 'flex', alignItems: 'center', gap: 6 },
  intelDot: { fontFamily: 'var(--f-mono)', fontSize: 7, color: 'var(--c-gold)', flexShrink: 0 },
  intelText: { fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.3px', color: 'var(--c-soft)' },
  hudDivider: { height: 1, background: 'var(--c-border)', margin: '0 0 10px' },

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
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '2px', transition: 'background 0.2s',
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

  // ── Fleet Intelligence Report ──
  report: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 40,
    width: 'min(680px, 90vw)',
    maxHeight: 'calc(100vh - 120px)',
    pointerEvents: 'all',
  },
  reportInner: {
    background: 'rgba(4,4,4,0.90)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid var(--c-border)',
    borderRadius: 4, padding: '24px 24px 20px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 120px)',
  },
  reportEyebrow: {
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '4px', color: 'var(--c-gold)',
    marginBottom: 8, textTransform: 'uppercase',
  },
  reportSummary: {
    fontFamily: 'var(--f-sans)', fontWeight: 200, fontSize: 17, letterSpacing: '0.5px',
    color: 'var(--c-silver)', lineHeight: 1.4, marginBottom: 6,
  },
  reportNote: {
    fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--c-soft)',
    lineHeight: 1.7, marginBottom: 2,
  },
  reportDivider: { height: 1, background: 'var(--c-border)', margin: '16px 0' },
  reportCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  reportCtaLine: {
    fontFamily: 'var(--f-mono)', fontSize: 9.5, letterSpacing: '0.5px',
    color: 'var(--c-subtle)', marginBottom: 10,
  },
  connectBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid var(--c-gold)',
    borderRadius: 2, padding: '10px 20px',
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '2.5px',
    color: 'var(--c-gold)', cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },

  attribution: {
    position: 'absolute', bottom: 8, right: 8,
    fontFamily: 'var(--f-mono)', fontSize: 8, color: 'var(--c-muted)', letterSpacing: '0.5px', zIndex: 50,
  },
};

// ── Per-aircraft card styles ───────────────────────────────────────────────────
const cStyles = {
  card: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid var(--c-border)',
    borderRadius: 3, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 6,
    textAlign: 'left', cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    width: '100%',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  cardReg: { fontFamily: 'var(--f-mono)', fontSize: 14, fontWeight: 400, color: 'var(--c-white)', letterSpacing: '2px' },
  cardType: { fontFamily: 'var(--f-sans)', fontSize: 9, color: 'var(--c-subtle)', marginTop: 2 },
  cardStatus: { fontFamily: 'var(--f-mono)', fontSize: 8.5, letterSpacing: '1px', textAlign: 'right', flexShrink: 0 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 4 },
  cardLocation: {
    fontFamily: 'var(--f-sans)', fontWeight: 300, fontSize: 13,
    color: 'var(--c-silver)', letterSpacing: '0.3px',
  },
  cardTime: { fontFamily: 'var(--f-mono)', fontSize: 8.5, color: 'var(--c-subtle)', lineHeight: 1.5 },
  cardTimeVal: { color: 'var(--c-soft)', fontFamily: 'var(--f-mono)' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginTop: 2 },
  cardSource: { fontFamily: 'var(--f-mono)', fontSize: 7.5, color: 'var(--c-muted)', letterSpacing: '0.3px' },
  cardConfidence: { fontFamily: 'var(--f-mono)', fontSize: 8.5, fontWeight: 500, letterSpacing: '0.5px' },
};

// ── Connect modal styles ───────────────────────────────────────────────────────
const mStyles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: 'rgba(10,10,10,0.98)',
    border: '1px solid var(--c-border)', borderRadius: 4,
    padding: '32px 32px 28px', width: 'min(460px, 90vw)',
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  eyebrow: { fontFamily: 'var(--f-mono)', fontSize: 8.5, letterSpacing: '3.5px', color: 'var(--c-gold)', marginBottom: 8 },
  title: { fontFamily: 'var(--f-sans)', fontWeight: 200, fontSize: 22, color: 'var(--c-white)', letterSpacing: '0.5px', marginBottom: 4 },
  divider: { height: 1, background: 'var(--c-border)', margin: '14px 0' },
  body: { fontFamily: 'var(--f-sans)', fontSize: 12, color: 'var(--c-soft)', lineHeight: 1.7, marginBottom: 14 },
  features: { display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 },
  feat: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  featDot: { fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--c-gold)', flexShrink: 0, marginTop: 1 },
  featText: { fontFamily: 'var(--f-sans)', fontSize: 11, color: 'var(--c-silver)', lineHeight: 1.5 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  primaryBtn: {
    flex: 1, padding: '12px 16px',
    background: 'rgba(201,168,76,0.12)', border: '1px solid var(--c-gold)', borderRadius: 2,
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '2px', color: 'var(--c-gold)', cursor: 'pointer',
    transition: 'background 0.2s',
  },
  ghostBtn: {
    padding: '12px 18px',
    background: 'none', border: '1px solid var(--c-border)', borderRadius: 2,
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '2px', color: 'var(--c-subtle)', cursor: 'pointer',
  },
};
