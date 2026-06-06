import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from '../components/Clock';

const COMPANY    = 'IVORY JET SERVICES';
const TAGLINE    = 'YOUR FLEET IS ALREADY MOVING';
const INTRO_WAIT = 6800;

/* Letter-by-letter animation variants */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065, delayChildren: 0.2 } },
};
const letterVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function IntroScreen({ onComplete }) {
  const [phase, setPhase]    = useState(0); // 0=start, 1=company, 2=tagline, 3=progress
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 800);
    const t1 = setTimeout(() => setPhase(2), 3200);
    const t2 = setTimeout(() => setPhase(3), 4800);
    timerRef.current = [t0, t1, t2];
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  /* Progress bar fill then trigger onComplete */
  useEffect(() => {
    if (phase !== 3) return;
    const start = Date.now();
    const duration = INTRO_WAIT - 4800;
    const raf = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const pct     = Math.min(elapsed / duration, 1);
      setProgress(pct);
      if (pct < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(onComplete, 300);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, onComplete]);

  return (
    <motion.div
      style={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Subtle grid overlay */}
      <div style={styles.grid} />

      {/* Radar ring */}
      <div style={styles.radarWrap}>
        {[1, 1.6, 2.4].map((scale, i) => (
          <div
            key={i}
            style={{
              ...styles.radarRing,
              width: `${scale * 160}px`,
              height: `${scale * 160}px`,
              opacity: 0.06 - i * 0.015,
            }}
          />
        ))}
        <div style={styles.radarSweep} />
        <div style={styles.radarDot} />
      </div>

      {/* Top-left: brand mark */}
      <motion.div
        style={styles.brandMark}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        IJS — LMDOS
      </motion.div>

      {/* Top-right: clock */}
      <motion.div
        style={styles.clockWrap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <Clock showDate utc />
      </motion.div>

      {/* Center content */}
      <div style={styles.center}>
        {/* Eyebrow */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              style={styles.eyebrow}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              FLEET INTELLIGENCE CENTER
            </motion.div>
          )}
        </AnimatePresence>

        {/* Company name — letter by letter */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              style={styles.companyName}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {COMPANY.split('').map((char, i) => (
                <motion.span
                  key={i}
                  variants={letterVariants}
                  style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider line */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              style={styles.divider}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Tagline */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              style={styles.tagline}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            >
              {TAGLINE}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              style={styles.progressWrap}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div style={styles.progressLabel}>INITIALIZING COMMAND CENTER</div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: coordinates */}
      <motion.div
        style={styles.coords}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <span>11°33'N — 43°09'E</span>
        <span style={{ margin: '0 16px', opacity: 0.4 }}>·</span>
        <span>05°16'N — 03°55'W</span>
        <span style={{ margin: '0 16px', opacity: 0.4 }}>·</span>
        <span>43°56'N — 12°27'E</span>
      </motion.div>
    </motion.div>
  );
}

const styles = {
  screen: {
    position: 'fixed',
    inset: 0,
    background: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1000,
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  radarWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  radarRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid rgba(201, 168, 76, 0.3)',
  },
  radarSweep: {
    position: 'absolute',
    width: 384,
    height: 384,
    borderRadius: '50%',
    background: 'conic-gradient(from 0deg, transparent 0deg, rgba(201, 168, 76, 0.06) 30deg, transparent 60deg)',
    animation: 'radarSweep 5s linear infinite',
  },
  radarDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--c-gold)',
    boxShadow: '0 0 8px var(--c-gold)',
    position: 'relative',
  },
  brandMark: {
    position: 'absolute',
    top: 24,
    left: 28,
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    color: 'var(--c-white)',
  },
  clockWrap: {
    position: 'absolute',
    top: 24,
    right: 28,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: 'var(--c-gold)',
  },
  companyName: {
    fontFamily: 'var(--f-sans)',
    fontSize: 'clamp(28px, 5vw, 52px)',
    fontWeight: 200,
    letterSpacing: 'clamp(6px, 1.5vw, 16px)',
    textTransform: 'uppercase',
    color: 'var(--c-white)',
    lineHeight: 1,
  },
  divider: {
    width: 240,
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--c-gold), transparent)',
    transformOrigin: 'center',
  },
  tagline: {
    fontFamily: 'var(--f-mono)',
    fontSize: 'clamp(10px, 1.5vw, 13px)',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: 'var(--c-subtle)',
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    width: 240,
  },
  progressLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 8,
    letterSpacing: '3px',
    color: 'var(--c-muted)',
  },
  progressTrack: {
    width: '100%',
    height: 1,
    background: 'var(--c-border)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--c-gold-dim), var(--c-gold))',
    transition: 'width 0.1s linear',
    borderRadius: 1,
  },
  coords: {
    position: 'absolute',
    bottom: 28,
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '2px',
    color: 'var(--c-white)',
    display: 'flex',
    alignItems: 'center',
  },
};

/* Inject keyframe for radar sweep */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
