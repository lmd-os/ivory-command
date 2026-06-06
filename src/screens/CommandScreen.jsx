import { useState } from 'react';
import { motion } from 'framer-motion';
import { ContactModal } from '../components/ContactModal';

const FEATURES = [
  {
    icon: '◈',
    title: 'Real-time fleet tracking',
    desc: 'Live ADS-B positions, altitude, speed, and heading for every aircraft in your fleet.',
  },
  {
    icon: '◇',
    title: 'Mission intelligence',
    desc: 'Origin, destination, route history, and operational metrics — all in one view.',
  },
  {
    icon: '◆',
    title: 'MEDEVAC coordination',
    desc: 'Dedicated emergency dispatch panel with priority routing and hospital integration.',
  },
  {
    icon: '▲',
    title: 'Multi-base operations',
    desc: 'Synchronized view across Djibouti, Abidjan, San Marino, and any future base.',
  },
];

export function CommandScreen() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <motion.div
      style={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={styles.inner}>

        {/* Hero */}
        <div style={styles.hero}>
          {/* Decorative lines */}
          <motion.div
            style={styles.lineTL}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
          <motion.div
            style={styles.lineTR}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />

          <motion.div
            style={styles.heroInner}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
          >
            <div style={styles.heroEyebrow}>Ivory Jet Services</div>

            <h1 style={styles.heroTitle}>
              Imagine managing your
              <br />
              <span style={{ color: 'var(--c-gold)', fontWeight: 200 }}>
                entire operation like this.
              </span>
            </h1>

            <p style={styles.heroDesc}>
              What you just experienced — the live map, the intelligence panel, the operational
              dashboard — is your private command center. Built for your fleet, your team,
              your operations. Available 24/7, accessible from anywhere.
            </p>

            <div style={styles.heroCTA}>
              <button
                style={styles.btnPrimary}
                onClick={() => setModalOpen(true)}
              >
                <span>Request your private command center</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>

              <div style={styles.btnNote}>
                No commitment · Confidential · Delivered in 48h
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          style={styles.featuresSection}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div style={styles.featuresLabel}>WHAT'S INCLUDED</div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                style={styles.featureCard}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              >
                <div style={styles.featureIcon}>{f.icon}</div>
                <div style={styles.featureTitle}>{f.title}</div>
                <div style={styles.featureDesc}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Divider quote */}
        <motion.div
          style={styles.quote}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <div style={styles.quoteLine} />
          <div style={styles.quoteText}>
            "The standard we set for ourselves is the standard
            <br />
            we deliver to you."
          </div>
          <div style={styles.quoteLine} />
        </motion.div>

        {/* Secondary CTA */}
        <motion.div
          style={styles.secondaryCTA}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
        >
          <div style={styles.secondaryText}>
            This intelligence platform was built by{' '}
            <span style={{ color: 'var(--c-gold)' }}>LMD Digital</span>
            {' '}for Ivory Jet Services.<br />
            We build custom command centers for private aviation operators worldwide.
          </div>

          <button
            style={styles.btnSecondary}
            onClick={() => setModalOpen(true)}
          >
            Request your command center
          </button>
        </motion.div>

      </div>

      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} />
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
    maxWidth: 900,
    margin: '0 auto',
    padding: '0 24px 80px',
  },
  hero: {
    position: 'relative',
    padding: '80px 0 64px',
    borderBottom: '1px solid var(--c-border)',
  },
  lineTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 80,
    background: 'linear-gradient(to bottom, var(--c-gold), transparent)',
    transformOrigin: 'top',
  },
  lineTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 1,
    height: 80,
    background: 'linear-gradient(to bottom, var(--c-gold), transparent)',
    transformOrigin: 'top',
  },
  heroInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    maxWidth: 680,
  },
  heroEyebrow: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '4px',
    color: 'var(--c-gold)',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 200,
    fontSize: 'clamp(28px, 4vw, 44px)',
    letterSpacing: '1px',
    color: 'var(--c-white)',
    lineHeight: 1.25,
  },
  heroDesc: {
    fontFamily: 'var(--f-sans)',
    fontSize: 14,
    color: 'var(--c-subtle)',
    lineHeight: 1.8,
    maxWidth: 580,
  },
  heroCTA: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
  },
  btnPrimary: {
    background: 'var(--c-gold)',
    border: 'none',
    borderRadius: 2,
    padding: '14px 28px',
    fontFamily: 'var(--f-sans)',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: '#000',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'background 0.2s ease',
  },
  btnNote: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    color: 'var(--c-muted)',
    letterSpacing: '2px',
  },
  featuresSection: {
    padding: '64px 0 56px',
    borderBottom: '1px solid var(--c-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  featuresLabel: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '3px',
    color: 'var(--c-subtle)',
    textTransform: 'uppercase',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  featureCard: {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderRadius: 2,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  featureIcon: {
    fontFamily: 'var(--f-mono)',
    fontSize: 14,
    color: 'var(--c-gold)',
  },
  featureTitle: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--c-white)',
  },
  featureDesc: {
    fontFamily: 'var(--f-sans)',
    fontSize: 12,
    color: 'var(--c-subtle)',
    lineHeight: 1.6,
  },
  quote: {
    padding: '56px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    borderBottom: '1px solid var(--c-border)',
  },
  quoteLine: {
    width: 1,
    height: 48,
    background: 'linear-gradient(to bottom, transparent, var(--c-border), transparent)',
  },
  quoteText: {
    fontFamily: 'var(--f-sans)',
    fontWeight: 200,
    fontSize: 'clamp(16px, 2.5vw, 22px)',
    color: 'var(--c-soft)',
    textAlign: 'center',
    letterSpacing: '0.5px',
    lineHeight: 1.5,
  },
  secondaryCTA: {
    padding: '56px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    alignItems: 'flex-start',
  },
  secondaryText: {
    fontFamily: 'var(--f-sans)',
    fontSize: 13,
    color: 'var(--c-subtle)',
    lineHeight: 1.8,
  },
  btnSecondary: {
    background: 'none',
    border: '1px solid var(--c-gold)',
    borderRadius: 2,
    padding: '12px 24px',
    fontFamily: 'var(--f-sans)',
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: 'var(--c-gold)',
    cursor: 'pointer',
    transition: 'background 0.2s ease, color 0.2s ease',
  },
};
