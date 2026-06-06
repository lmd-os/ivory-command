import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FLEET, COMPANY, BASES } from '../data/fleet';

/* Count-up animation hook */
function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!start) return;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed  = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start]);

  return count;
}

function BigCounter({ label, value, unit, color = 'var(--c-white)', sublabel, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 1800, visible);

  return (
    <motion.div
      style={counterStyles.wrap}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
      onAnimationComplete={() => setVisible(true)}
    >
      <div style={counterStyles.label}>{label}</div>
      <div style={{ ...counterStyles.number, color }}>
        {count.toLocaleString()}
        {unit && <span style={counterStyles.unit}>{unit}</span>}
      </div>
      {sublabel && <div style={counterStyles.sub}>{sublabel}</div>}
    </motion.div>
  );
}

function ServiceLine({ icon, title, description }) {
  return (
    <div style={serviceStyles.row}>
      <div style={serviceStyles.icon}>{icon}</div>
      <div style={serviceStyles.content}>
        <div style={serviceStyles.title}>{title}</div>
        <div style={serviceStyles.desc}>{description}</div>
      </div>
    </div>
  );
}

function BaseCard({ base, index }) {
  return (
    <motion.div
      style={baseStyles.card}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 + index * 0.1 }}
    >
      <div style={baseStyles.iata}>{base.iata}</div>
      <div style={baseStyles.city}>{base.name}</div>
      <div style={baseStyles.airport}>{base.airport}</div>
      <div style={baseStyles.utc}>{base.utcOffset}</div>
    </motion.div>
  );
}

export function OperationsScreen({ airborneCount, groundCount }) {
  const airborne = airborneCount ?? 0;
  const ground   = FLEET.length - airborne;

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
          <div style={styles.eyebrow}>Ivory Jet Services · Global Operations</div>
          <h1 style={styles.title}>OPERATIONS</h1>
        </motion.div>

        {/* Main counters */}
        <div className="ops-counters-grid">
          <BigCounter
            label="FLEET"
            value={FLEET.length}
            sublabel="Active registered aircraft"
            color="var(--c-white)"
            delay={0.1}
          />
          <BigCounter
            label="AIRBORNE"
            value={airborne}
            sublabel={airborne > 0 ? 'Currently in flight' : 'No active flights detected'}
            color={airborne > 0 ? 'var(--c-green)' : 'var(--c-muted)'}
            delay={0.2}
          />
          <BigCounter
            label="GROUND"
            value={ground}
            sublabel="Aircraft on ground / standby"
            color="var(--c-amber)"
            delay={0.3}
          />
          <BigCounter
            label="CONTINENTS"
            value={4}
            sublabel="Africa · Europe · Asia · Middle East"
            color="var(--c-gold)"
            delay={0.4}
          />
        </div>

        <div style={styles.divider} />

        {/* Two columns */}
        <div className="ops-cols">

          {/* Services */}
          <div style={styles.col}>
            <motion.div
              style={styles.colTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              SERVICES
            </motion.div>
            <div style={serviceStyles.list}>
              <ServiceLine
                icon="✈"
                title="Business Aviation"
                description="Full aircraft charter — private, flexible, intercontinental"
              />
              <ServiceLine
                icon="+"
                title="MEDEVAC"
                description="Medical evacuation with equipped Falcon 50 (T7-AWO)"
              />
              <ServiceLine
                icon="◈"
                title="Aircraft Management"
                description="Complete management and exploitation for third-party owners"
              />
              <ServiceLine
                icon="◇"
                title="Acquisition Advisory"
                description="Asset sourcing, valuation and technical due diligence"
              />
            </div>
          </div>

          {/* Bases */}
          <div style={styles.col}>
            <motion.div
              style={styles.colTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              OPERATING BASES
            </motion.div>
            <div style={baseStyles.grid}>
              {BASES.map((base, i) => (
                <BaseCard key={base.id} base={base} index={i} />
              ))}
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Fleet breakdown */}
        <motion.div
          style={styles.fleetSection}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div style={styles.colTitle}>FLEET STATUS</div>
          <div style={styles.fleetTable}>
            <div style={styles.tableHeader}>
              <span>Registration</span>
              <span>Type</span>
              <span>Role</span>
              <span>Country</span>
              <span>Status</span>
            </div>
            {FLEET.map((aircraft) => (
              <div key={aircraft.id} style={styles.tableRow}>
                <span style={styles.tableReg}>{aircraft.registration}</span>
                <span style={styles.tableType}>{aircraft.type}</span>
                <span style={styles.tableRole}>{aircraft.roleShort}</span>
                <span style={styles.tableCountry}>{aircraft.country}</span>
                <span style={{ ...styles.tableStatus, color: 'var(--c-green)' }}>ACTIVE</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AOC note */}
        <motion.div
          style={styles.aocNote}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div style={styles.aocLabel}>AIR OPERATOR CERTIFICATE</div>
          <div style={styles.aocValue}>{COMPANY.aoc}</div>
          <div style={styles.aocSub}>
            Authorized to operate in Europe and worldwide under EU aviation standards
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
    padding: '48px 24px 80px',
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
  },
  countersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 1,
    background: 'var(--c-border)',
    border: '1px solid var(--c-border)',
    marginBottom: 40,
  },
  divider: {
    height: 1,
    background: 'var(--c-border)',
    margin: '40px 0',
  },
  cols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 40,
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  colTitle: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    color: 'var(--c-gold)',
    textTransform: 'uppercase',
  },
  fleetSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fleetTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1px solid var(--c-border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 0.6fr 0.8fr 0.6fr',
    gap: 16,
    padding: '10px 16px',
    background: 'var(--c-dark)',
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '2px',
    color: 'var(--c-muted)',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr 0.6fr 0.8fr 0.6fr',
    gap: 16,
    padding: '12px 16px',
    borderTop: '1px solid var(--c-border)',
    alignItems: 'center',
  },
  tableReg: {
    fontFamily: 'var(--f-mono)',
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--c-white)',
    letterSpacing: '1px',
  },
  tableType: {
    fontFamily: 'var(--f-sans)',
    fontSize: 12,
    color: 'var(--c-silver)',
  },
  tableRole: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '1px',
    color: 'var(--c-dim)',
  },
  tableCountry: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
  },
  tableStatus: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '1.5px',
  },
  aocNote: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderLeft: '2px solid var(--c-gold)',
    borderRadius: 2,
    padding: '16px 20px',
    marginTop: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  aocLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '3px',
    color: 'var(--c-gold)',
  },
  aocValue: {
    fontFamily: 'var(--f-sans)',
    fontSize: 14,
    color: 'var(--c-white)',
  },
  aocSub: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
  },
};

const counterStyles = {
  wrap: {
    background: 'var(--c-card)',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    color: 'var(--c-subtle)',
    textTransform: 'uppercase',
  },
  number: {
    fontFamily: 'var(--f-mono)',
    fontSize: 'clamp(36px, 4vw, 52px)',
    fontWeight: 400,
    lineHeight: 1,
  },
  unit: {
    fontSize: '0.4em',
    color: 'var(--c-subtle)',
    marginLeft: 4,
  },
  sub: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    lineHeight: 1.4,
  },
};

const serviceStyles = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  row: {
    display: 'flex',
    gap: 14,
    padding: '14px 0',
    borderBottom: '1px solid var(--c-border)',
  },
  icon: {
    fontFamily: 'var(--f-mono)',
    fontSize: 12,
    color: 'var(--c-gold)',
    flexShrink: 0,
    width: 16,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-white)',
    marginBottom: 3,
  },
  desc: {
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    color: 'var(--c-subtle)',
    lineHeight: 1.5,
  },
};

const baseStyles = {
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  card: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderRadius: 2,
    padding: '14px 16px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gridTemplateRows: 'auto auto',
    columnGap: 12,
    rowGap: 2,
    alignItems: 'center',
  },
  iata: {
    fontFamily: 'var(--f-mono)',
    fontSize: 14,
    color: 'var(--c-gold)',
    letterSpacing: '2px',
    gridRow: '1 / 3',
    gridColumn: '1',
  },
  city: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-white)',
    gridRow: 1,
    gridColumn: 2,
  },
  airport: {
    fontFamily: 'var(--f-sans)',
    fontSize: 10,
    color: 'var(--c-subtle)',
    gridRow: 2,
    gridColumn: 2,
  },
  utc: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    color: 'var(--c-muted)',
    gridRow: '1 / 3',
    gridColumn: 3,
    letterSpacing: '1px',
  },
};
