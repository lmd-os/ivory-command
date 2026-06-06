import { motion } from 'framer-motion';
import { Clock } from './Clock';

const NAV_ITEMS = [
  { id: 'fleet',      label: 'Live Fleet',  short: 'Fleet'  },
  { id: 'aircraft',   label: 'Aircraft',    short: 'A/C'    },
  { id: 'operations', label: 'Operations',  short: 'Ops'    },
  { id: 'command',    label: 'Command',     short: 'Cmd'    },
];

export function Navigation({ screen, onNavigate }) {
  return (
    <motion.nav
      className="nav-root"
      style={styles.nav}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
    >
      {/* Wordmark */}
      <div className="nav-wordmark" style={styles.wordmark}>
        <span style={styles.ic}>IVORY</span>
        <span style={styles.separator} />
        <span className="nav-cmd" style={styles.cmd}>COMMAND</span>
      </div>

      {/* Nav links */}
      <div className="nav-links" style={styles.links}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            short={item.short}
            active={screen === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>

      {/* Clock */}
      <div className="nav-clock" style={styles.clockWrap}>
        <Clock showDate utc />
      </div>
    </motion.nav>
  );
}

function NavItem({ label, short, active, onClick }) {
  return (
    <button style={styles.navBtn} onClick={onClick} data-active={active}>
      <span className="nav-label-full" style={{ ...styles.navLabel, color: active ? 'var(--c-white)' : 'var(--c-subtle)' }}>
        {label}
      </span>
      <span className="nav-label-short" style={{ ...styles.navLabelShort, color: active ? 'var(--c-white)' : 'var(--c-subtle)' }}>
        {short}
      </span>
      {active && (
        <motion.div
          layoutId="nav-indicator"
          style={styles.indicator}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      )}
    </button>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: '56px',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--c-border)',
  },
  wordmark: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  ic: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 200,
    fontSize: 13,
    letterSpacing: '5px',
    textTransform: 'uppercase',
    color: 'var(--c-gold)',
  },
  separator: {
    width: 1,
    height: 14,
    background: 'var(--c-border)',
    display: 'block',
  },
  cmd: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 500,
    fontSize: 11,
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: 'var(--c-silver)',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  navBtn: {
    position: 'relative',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'color var(--dur-normal) var(--ease)',
  },
  navLabel: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 400,
    fontSize: 11,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    transition: 'color 0.25s ease',
  },
  navLabelShort: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 400,
    fontSize: 10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    transition: 'color 0.25s ease',
    display: 'none',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 1,
    background: 'var(--c-gold)',
  },
  clockWrap: {
    flexShrink: 0,
  },
};
