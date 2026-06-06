/**
 * AviationStackProvider — configurable placeholder.
 *
 * Activates only when AVIATIONSTACK_API_KEY is present. AviationStack's
 * free tier does not expose live lat/lon, so this is wired but inert until
 * a paid key is configured. It NEVER fabricates positions.
 *
 * Docs: https://aviationstack.com/documentation
 */
import { makeNotFound, makePosition } from './normalize.js';

export const meta = {
  id: 'aviationstack',
  label: 'AviationStack',
  kind: 'optional',
  requiresKey: true,
};

export function isConfigured(env = {}) {
  return Boolean(env.AVIATIONSTACK_API_KEY || env.VITE_AVIATIONSTACK_API_KEY);
}

export async function scan({ aircraft, env = {}, signal }) {
  const results = {};
  aircraft.forEach((a) => { results[a.id] = makeNotFound('AviationStack not configured'); });

  const key = env.AVIATIONSTACK_API_KEY || env.VITE_AVIATIONSTACK_API_KEY || '';
  if (!key) {
    return {
      provider: meta.id, label: meta.label, attempted: false,
      status: 'skipped', httpStatus: null, count: 0,
      reason: 'No API key (set AVIATIONSTACK_API_KEY to enable)',
      lastSuccessAt: null, results,
    };
  }

  let okCount = 0;
  let httpStatus = null;
  let lastError = null;

  await Promise.all(
    aircraft.map(async (ac) => {
      if (!ac.registration) return;
      try {
        const url = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(key)}&aircraft_regnumber=${encodeURIComponent(ac.registration)}&flight_status=active`;
        const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
        httpStatus = res.status;
        if (!res.ok) { lastError = `HTTP ${res.status}`; return; }
        okCount += 1;
        const json = await res.json();
        const live = json?.data?.[0]?.live;
        if (live && live.latitude != null && live.longitude != null) {
          results[ac.id] = makePosition({
            lat: live.latitude,
            lon: live.longitude,
            baroAlt_ft:   live.altitude != null ? Math.round(live.altitude * 3.28084) : null,
            onGround:     Boolean(live.is_ground),
            velocity_kts: live.speed_horizontal != null ? Math.round(live.speed_horizontal / 1.852) : null,
            heading:      live.direction != null ? Math.round(live.direction) : null,
            vertRate_fpm: live.speed_vertical != null ? Math.round(live.speed_vertical * 196.85) : null,
            source: 'AviationStack',
            sourceId: 'aviationstack',
            matchedBy: 'registration',
            lastContact: live.updated ? Math.round(new Date(live.updated).getTime() / 1000) : null,
          });
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        lastError = e.message;
      }
    })
  );

  const found = Object.values(results).filter((r) => r.found).length;
  return {
    provider: meta.id, label: meta.label, attempted: true,
    status: okCount > 0 ? 'ok' : 'error', httpStatus, count: found,
    reason: okCount === 0 ? (lastError || 'No response') : (found === 0 ? 'No active flight' : null),
    lastSuccessAt: okCount > 0 ? new Date().toISOString() : null, results,
  };
}
