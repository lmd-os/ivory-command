import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRACK_STATUS } from '../services/flytrack/statusEnrich';

// ── Utilities ────────────────────────────────────────────────────────────────

const fmt = (v, unit = '') =>
  v == null ? 'Unavailable' : `${typeof v === 'number' ? v.toLocaleString() : v}${unit ? ' ' + unit : ''}`;

const fmtCoord = (v, pos, neg) => {
  if (v == null) return 'Unavailable';
  const dir = v >= 0 ? pos : neg;
  return `${Math.abs(v).toFixed(4)}° ${dir}`;
};

const fmtTime = (unixSec) => {
  if (unixSec == null) return 'Unavailable';
  return new Date(unixSec * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, gold = false, mono = true }) {
  const isUnavail = value === 'Unavailable' || value == null;
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={{
        ...styles.rowValue,
        fontFamily: mono ? 'var(--f-mono)' : 'var(--f-sans)',
        color: gold ? 'var(--c-gold)' : isUnavail ? 'var(--c-muted)' : 'var(--c-white)',
      }}>
        {value ?? 'Unavailable'}
      </div>
    </div>
  );
}

function Badge({ label, color = 'var(--c-muted)' }) {
  return (
    <span style={{ ...styles.badge, background: `${color}22`, border: `1px solid ${color}44`, color }}>
      {label}
    </span>
  );
}

function SourcePill({ source }) {
  if (!source) return null;
  const isAdsb = source.includes('ADS-B');
  const isDemo = source.includes('DEMO') || source.includes('demo');
  const isCached = source.includes('cached');
  const color = isDemo ? 'var(--c-amber)' : isCached ? 'var(--c-subtle)' : isAdsb ? 'var(--c-blue)' : 'var(--c-subtle)';
  return (
    <span style={{ ...styles.sourcePill, color, borderColor: `${color}55` }}>{source}</span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AircraftPanel({ aircraft, record, statusInfo, onClose }) {
  if (!aircraft) return null;

  // Detect mobile for slide direction
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const motionProps = isMobile
    ? { initial: { y: '100%', opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: '100%', opacity: 0 } }
    : { initial: { x: '100%', opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: '100%', opacity: 0 } };

  // ── Data preparation ─────────────────────────────────────────────────────
  const status      = statusInfo?.status ?? TRACK_STATUS.NOT_VISIBLE;
  const live        = record?.found ? record : null;
  const isLive      = status === TRACK_STATUS.LIVE;
  const isLastSeen  = status === TRACK_STATUS.LAST_SEEN;
  const isBase      = status === TRACK_STATUS.BASE_VERIFIED;
  const isDemo      = Boolean(live?.demo);

  const airborne    = live && !live.onGround;
  const altitude    = live?.baroAlt_ft ?? live?.geoAlt_ft;
  const altType     = live?.baroAlt_ft != null ? 'Baro altitude' : 'Geo altitude';

  // Build panel style: mobile = bottom sheet, desktop = right side panel
  const panelStyle = isMobile ? {
    ...styles.panel,
    top: 'auto',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100vw',
    height: '75vh',
    maxHeight: '75vh',
    borderLeft: 'none',
    borderTop: '1px solid var(--c-border)',
    borderRadius: '12px 12px 0 0',
  } : styles.panel;

  // Status badge for header
  function headerBadge() {
    switch (status) {
      case TRACK_STATUS.LIVE:
        return <Badge label={airborne ? '● AIRBORNE' : '● ON GROUND'} color={airborne ? 'var(--c-green)' : 'var(--c-amber)'} />;
      case TRACK_STATUS.LAST_SEEN:
        return <Badge label="◌ LAST SEEN" color="var(--c-blue)" />;
      case TRACK_STATUS.BASE_VERIFIED:
        return <Badge label="◎ BASE VERIFIED" color="var(--c-gold)" />;
      default:
        return <Badge label="○ NOT PUBLICLY VISIBLE" color="var(--c-muted)" />;
    }
  }

  return (
    <AnimatePresence>
      <motion.aside
        key="panel"
        className="ac-panel"
        style={panelStyle}
        {...motionProps}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Mobile drag handle */}
        {isMobile && <div style={styles.dragHandle} />}

        {/* Header */}
        <div style={styles.panelHeader}>
          <div>
            <div style={styles.reg}>{aircraft.registration}</div>
            <div style={styles.typeLabel}>{aircraft.fullType}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close panel">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Status badges */}
        <div style={styles.statusBar}>
          {headerBadge()}
          {isDemo            && <Badge label="DEMO TRACK"  color="var(--c-amber)" />}
          {aircraft.medevac  && <Badge label="MEDEVAC"     color="var(--c-blue)" />}
          {aircraft.vip      && <Badge label="VIP"         color="var(--c-gold)" />}
        </div>

        <div style={styles.divider} />

        <div style={styles.content}>

          {/* ── LIVE POSITION ─────────────────────────────────────────────── */}
          {isLive && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Live Position</span>
                {live.source && <SourcePill source={live.source} />}
              </div>
              <Row label="Latitude"     value={fmtCoord(live.lat, 'N', 'S')} />
              <Row label="Longitude"    value={fmtCoord(live.lon, 'E', 'W')} />
              <Row label={altType}      value={altitude != null ? `${altitude.toLocaleString()} ft` : 'Unavailable'} />
              <Row label="Speed"        value={live.velocity_kts != null ? `${live.velocity_kts} kts` : 'Unavailable'} />
              <Row label="Heading"      value={live.heading != null ? `${live.heading}°` : 'Unavailable'} />
              {live.callsign && <Row label="Callsign" value={live.callsign} gold />}
              <Row label="Last contact" value={live.lastContact ? fmtTime(live.lastContact) : 'Unavailable'} mono={false} />
              <Row label="Matched by"   value={live.matchedBy === 'icao24' ? 'ICAO 24-bit' : live.matchedBy ?? 'Unavailable'} mono={false} />
            </div>
          )}

          {/* ── LAST SEEN position ────────────────────────────────────────── */}
          {isLastSeen && statusInfo && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ ...styles.sectionTitle, color: 'var(--c-blue)' }}>Last Known Position</span>
                <SourcePill source={statusInfo.source} />
              </div>
              <div style={styles.lastSeenNote}>
                Last public signal: {statusInfo.subLabel}
                {statusInfo.ageLabel && ` (${statusInfo.ageLabel})`}
              </div>
              <Row label="Latitude"  value={fmtCoord(statusInfo.lat, 'N', 'S')} />
              <Row label="Longitude" value={fmtCoord(statusInfo.lon, 'E', 'W')} />
              {statusInfo.baroAlt_ft != null && <Row label="Altitude" value={`${statusInfo.baroAlt_ft.toLocaleString()} ft`} />}
              {statusInfo.velocity_kts != null && <Row label="Speed" value={`${statusInfo.velocity_kts} kts`} />}
              {statusInfo.heading != null && <Row label="Heading" value={`${statusInfo.heading}°`} />}
              <div style={styles.confidenceNote}>
                Confidence: {statusInfo.confidence} — position data may be hours old. Aircraft may have moved.
              </div>
            </div>
          )}

          {/* ── BASE VERIFIED ─────────────────────────────────────────────── */}
          {isBase && statusInfo && (
            <div style={styles.section}>
              <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
                Operational Base
              </div>
              <div style={styles.baseVerifiedNote}>
                No live or cached public position available.
                The aircraft is likely at or near its registered operational base.
              </div>
              <div style={{ marginTop: 8 }}>
                {statusInfo.bases?.map((b) => (
                  <div key={b} style={styles.baseVerifiedTag}>
                    <span style={styles.baseVerifiedDot} />
                    <span style={styles.baseVerifiedName}>{b}</span>
                  </div>
                ))}
              </div>
              {statusInfo.baseInfo && (
                <>
                  <Row label="IATA / ICAO" value={`${statusInfo.baseInfo.iata} / ${statusInfo.baseInfo.icao}`} />
                  <Row label="Latitude"    value={fmtCoord(statusInfo.lat, 'N', 'S')} />
                  <Row label="Longitude"   value={fmtCoord(statusInfo.lon, 'E', 'W')} />
                </>
              )}
              <div style={styles.confidenceNote}>
                Source: {statusInfo.source || 'public operator data'}. Position is approximate (airport coordinates).
              </div>
            </div>
          )}

          {/* ── NOT VISIBLE ───────────────────────────────────────────────── */}
          {status === TRACK_STATUS.NOT_VISIBLE && (
            <div style={styles.absence}>
              <div style={styles.absenceTitle}>Not publicly visible now</div>
              <div style={styles.absenceText}>
                {record?.reason || 'No live or historical position available from any public source.'}
              </div>
              <div style={styles.absenceHint}>
                Aircraft may be on ground, outside public ADS-B coverage, blocked from
                public tracking, or not currently broadcasting. The system keeps scanning
                every source.
              </div>
            </div>
          )}

          <div style={styles.divider} />

          {/* ── AIRCRAFT SPECS ────────────────────────────────────────────── */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Aircraft</div>
            <Row label="Registration" value={aircraft.registration} gold />
            <Row label="ICAO 24-bit"  value={aircraft.icao24?.toUpperCase() ?? 'N/A'} />
            <Row label="MSN"          value={aircraft.msn} />
            <Row label="Built"        value={String(aircraft.builtYear)} />
            <Row label="Capacity"     value={`${aircraft.capacity} pax`} />
            <Row label="Role"         value={aircraft.role} mono={false} />
          </div>

          <div style={styles.divider} />

          {/* ── PERFORMANCE ───────────────────────────────────────────────── */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Performance</div>
            <Row label="Range"   value={fmt(aircraft.rangeKm, 'km')} />
            <Row label="Speed"   value={fmt(aircraft.maxSpeedKmh, 'km/h')} />
            <Row label="Ceiling" value={fmt(aircraft.ceilingFt, 'ft')} />
            <Row label="Engines" value={aircraft.engines} mono={false} />
          </div>

          <div style={styles.divider} />

          {/* ── BASES ─────────────────────────────────────────────────────── */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Operating Bases</div>
            {aircraft.bases.map((base) => (
              <div key={base} style={styles.baseTag}>
                <span style={styles.baseDot} />
                <span style={styles.baseName}>{base}</span>
              </div>
            ))}
          </div>

          {/* Data transparency */}
          <div style={styles.dataNote}>
            <div style={styles.noteTitle}>DATA SOURCES</div>
            <div style={styles.noteText}>
              {isLive
                ? `Live: ${live?.source || 'ADS-B public network'}.`
                : isLastSeen
                  ? `Last seen: ${statusInfo?.source || 'ADS-B public network (cached)'}. Position may be outdated.`
                  : 'Position: public ADS-B networks (none broadcasting now).'
              } Identity: hexdb.io, ch-aviation, ivoryjetservices.com.
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

const styles = {
  panel: {
    position: 'fixed', top: 56, right: 0, bottom: 0,
    width: 'min(320px, 100vw)',
    background: 'rgba(8,8,8,0.97)',
    backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
    borderLeft: '1px solid var(--c-border)',
    display: 'flex', flexDirection: 'column', zIndex: 200, overflowY: 'hidden',
  },
  dragHandle: {
    width: 36, height: 4,
    background: 'var(--c-border)',
    borderRadius: 2,
    margin: '10px auto 0',
    flexShrink: 0,
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 18px 8px' },
  reg: { fontFamily: 'var(--f-mono)', fontSize: 20, fontWeight: 300, letterSpacing: '4px', color: 'var(--c-white)' },
  typeLabel: { fontFamily: 'var(--f-sans)', fontSize: 10, color: 'var(--c-subtle)', letterSpacing: '0.5px', marginTop: 3 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-subtle)',
    padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 2, transition: 'color 0.15s', flexShrink: 0, minWidth: 36, minHeight: 36,
  },
  statusBar: { display: 'flex', gap: 6, padding: '0 18px 10px', flexWrap: 'wrap' },
  badge: { fontFamily: 'var(--f-mono)', fontSize: 8.5, fontWeight: 500, letterSpacing: '1.5px', padding: '3px 8px', borderRadius: 2 },
  sourcePill: { fontFamily: 'var(--f-mono)', fontSize: 7.5, letterSpacing: '0.5px', padding: '2px 6px', borderRadius: 2, border: '1px solid', flexShrink: 0 },
  divider: { height: 1, background: 'var(--c-border)', margin: '0 18px', flexShrink: 0 },
  content: { flex: 1, overflowY: 'auto', padding: '0 0 32px' },
  section: { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { fontFamily: 'var(--f-mono)', fontSize: 8.5, fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--c-gold)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowLabel: { fontFamily: 'var(--f-mono)', fontSize: 9.5, letterSpacing: '0.5px', color: 'var(--c-subtle)', flexShrink: 0 },
  rowValue: { fontSize: 11, textAlign: 'right', lineHeight: 1.4 },

  lastSeenNote: {
    fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.3px',
    color: 'var(--c-blue)', lineHeight: 1.5, marginBottom: 4,
  },
  confidenceNote: {
    fontFamily: 'var(--f-sans)', fontSize: 9.5, color: 'var(--c-muted)',
    lineHeight: 1.5, marginTop: 4,
  },
  baseVerifiedNote: {
    fontFamily: 'var(--f-sans)', fontSize: 10, color: 'var(--c-soft)',
    lineHeight: 1.6, marginBottom: 4,
  },
  baseVerifiedTag: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  baseVerifiedDot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--c-gold)', flexShrink: 0 },
  baseVerifiedName: { fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--c-white)', fontWeight: 300 },

  absence: { padding: '18px', display: 'flex', flexDirection: 'column', gap: 8 },
  absenceTitle: { fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: '1px', color: 'var(--c-amber)' },
  absenceText: { fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--c-soft)', letterSpacing: '0.5px' },
  absenceHint: { fontFamily: 'var(--f-sans)', fontSize: 11, color: 'var(--c-subtle)', lineHeight: 1.6 },

  baseTag: { display: 'flex', alignItems: 'center', gap: 8 },
  baseDot: { width: 4, height: 4, borderRadius: '50%', background: 'var(--c-gold)', flexShrink: 0 },
  baseName: { fontFamily: 'var(--f-sans)', fontSize: 11, color: 'var(--c-silver)' },

  dataNote: { margin: '8px 18px 0', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--c-border)', borderRadius: 2 },
  noteTitle: { fontFamily: 'var(--f-mono)', fontSize: 7, letterSpacing: '2px', color: 'var(--c-muted)', marginBottom: 5 },
  noteText: { fontFamily: 'var(--f-mono)', fontSize: 8.5, color: 'var(--c-muted)', lineHeight: 1.6, letterSpacing: '0.3px' },
};
