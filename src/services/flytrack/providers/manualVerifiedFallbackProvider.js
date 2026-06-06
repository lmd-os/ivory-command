/**
 * ManualVerifiedFallbackProvider — last-resort, human-verified positions only.
 *
 * This provider NEVER invents a position. It returns a position ONLY when an
 * operator has explicitly supplied a manually-verified fix via env, in the form:
 *
 *   FLYTRACK_MANUAL_<HEX>="lat,lon,ISO8601[,onground]"
 *   e.g. FLYTRACK_MANUAL_5002D1="11.5465,43.1594,2026-06-06T18:00:00Z,onground"
 *
 * When none is supplied (default), it reports "no manually-verified position",
 * which keeps the aircraft in the fleet and lets the UI explain the absence.
 */
import { makePosition, makeNotFound } from './normalize.js';

export const meta = {
  id: 'manual',
  label: 'Manual Verified Fallback',
  kind: 'fallback',
  requiresKey: false,
};

export function isConfigured() {
  return true; // always available; simply yields nothing unless an entry exists
}

function readManual(env, hex) {
  if (!hex) return null;
  const key = `FLYTRACK_MANUAL_${hex.toUpperCase()}`;
  const raw = env[key];
  if (!raw) return null;
  const parts = String(raw).split(',').map((s) => s.trim());
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const ts = parts[2] ? Math.round(new Date(parts[2]).getTime() / 1000) : null;
  const onGround = (parts[3] || '').toLowerCase() === 'onground';
  return { lat, lon, ts, onGround };
}

export async function scan({ aircraft, env = {} }) {
  const results = {};
  let count = 0;

  aircraft.forEach((ac) => {
    const m = readManual(env, ac.icao24);
    if (m) {
      count += 1;
      results[ac.id] = makePosition({
        lat: m.lat,
        lon: m.lon,
        onGround: m.onGround,
        lastContact: m.ts,
        source: 'Manual (verified)',
        sourceId: 'manual',
        matchedBy: 'icao24',
      });
    } else {
      results[ac.id] = makeNotFound('No manually-verified position on file');
    }
  });

  return {
    provider: meta.id,
    label: meta.label,
    attempted: true,
    status: count > 0 ? 'ok' : 'no_data',
    httpStatus: null,
    count,
    reason: count > 0 ? null : 'No manual fix configured',
    lastSuccessAt: count > 0 ? new Date().toISOString() : null,
    results,
  };
}
