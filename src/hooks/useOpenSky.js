/**
 * useOpenSky — dual-source real-time flight tracker
 *
 * Sources (tried in parallel, best data wins per aircraft):
 *  1. OpenSky Network — opensky-network.org/api
 *  2. api.adsb.fi      — community ADS-B aggregator (no key required)
 *
 * All data is public and unmodified.
 * If no data is available for an aircraft, getLive() returns null.
 * NEVER invents positions.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { FLEET } from '../data/fleet';

const POLL_MS = 45_000; // 45 s — within the requested 30–60 s window

// ── Unit helpers (OpenSky uses SI, adsb.fi uses aviation units) ───────────
const metersToFeet = (m) => (m == null ? null : Math.round(m * 3.28084));
const msToKnots   = (ms) => (ms == null ? null : Math.round(ms * 1.94384));
const msToFpm     = (ms) => (ms == null ? null : Math.round(ms * 196.85));

// ── OpenSky state vector → normalised object ──────────────────────────────
function parseOpenSkyState(s) {
  if (!s) return null;
  const lat = s[6];
  const lon = s[5];
  const ts  = s[3] ?? s[4]; // time_position ?? last_contact
  return {
    icao24:        (s[0] || '').toLowerCase(),
    callsign:      (s[1] || '').trim() || null,
    originCountry: s[2] || null,
    lat,
    lon,
    baroAlt_ft:    metersToFeet(s[7]),
    geoAlt_ft:     metersToFeet(s[13]),
    onGround:      Boolean(s[8]),
    velocity_kts:  msToKnots(s[9]),
    heading:       s[10] != null ? Math.round(s[10]) : null,
    vertRate_fpm:  msToFpm(s[11]),
    squawk:        s[14] || null,
    timePosition:  ts,
    lastContact:   s[4],
    hasPosition:   lat != null && lon != null,
    source:        'OpenSky Network',
    sourcedAt:     Date.now(),
  };
}

// ── adsb.fi AC object → normalised object ─────────────────────────────────
function parseAdsbFiAc(ac) {
  if (!ac) return null;
  const lat = ac.lat ?? null;
  const lon = ac.lon ?? null;
  return {
    icao24:        (ac.hex || '').toLowerCase(),
    callsign:      (ac.flight || '').trim() || null,
    originCountry: null,              // not provided by adsb.fi
    lat,
    lon,
    baroAlt_ft:    typeof ac.alt_baro === 'number' ? Math.round(ac.alt_baro) : null,
    geoAlt_ft:     typeof ac.alt_geom === 'number' ? Math.round(ac.alt_geom) : null,
    onGround:      ac.on_ground === 1 || ac.on_ground === true || ac.ground === 'ground',
    velocity_kts:  typeof ac.gs === 'number' ? Math.round(ac.gs) : null,
    heading:       typeof ac.track === 'number' ? Math.round(ac.track) : null,
    vertRate_fpm:  typeof ac.baro_rate === 'number' ? Math.round(ac.baro_rate) : null,
    squawk:        ac.squawk || null,
    timePosition:  ac.seen_pos != null ? Math.round(Date.now() / 1000 - ac.seen_pos) : null,
    lastContact:   ac.seen     != null ? Math.round(Date.now() / 1000 - ac.seen) : null,
    hasPosition:   lat != null && lon != null,
    source:        'ADS-B Exchange',
    sourcedAt:     Date.now(),
  };
}

// ── Source 1: OpenSky Network ─────────────────────────────────────────────
async function fetchOpenSky(icao24s, signal) {
  const params = icao24s.map(i => `icao24=${encodeURIComponent(i)}`).join('&');
  const res = await fetch(`https://opensky-network.org/api/states/all?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
  const json = await res.json();
  const result = {};
  (json.states || []).forEach((s) => {
    const parsed = parseOpenSkyState(s);
    if (parsed?.icao24) result[parsed.icao24] = parsed;
  });
  return result;
}

// ── Source 2: api.adsb.fi (community ADS-B, no auth required) ────────────
async function fetchAdsbFi(icao24s, signal) {
  const url = `https://api.adsb.fi/v1/icao?icao=${icao24s.join(',')}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`adsb.fi HTTP ${res.status}`);
  const json = await res.json();
  const result = {};
  (json.ac || []).forEach((ac) => {
    const parsed = parseAdsbFiAc(ac);
    if (parsed?.icao24) result[parsed.icao24] = parsed;
  });
  return result;
}

// ── Merge two source maps: prefer the entry with a valid position ─────────
// If both have a position, prefer the more recently sourced one.
function mergeSourceMaps(primary, fallback) {
  const result = { ...fallback };
  for (const [icao, data] of Object.entries(primary)) {
    const fb = fallback[icao];
    if (!fb) {
      result[icao] = data;
    } else if (data.hasPosition && !fb.hasPosition) {
      result[icao] = data;
    } else if (fb.hasPosition && !data.hasPosition) {
      result[icao] = fb;
    } else {
      // Both have a position: pick the most recently received
      result[icao] = (data.sourcedAt ?? 0) >= (fb.sourcedAt ?? 0) ? data : fb;
    }
  }
  return result;
}

// ── Main hook ─────────────────────────────────────────────────────────────
export const useOpenSky = () => {
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    const icao24s = FLEET.map((a) => a.icao24).filter(Boolean);
    if (!icao24s.length) { setLoading(false); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    try {
      // Run both sources in parallel — neither blocks the other
      const [openSkyResult, adsbFiResult] = await Promise.allSettled([
        fetchOpenSky(icao24s, signal),
        fetchAdsbFi(icao24s, signal),
      ]);

      const osSky  = openSkyResult.status  === 'fulfilled' ? openSkyResult.value  : {};
      const adsbFi = adsbFiResult.status   === 'fulfilled' ? adsbFiResult.value   : {};

      // Log source availability (dev only)
      if (import.meta.env.DEV) {
        if (openSkyResult.status  === 'rejected') console.warn('[OpenSky]', openSkyResult.reason?.message);
        if (adsbFiResult.status   === 'rejected') console.warn('[adsb.fi]', adsbFiResult.reason?.message);
      }

      // Merge: adsb.fi is primary (often more real-time), OpenSky is fallback
      const merged = mergeSourceMaps(adsbFi, osSky);

      setData(merged);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Live data temporarily unavailable');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const getLive = (icao24) => (icao24 ? (data[icao24.toLowerCase()] ?? null) : null);

  const detectedCount = Object.keys(data).length;
  const airborneCount = Object.values(data).filter((s) => !s.onGround).length;
  const groundCount   = Object.values(data).filter((s) => s.onGround).length;

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchData,
    getLive,
    detectedCount,
    airborneCount,
    groundCount,
  };
};
