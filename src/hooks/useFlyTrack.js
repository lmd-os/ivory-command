/**
 * useFlyTrack — React hook driving the FlyTrack engine.
 *
 * Status hierarchy (honest, never fabricated):
 *   1. LIVE        — real-time ADS-B signal right now
 *   2. LAST_SEEN   — last confirmed position from localStorage cache
 *   3. BASE_VERIFIED — known operational base from fleet registry
 *   4. NOT_VISIBLE — no data from any source
 *
 * The localStorage cache is updated every time a live position is found.
 * Nothing is fabricated. If no data is available, it says so.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { FLEET } from '../data/fleet';
import { runScan as engineScan } from '../services/flytrack/flyTrackEngine';
import { FLYTRACK_CONFIG } from '../services/flytrack/config';
import { getAircraftStatus } from '../services/flytrack/statusEnrich';

// ── localStorage cache ──────────────────────────────────────────────────────
const CACHE_KEY = 'flytrack_lastSeen_v3';

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded or private mode */ }
}

/** Update the cache with any live positions found in the latest scan. */
function buildUpdatedCache(results, prevCache) {
  const updated = { ...prevCache };
  for (const [id, record] of Object.entries(results)) {
    if (record.found && record.lat != null && record.lon != null) {
      updated[id] = {
        lat:          record.lat,
        lon:          record.lon,
        baroAlt_ft:   record.baroAlt_ft   ?? null,
        velocity_kts: record.velocity_kts  ?? null,
        heading:      record.heading       ?? null,
        callsign:     record.callsign      ?? null,
        source:       record.source || 'ADS-B public network',
        seenAt:       new Date().toISOString(),
        seenAtUnix:   Math.round(Date.now() / 1000),
      };
    }
  }
  return updated;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useFlyTrack() {
  const [results, setResults]             = useState({});
  const [diagnostics, setDiagnostics]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [scanning, setScanning]           = useState(false);
  const [error, setError]                 = useState(null);
  const [lastScan, setLastScan]           = useState(null);
  const [mode, setMode]                   = useState(FLYTRACK_CONFIG.mode);
  const [cachedPositions, setCachedPositions] = useState(() => loadCache());

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
      const newResults = data.results || {};
      setResults(newResults);
      setDiagnostics(data.diagnostics || []);
      setMode(data.mode);
      setLastScan(new Date());
      setError(data.ok ? null : 'tracking_degraded');

      // Update localStorage cache with any newly found positions
      setCachedPositions((prev) => {
        const updated = buildUpdatedCache(newResults, prev);
        saveCache(updated);
        return updated;
      });
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

  /** Look up by aircraft id OR icao24 — live position or null. */
  const getLive = useCallback((key) => {
    if (!key) return null;
    if (results[key]?.found) return results[key];
    if (results[key]) return null;
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

  /**
   * Full enriched status for one aircraft (by aircraft.id).
   * Returns: { status, label, subLabel, confidence, lat, lon, ... }
   * Status levels: LIVE | LAST_SEEN | BASE_VERIFIED | NOT_VISIBLE
   */
  const getStatus = useCallback((aircraftId) => {
    const liveRecord    = results[aircraftId] ?? null;
    const fleetAircraft = FLEET.find((a) => a.id === aircraftId) ?? null;
    return getAircraftStatus(aircraftId, liveRecord, cachedPositions, fleetAircraft);
  }, [results, cachedPositions]);

  const found          = Object.values(results).filter((r) => r.found);
  const detectedCount  = found.length;
  const airborneCount  = found.filter((r) => !r.onGround).length;
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
    getStatus,
    runScan: doScan,
    detectedCount,
    airborneCount,
    groundCount,
    cachedPositions,
  };
}
