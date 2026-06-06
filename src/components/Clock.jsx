import { useState, useEffect } from 'react';

const pad = (n) => String(n).padStart(2, '0');

export function Clock({ className = '', showDate = false, utc = false }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = utc ? time.getUTCHours()    : time.getHours();
  const m = utc ? time.getUTCMinutes()  : time.getMinutes();
  const s = utc ? time.getUTCSeconds()  : time.getSeconds();

  const dateStr = utc
    ? time.toUTCString().slice(5, 16).toUpperCase()
    : time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <div className={className} style={styles.root}>
      {showDate && (
        <div style={styles.date}>{dateStr}</div>
      )}
      <div style={styles.time}>
        <span style={styles.hm}>{pad(h)}:{pad(m)}</span>
        <span style={styles.sep}>:</span>
        <span style={styles.sec}>{pad(s)}</span>
        {utc && <span style={styles.zone}> UTC</span>}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  date: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    letterSpacing: '2px',
    color: 'var(--c-subtle)',
  },
  time: {
    fontFamily: 'var(--f-mono)',
    fontSize: 15,
    fontWeight: 400,
    letterSpacing: '3px',
    color: 'var(--c-white)',
    display: 'flex',
    alignItems: 'baseline',
  },
  hm: {
    color: 'var(--c-white)',
  },
  sep: {
    color: 'var(--c-muted)',
    margin: '0 1px',
  },
  sec: {
    color: 'var(--c-subtle)',
    fontSize: 11,
  },
  zone: {
    fontFamily: 'var(--f-mono)',
    fontSize: 9,
    color: 'var(--c-subtle)',
    marginLeft: 4,
    letterSpacing: '1px',
  },
};
