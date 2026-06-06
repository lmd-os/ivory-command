/**
 * ADSBProvider — community ADS-B aggregator (adsb.lol, no key required).
 *
 * Free, no auth. Server-side use only (CORS-restricted upstream).
 * Endpoints:
 *   GET /v2/icao/{hex}     — by ICAO 24-bit hex
 *   GET /v2/reg/{reg}      — by registration
 *   GET /v2/callsign/{cs}  — by callsign
 *
 * Optionally targets a private ADS-B Exchange endpoint when ADSB_API_KEY +
 * ADSB_API_BASE are configured (RapidAPI-style), without changing the parser.
 */
import { makePosition, makeNotFound, pickBetter } from './normalize.js';

export const meta = {
  id: 'adsb',
  label: 'ADS-B Exchange (adsb.lol)',
  kind: 'primary',
  requiresKey: false,
};

export function isConfigured() {
  return true; // adsb.lol is always available without a key
}

function parseAc(ac, matchedBy) {
  if (!ac) return null;
  const lat = typeof ac.lat === 'number' ? ac.lat : null;
  const lon = typeof ac.lon === 'number' ? ac.lon : null;
  const nowSec = Math.round(Date.now() / 1000);
  const ageSec = typeof ac.seen_pos === 'number' ? Math.round(ac.seen_pos) : null;
  return makePosition({
    lat,
    lon,
    baroAlt_ft:   typeof ac.alt_baro === 'number' ? Math.round(ac.alt_baro) : null,
    geoAlt_ft:    typeof ac.alt_geom === 'number' ? Math.round(ac.alt_geom) : null,
    onGround:     ac.alt_baro === 'ground' || ac.ground === true,
    velocity_kts: typeof ac.gs === 'number' ? Math.round(ac.gs) : null,
    heading:      typeof ac.track === 'number' ? Math.round(ac.track) : null,
    vertRate_fpm: typeof ac.baro_rate === 'number' ? Math.round(ac.baro_rate) : null,
    callsign:     (ac.flight || '').trim() || null,
    squawk:       ac.squawk || null,
    lastContact:  ageSec != null ? nowSec - ageSec : null,
    ageSec,
    source:       'ADS-B Exchange',
    sourceId:     'adsb.lol',
    matchedBy,
  });
}

async function getJson(url, key, signal) {
  const headers = { Accept: 'application/json' };
  if (key) headers['x-rapidapi-key'] = key; // harmless for adsb.lol, used by private bases
  const res = await fetch(url, { headers, signal });
  return { ok: res.ok, status: res.status, json: res.ok ? await res.json() : null };
}

export async function scan({ aircraft, env = {}, signal }) {
  const base = (env.ADSB_API_BASE || 'https://api.adsb.lol/v2').replace(/\/$/, '');
  const key = env.ADSB_API_KEY || env.VITE_ADSB_API_KEY || '';

  const results = {};
  let okCount = 0;
  let httpStatus = null;
  let lastError = null;

  await Promise.all(
    aircraft.map(async (ac) => {
      const icao = (ac.icao24 || '').toLowerCase();
      if (!icao && !ac.registration) {
        results[ac.id] = makeNotFound('No ICAO24 / registration to query');
        return;
      }

      // Attempt order: ICAO24 → registration
      const attempts = [];
      if (icao) attempts.push({ url: `${base}/icao/${icao}`, by: 'icao24' });
      if (ac.registration) attempts.push({ url: `${base}/reg/${encodeURIComponent(ac.registration)}`, by: 'registration' });

      let best = makeNotFound('No public ADS-B signal in current scan');

      for (const att of attempts) {
        try {
          const { ok, status, json } = await getJson(att.url, key, signal);
          httpStatus = status;
          if (!ok) { lastError = `HTTP ${status}`; continue; }
          okCount += 1;
          const list = Array.isArray(json?.ac) ? json.ac : [];
          if (list.length) {
            const parsed = parseAc(list[0], att.by);
            if (parsed) best = pickBetter(best, parsed);
          }
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          lastError = e.message;
        }
      }

      results[ac.id] = best;
    })
  );

  const found = Object.values(results).filter((r) => r.found).length;
  return {
    provider: meta.id,
    label: meta.label,
    attempted: true,
    status: okCount > 0 ? 'ok' : 'error',
    httpStatus,
    count: found,
    reason: okCount === 0
      ? (lastError || 'No successful response')
      : (found === 0 ? 'No aircraft currently broadcasting' : null),
    lastSuccessAt: okCount > 0 ? new Date().toISOString() : null,
    results,
  };
}
