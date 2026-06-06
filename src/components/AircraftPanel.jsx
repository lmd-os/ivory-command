import { motion, AnimatePresence } from 'framer-motion';

const fmt = (v, unit = '') => (v == null ? 'Unavailable' : `${v.toLocaleString()}${unit ? ' ' + unit : ''}`);
const fmtCoord = (v, pos, neg) => {
  if (v == null) return 'Unavailable';
  const dir = v >= 0 ? pos : neg;
  return `${Math.abs(v).toFixed(4)}° ${dir}`;
};

function Row({ label, value, gold = false, mono = true }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={{ ...styles.rowValue, fontFamily: mono ? 'var(--f-mono)' : 'var(--f-sans)', color: gold ? 'var(--c-gold)' : (value === 'Unavailable' ? 'var(--c-subtle)' : 'var(--c-white)') }}>
        {value}
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

export function AircraftPanel({ aircraft, liveData, onClose }) {
  if (!aircraft) return null;

  const live     = liveData;
  const airborne = live && !live.onGround;
  const altitude = live?.baroAlt_ft ?? live?.geoAlt_ft;
  const speed    = live?.velocity_kts;
  const heading  = live?.heading;
  const lat      = live?.latitude;
  const lon      = live?.longitude;

  const lastContact = live?.lastContact
    ? new Date(live.lastContact * 1000).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) + ' UTC'
    : 'Unavailable';

  return (
    <AnimatePresence>
      <motion.aside
        key="panel"
        style={styles.panel}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Header */}
        <div style={styles.panelHeader}>
          <div>
            <div style={styles.reg}>{aircraft.registration}</div>
            <div style={styles.type}>{aircraft.fullType}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close panel">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Status bar */}
        <div style={styles.statusBar}>
          {live ? (
            <Badge
              label={airborne ? '● AIRBORNE' : '● ON GROUND'}
              color={airborne ? 'var(--c-green)' : 'var(--c-amber)'}
            />
          ) : (
            <Badge label="○ NOT TRACKED" color="var(--c-muted)" />
          )}
          {aircraft.medevac && <Badge label="MEDEVAC" color="var(--c-blue)" />}
          {aircraft.vip && <Badge label="VIP" color="var(--c-gold)" />}
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Scroll content */}
        <div style={styles.content}>

          {/* Live data section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Live Position</div>
            <Row label="Latitude"  value={fmtCoord(lat, 'N', 'S')} />
            <Row label="Longitude" value={fmtCoord(lon, 'E', 'W')} />
            <Row label="Altitude"  value={altitude != null ? `${altitude.toLocaleString()} ft` : 'Unavailable'} />
            <Row label="Speed"     value={speed != null ? `${speed} kts` : 'Unavailable'} />
            <Row label="Heading"   value={heading != null ? `${heading}°` : 'Unavailable'} />
            <Row label="Last contact" value={lastContact} mono={false} />
          </div>

          <div style={styles.divider} />

          {/* Aircraft specs */}
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

          {/* Performance */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Performance</div>
            <Row label="Range"    value={fmt(aircraft.rangeKm, 'km')} />
            <Row label="Speed"    value={fmt(aircraft.maxSpeedKmh, 'km/h')} />
            <Row label="Ceiling"  value={fmt(aircraft.ceilingFt, 'ft')} />
            <Row label="Engines"  value={aircraft.engines} mono={false} />
          </div>

          <div style={styles.divider} />

          {/* Bases */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Operating Bases</div>
            {aircraft.bases.map((base) => (
              <div key={base} style={styles.baseTag}>
                <span style={styles.baseDot} />
                <span style={styles.baseName}>{base}</span>
              </div>
            ))}
          </div>

          {/* Source note */}
          <div style={styles.source}>
            Data: public sources — ch-aviation, flightdb, OpenSky Network
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

const styles = {
  panel: {
    position: 'fixed',
    top: 56,
    right: 0,
    bottom: 0,
    width: 'min(320px, 100vw)',
    background: 'rgba(10,10,10,0.96)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderLeft: '1px solid var(--c-border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    overflowY: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 20px 12px',
  },
  reg: {
    fontFamily: 'var(--f-mono)',
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: '3px',
    color: 'var(--c-white)',
  },
  type: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    letterSpacing: '1px',
    marginTop: 4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--c-subtle)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color var(--dur-fast)',
    flexShrink: 0,
  },
  statusBar: {
    display: 'flex',
    gap: 6,
    padding: '0 20px 14px',
    flexWrap: 'wrap',
  },
  badge: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: '1.5px',
    padding: '3px 8px',
    borderRadius: 2,
  },
  divider: {
    height: 1,
    background: 'var(--c-border)',
    margin: '0 20px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 0 24px',
  },
  section: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: 'var(--c-gold)',
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    letterSpacing: '1px',
    color: 'var(--c-subtle)',
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  baseTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  baseDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--c-gold)',
    flexShrink: 0,
  },
  baseName: {
    fontFamily: 'var(--f-sans)',
    fontSize: 12,
    color: 'var(--c-silver)',
  },
  source: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    color: 'var(--c-muted)',
    padding: '12px 20px',
    lineHeight: 1.6,
    letterSpacing: '0.5px',
  },
};
