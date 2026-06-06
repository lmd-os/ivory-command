/**
 * FlightRadarProvider — configurable placeholder.
 *
 * FlightRadar24 offers an official Business API (api.fr24.com). It is wired
 * here but inert until FLIGHTRADAR_API_KEY (+ optional FLIGHTRADAR_API_BASE)
 * are configured. It NEVER fabricates positions.
 *
 * Docs: https://fr24api.flightradar24.com/
 */
import { makeNotFound, makePosition } from './normalize.js';

export const meta = {
  id: 'flightradar',
  label: 'FlightRadar24',
  kind: 'optional',
  requiresKey: true,
};

export function isConfigured(env = {}) {
  return Boolean(env.FLIGHTRADAR_API_KEY || env.VITE_FLIGHTRADAR_API_KEY);
}

export async function scan({ aircraft, env = {}, signal }) {
  const results = {};
  aircraft.forEach((a) => { results[a.id] = makeNotFound('FlightRadar24 not configured'); });

  const key = env.FLIGHTRADAR_API_KEY || env.VITE_FLIGHTRADAR_API_KEY || '';
  if (!key) {
    return {
      provider: meta.id, label: meta.label, attempted: false,
      status: 'skipped', httpStatus: null, count: 0,
      reason: 'No API key (set FLIGHTRADAR_API_KEY to enable)',
      lastSuccessAt: null, results,
    };
  }

  const base = (env.FLIGHTRADAR_API_BASE || 'https://fr24api.flightradar24.com/api').replace(/\/$/, '');
  const regs = aircraft.map((a) => a.registration).filter(Boolean);
  if (!regs.length) {
    return {
      provider: meta.id, label: meta.label, attempted: false,
      status: 'skipped', httpStatus: null, count: 0,
      reason: 'No registrations to query', lastSuccessAt: null, results,
    };
  }

  try {
    const url = `${base}/live/flight-positions/full?registrations=${encodeURIComponent(regs.join(','))}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
        'Accept-Version': 'v1',
      },
      signal,
    });
    if (!res.ok) {
      return {
        provider: meta.id, label: meta.label, attempted: true,
        status: res.status === 401 ? 'unauthorized' : 'error',
        httpStatus: res.status, count: 0,
        reason: `HTTP ${res.status}`, lastSuccessAt: null, results,
      };
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    list.forEach((row) => {
      const ac = aircraft.find(
        (a) => (a.registration || '').toUpperCase() === (row.reg || '').toUpperCase(),
      );
      if (ac && row.lat != null && row.lon != null) {
        results[ac.id] = makePosition({
          lat: row.lat,
          lon: row.lon,
          baroAlt_ft:   row.alt ?? null,
          velocity_kts: row.gspeed ?? null,
          heading:      row.track ?? null,
          vertRate_fpm: row.vspeed ?? null,
          callsign:     row.callsign || null,
          squawk:       row.squawk || null,
          source: 'FlightRadar24',
          sourceId: 'flightradar',
          matchedBy: 'registration',
          lastContact: row.timestamp ? Math.round(new Date(row.timestamp).getTime() / 1000) : null,
        });
      }
    });
    const found = Object.values(results).filter((r) => r.found).length;
    return {
      provider: meta.id, label: meta.label, attempted: true,
      status: 'ok', httpStatus: res.status, count: found,
      reason: found === 0 ? 'No live positions returned' : null,
      lastSuccessAt: new Date().toISOString(), results,
    };
  } catch (e) {
    if (e.name === 'AbortError') {
      return {
        provider: meta.id, label: meta.label, attempted: true,
        status: 'timeout', httpStatus: null, count: 0,
        reason: 'Request timed out', lastSuccessAt: null, results,
      };
    }
    return {
      provider: meta.id, label: meta.label, attempted: true,
      status: 'error', httpStatus: null, count: 0,
      reason: e.message, lastSuccessAt: null, results,
    };
  }
}
