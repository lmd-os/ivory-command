/**
 * useFlyTrack — React hook driving the FlyTrack engine.
 *
 * Exposes a stable API for the UI:
 *   getLive(icao24|id) → position|null     (null = not currently visible)
 *   diagnostics, mode, loading, scanning, error, lastScan
 *   detectedCount, airborneCount, groundCount
 *   runScan()  → manual "Run live scan" (no page reload)
 *
 * Real mode polls every 45 s; demo mode animates every 2 s.
 * NEVER fabricates a position — absence is surfaced honestly.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { FLEET } from '../data/fleet';
import { runScan as engineScan } from '../services/flytrack/flyTrackEngine';
import { FLYTRACK_CONFIG } from '../services/flytrack/config';

export function useFlyTrack() {
  const [results, setResults]         = useState({});
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading]         = useState(true);   // first load
  const [scanning, setScanning]       = useState(false);  // any scan in flight
  const [error, setError]             = useState(null);
  const [lastScan, setLastScan]       = useState(null);
  const [mode, setMode]               = useState(FLYTRACK_CONFIG.mode);

  const abortRef = useRef(null);
  const idToIcao = useRef(
    Object.fromEntries(FLEET.map((a) => [a.id, (a.icao24 || '').toLowerCase()])),
  );

  const doScan = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setScanning(true);
    try {
      const data = await engineScan(FLEET, { signal: abortRef.current.signal });
      setResults(data.results || {});
      setDiagnostics(data.diagnostics || []);
      setMode(data.mode);
      setLastScan(new Date());
      setError(data.ok ? null : 'tracking_degraded');
    } catch (e) {
      if (e.name !== 'AbortError') setError('scan_failed');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doScan();
    const interval = FLYTRACK_CONFIG.mode === 'demo'
      ? FLYTRACK_CONFIG.demoPollMs
      : FLYTRACK_CONFIG.realPollMs;
    const timer = setInterval(doScan, interval);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [doScan]);

  /** Look up by aircraft id OR icao24; returns position if found, else null. */
  const getLive = useCallback((key) => {
    if (!key) return null;
    // direct id hit
    if (results[key]?.found) return results[key];
    if (results[key]) return null; // present but not found
    // fall back to icao24 → id resolution
    const lower = String(key).toLowerCase();
    const entry = Object.entries(idToIcao.current).find(([, hex]) => hex === lower);
    if (entry) {
      const r = results[entry[0]];
      return r?.found ? r : null;
    }
    return null;
  }, [results]);

  /** Raw record (found OR notFound) for explanation UIs. */
  const getRecord = useCallback((key) => {
    if (!key) return null;
    if (results[key]) return results[key];
    const lower = String(key).toLowerCase();
    const entry = Object.entries(idToIcao.current).find(([, hex]) => hex === lower);
    return entry ? results[entry[0]] : null;
  }, [results]);

  const found = Object.values(results).filter((r) => r.found);
  const detectedCount = found.length;
  const airborneCount = found.filter((r) => !r.onGround).length;
  const groundCount    = found.filter((r) => r.onGround).length;

  return {
    results,
    diagnostics,
    mode,
    loading,
    scanning,
    error,
    lastScan,
    getLive,
    getRecord,
    runScan: doScan,
    detectedCount,
    airborneCount,
    groundCount,
  };
}
