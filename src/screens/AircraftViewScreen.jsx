import { motion } from 'framer-motion';
import { FLEET } from '../data/fleet';

const roleColors = {
  'Business Aviation':           'var(--c-blue)',
  'Business Aviation / MEDEVAC': 'var(--c-green)',
  'VIP / Heads of State':        'var(--c-gold)',
};

const ManufacturerSVG = ({ manufacturer, height = 40 }) => {
  if (manufacturer === 'Embraer') {
    return (
      <svg viewBox="0 0 80 30" height={height} fill="none">
        {/* Embraer Legacy 600 silhouette - top view */}
        <path d="M40 2L37 10L18 18V21L37 17V24L31 27V29.5L40 27.5L49 29.5V27L43 24V17L62 21V18L43 10Z"
          fill="rgba(201,168,76,0.3)" stroke="var(--c-gold)" strokeWidth="0.5" />
      </svg>
    );
  }
  if (manufacturer === 'Dassault') {
    return (
      <svg viewBox="0 0 80 30" height={height} fill="none">
        {/* Falcon silhouette - top view (swept wing) */}
        <path d="M40 2L37.5 9L14 16V19L37 16.5V23.5L32 26V28L40 26.5L48 28V26L43 23.5V16.5L66 19V16L42.5 9Z"
          fill="rgba(201,168,76,0.3)" stroke="var(--c-gold)" strokeWidth="0.5" />
      </svg>
    );
  }
  return null;
};

function StatusPill({ label, color }) {
  return (
    <span style={{
      fontFamily: 'var(--f-mono)',
      fontSize: 8,
      letterSpacing: '2px',
      padding: '3px 8px',
      borderRadius: 2,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      color,
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, unit }) {
  return (
    <div style={statStyles.box}>
      <div style={statStyles.label}>{label}</div>
      <div style={statStyles.value}>
        {value}
        {unit && <span style={statStyles.unit}> {unit}</span>}
      </div>
    </div>
  );
}

function AircraftCard({ aircraft, index, getLive }) {
  const live    = getLive?.(aircraft.icao24);
  const tracked = live != null;
  const airborne = tracked && !live.onGround;
  const roleColor = roleColors[aircraft.role] ?? 'var(--c-subtle)';

  return (
    <motion.article
      style={cardStyles.card}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.12 }}
    >
      {/* Card header */}
      <div style={cardStyles.header}>
        <div style={cardStyles.headerLeft}>
          <div style={cardStyles.eyebrow}>
            {aircraft.flag} {aircraft.country}
          </div>
          <h2 style={cardStyles.registration}>{aircraft.registration}</h2>
          <div style={cardStyles.fullType}>{aircraft.fullType}</div>
        </div>

        <div style={cardStyles.headerRight}>
          <ManufacturerSVG manufacturer={aircraft.manufacturer} height={36} />
        </div>
      </div>

      {/* Status pills */}
      <div style={cardStyles.pills}>
        <StatusPill label={aircraft.role} color={roleColor} />
        {aircraft.medevac && <StatusPill label="MEDEVAC Equipped" color="var(--c-blue)" />}
        {aircraft.vip && <StatusPill label="VIP Mission" color="var(--c-gold)" />}
        {tracked ? (
          <StatusPill
            label={airborne ? '● Airborne' : '● On Ground'}
            color={airborne ? 'var(--c-green)' : 'var(--c-amber)'}
          />
        ) : (
          <StatusPill label="○ Not tracked" color="var(--c-muted)" />
        )}
      </div>

      {/* Divider */}
      <div style={cardStyles.divider} />

      {/* Stats grid */}
      <div style={cardStyles.statsGrid}>
        <StatBox label="MSN"     value={aircraft.msn} />
        <StatBox label="Built"   value={String(aircraft.builtYear)} />
        <StatBox label="Capacity" value={aircraft.capacity} unit="pax" />
        <StatBox label="Range"   value={aircraft.rangeKm.toLocaleString()} unit="km" />
        <StatBox label="Speed"   value={aircraft.maxSpeedKmh} unit="km/h" />
        <StatBox label="Ceiling" value={aircraft.ceilingFt.toLocaleString()} unit="ft" />
      </div>

      <div style={cardStyles.divider} />

      {/* Live data or honest absence */}
      <div style={cardStyles.live}>
        <div style={cardStyles.liveLabel}>
          LIVE POSITION
          {live?.demo && <span style={cardStyles.demoTag}>DEMO</span>}
        </div>
        {tracked && live.lat != null ? (
          <div style={cardStyles.liveGrid}>
            <div style={cardStyles.liveItem}>
              <span style={cardStyles.liveKey}>LAT</span>
              <span style={cardStyles.liveVal}>{Math.abs(live.lat).toFixed(4)}° {live.lat >= 0 ? 'N' : 'S'}</span>
            </div>
            <div style={cardStyles.liveItem}>
              <span style={cardStyles.liveKey}>LON</span>
              <span style={cardStyles.liveVal}>{Math.abs(live.lon).toFixed(4)}° {live.lon >= 0 ? 'E' : 'W'}</span>
            </div>
            <div style={cardStyles.liveItem}>
              <span style={cardStyles.liveKey}>ALT</span>
              <span style={cardStyles.liveVal}>{live.baroAlt_ft?.toLocaleString() ?? '—'} ft</span>
            </div>
            <div style={cardStyles.liveItem}>
              <span style={cardStyles.liveKey}>SPD</span>
              <span style={cardStyles.liveVal}>{live.velocity_kts ?? '—'} kts</span>
            </div>
          </div>
        ) : (
          <div style={cardStyles.notVisible}>
            <span style={cardStyles.notVisibleTitle}>Not publicly visible now</span>
            <span style={cardStyles.notVisibleHint}>
              May be on ground, outside public ADS-B coverage, blocked, or not currently broadcasting.
            </span>
          </div>
        )}
      </div>

      {/* Footer: engines + ICAO */}
      <div style={cardStyles.footer}>
        <div style={cardStyles.footerRow}>
          <span style={cardStyles.footerLabel}>Engines</span>
          <span style={cardStyles.footerVal}>{aircraft.engines}</span>
        </div>
        <div style={cardStyles.footerRow}>
          <span style={cardStyles.footerLabel}>ICAO 24-bit</span>
          <span style={{ ...cardStyles.footerVal, fontFamily: 'var(--f-mono)', color: aircraft.icao24 ? 'var(--c-gold)' : 'var(--c-muted)' }}>
            {aircraft.icao24?.toUpperCase() ?? 'N/A'}
          </span>
        </div>
        <div style={cardStyles.bases}>
          {aircraft.bases.map((b) => (
            <span key={b} style={cardStyles.baseTag}>{b}</span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export function AircraftViewScreen({ getLive }) {
  return (
    <motion.div
      style={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={styles.inner}>
        {/* Header */}
        <motion.div
          style={styles.header}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={styles.eyebrow}>Ivory Jet Services · Registered Fleet</div>
          <h1 style={styles.title}>AIRCRAFT</h1>
          <p style={styles.subtitle}>
            {FLEET.length} aircraft · All registrations verified via public aviation databases
          </p>
        </motion.div>

        {/* Cards */}
        <div className="aircraft-cards-grid">
          {FLEET.map((aircraft, i) => (
            <AircraftCard key={aircraft.id} aircraft={aircraft} index={i} getLive={getLive} />
          ))}
        </div>

        {/* Data transparency note */}
        <motion.div
          style={styles.note}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div style={styles.noteIcon}>ℹ</div>
          <div style={styles.noteText}>
            All fleet data sourced from public registries (hexdb.io, ch-aviation, flightdb.net, ivoryjetservices.com).
            Live positions via OpenSky Network &amp; ADS-B Exchange — tracking subject to public ADS-B broadcast availability.
            No data is invented or estimated.
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

const styles = {
  screen: {
    position: 'fixed',
    inset: 0,
    paddingTop: 56,
    background: 'var(--c-void)',
    overflowY: 'auto',
  },
  inner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '48px 24px 64px',
  },
  header: {
    marginBottom: 48,
  },
  eyebrow: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    color: 'var(--c-gold)',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 200,
    fontSize: 'clamp(32px, 5vw, 52px)',
    letterSpacing: 'clamp(6px, 1.5vw, 14px)',
    textTransform: 'uppercase',
    color: 'var(--c-white)',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-subtle)',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
    marginBottom: 40,
  },
  note: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderRadius: 3,
    padding: '16px 20px',
  },
  noteIcon: {
    fontFamily: 'var(--f-mono)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    flexShrink: 0,
    marginTop: 1,
  },
  noteText: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    lineHeight: 1.7,
  },
};

const cardStyles = {
  card: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderRadius: 3,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexShrink: 0,
    opacity: 0.8,
  },
  eyebrow: {
    fontFamily: 'var(--f-sans)',
    fontSize: 10,
    color: 'var(--c-subtle)',
    marginBottom: 6,
    letterSpacing: '1px',
  },
  registration: {
    fontFamily: 'var(--f-mono)',
    fontSize: 24,
    fontWeight: 400,
    color: 'var(--c-white)',
    letterSpacing: '3px',
    marginBottom: 4,
  },
  fullType: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-dim)',
  },
  pills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    background: 'var(--c-border)',
    margin: '16px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  live: {
    marginBottom: 0,
  },
  liveLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '3px',
    color: 'var(--c-subtle)',
    marginBottom: 10,
  },
  liveGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  liveItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  liveKey: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    color: 'var(--c-muted)',
    letterSpacing: '1px',
  },
  liveVal: {
    fontFamily: 'var(--f-mono)',
    fontSize: 11,
    color: 'var(--c-green)',
    letterSpacing: '1px',
  },
  demoTag: {
    fontFamily: 'var(--f-mono)',
    fontSize: 7,
    letterSpacing: '1.5px',
    color: 'var(--c-amber)',
    border: '1px solid rgba(240,160,48,0.4)',
    borderRadius: 2,
    padding: '1px 4px',
    marginLeft: 8,
  },
  notVisible: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--c-border)',
    borderRadius: 2,
  },
  notVisibleTitle: {
    fontFamily: 'var(--f-mono)',
    fontSize: 10,
    letterSpacing: '1px',
    color: 'var(--c-amber)',
  },
  notVisibleHint: {
    fontFamily: 'var(--f-sans)',
    fontSize: 10,
    color: 'var(--c-muted)',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  footerLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    color: 'var(--c-muted)',
    letterSpacing: '1px',
    flexShrink: 0,
  },
  footerVal: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    textAlign: 'right',
  },
  bases: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  baseTag: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '1.5px',
    color: 'var(--c-muted)',
    padding: '2px 6px',
    border: '1px solid var(--c-border)',
    borderRadius: 2,
  },
};

const statStyles = {
  box: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '2px',
    color: 'var(--c-muted)',
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'var(--f-mono)',
    fontSize: 13,
    color: 'var(--c-white)',
  },
  unit: {
    fontSize: 10,
    color: 'var(--c-subtle)',
  },
};
