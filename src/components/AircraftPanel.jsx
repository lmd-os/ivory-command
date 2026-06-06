import { motion, AnimatePresence } from 'framer-motion';

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

const matchedByLabel = { icao24: 'ICAO 24-bit', registration: 'Registration', callsign: 'Callsign', demo: 'Demo route' };

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
  const isDemo = source.includes('DEMO');
  const color = isDemo ? 'var(--c-amber)' : isAdsb ? 'var(--c-blue)' : 'var(--c-subtle)';
  return (
    <span style={{ ...styles.sourcePill, color, borderColor: `${color}55` }}>{source}</span>
  );
}

export function AircraftPanel({ aircraft, record, onClose }) {
  if (!aircraft) return null;

  const live     = record && record.found ? record : null;
  const airborne = live && !live.onGround;
  const altitude = live?.baroAlt_ft ?? live?.geoAlt_ft;
  const speed    = live?.velocity_kts;
  const heading  = live?.heading;
  const lat      = live?.lat ?? null;
  const lon      = live?.lon ?? null;
  const callsign = live?.callsign || null;
  const origin   = live?.originCountry || null;
  const lastContactTime = live?.lastContact ? fmtTime(live.lastContact) : 'Unavailable';
  const altitudeType    = live?.baroAlt_ft != null ? 'Baro altitude' : 'Geo altitude';
  const isDemo   = Boolean(live?.demo);

  return (
    <AnimatePresence>
      <motion.aside
        key="panel"
        className="ac-panel"
        style={styles.panel}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
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
          {live ? (
            <Badge label={airborne ? '● AIRBORNE' : '● ON GROUND'} color={airborne ? 'var(--c-green)' : 'var(--c-amber)'} />
          ) : (
            <Badge label="○ NOT PUBLICLY VISIBLE" color="var(--c-muted)" />
          )}
          {isDemo            && <Badge label="DEMO TRACK"  color="var(--c-amber)" />}
          {aircraft.medevac  && <Badge label="MEDEVAC"     color="var(--c-blue)" />}
          {aircraft.vip      && <Badge label="VIP"         color="var(--c-gold)" />}
        </div>

        <div style={styles.divider} />

        <div style={styles.content}>
          {live ? (
            <>
              {/* LIVE POSITION */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionTitle}>Live Position</span>
                  {live.source && <SourcePill source={live.source} />}
                </div>
                <Row label="Latitude"     value={fmtCoord(lat, 'N', 'S')} />
                <Row label="Longitude"    value={fmtCoord(lon, 'E', 'W')} />
                <Row label={altitudeType} value={altitude != null ? `${altitude.toLocaleString()} ft` : 'Unavailable'} />
                <Row label="Speed"        value={speed != null ? `${speed} kts` : 'Unavailable'} />
                <Row label="Heading"      value={heading != null ? `${heading}°` : 'Unavailable'} />
                {callsign && <Row label="Callsign" value={callsign} gold />}
                <Row label="Last contact" value={lastContactTime} mono={false} />
                <Row label="Matched by"   value={matchedByLabel[live.matchedBy] || 'Unavailable'} mono={false} />
              </div>
            </>
          ) : (
            /* Honest absence — never an empty void */
            <div style={styles.absence}>
              <div style={styles.absenceTitle}>Not publicly visible now</div>
              <div style={styles.absenceText}>
                {record?.reason || 'Last public signal unavailable.'}
              </div>
              <div style={styles.absenceHint}>
                Aircraft may be on ground, outside public ADS-B coverage, blocked from
                public tracking, or not currently broadcasting. The system keeps scanning
                every source.
              </div>
            </div>
          )}

          <div style={styles.divider} />

          {/* AIRCRAFT SPECS */}
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

          {/* PERFORMANCE */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Performance</div>
            <Row label="Range"   value={fmt(aircraft.rangeKm, 'km')} />
            <Row label="Speed"   value={fmt(aircraft.maxSpeedKmh, 'km/h')} />
            <Row label="Ceiling" value={fmt(aircraft.ceilingFt, 'ft')} />
            <Row label="Engines" value={aircraft.engines} mono={false} />
          </div>

          <div style={styles.divider} />

          {/* BASES */}
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
              Position: {live?.source || 'public ADS-B networks (none broadcasting now)'}.
              Origin/destination is not broadcast publicly by private operators.
              Identity verified via hexdb.io, ch-aviation, ivoryjetservices.com.
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
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 18px 10px' },
  reg: { fontFamily: 'var(--f-mono)', fontSize: 22, fontWeight: 300, letterSpacing: '4px', color: 'var(--c-white)' },
  typeLabel: { fontFamily: 'var(--f-sans)', fontSize: 10, color: 'var(--c-subtle)', letterSpacing: '0.5px', marginTop: 4 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-subtle)',
    padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 2, transition: 'color 0.15s', flexShrink: 0,
  },
  statusBar: { display: 'flex', gap: 6, padding: '0 18px 12px', flexWrap: 'wrap' },
  badge: { fontFamily: 'var(--f-mono)', fontSize: 8.5, fontWeight: 500, letterSpacing: '1.5px', padding: '3px 8px', borderRadius: 2 },
  sourcePill: { fontFamily: 'var(--f-mono)', fontSize: 7.5, letterSpacing: '0.5px', padding: '2px 6px', borderRadius: 2, border: '1px solid', flexShrink: 0 },
  divider: { height: 1, background: 'var(--c-border)', margin: '0 18px', flexShrink: 0 },
  content: { flex: 1, overflowY: 'auto', padding: '0 0 24px' },
  section: { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { fontFamily: 'var(--f-mono)', fontSize: 8.5, fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--c-gold)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowLabel: { fontFamily: 'var(--f-mono)', fontSize: 9.5, letterSpacing: '0.5px', color: 'var(--c-subtle)', flexShrink: 0 },
  rowValue: { fontSize: 11, textAlign: 'right', lineHeight: 1.4 },
  absence: {
    padding: '18px', display: 'flex', flexDirection: 'column', gap: 8,
  },
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
