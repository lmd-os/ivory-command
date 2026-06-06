/**
 * OpenSkyProvider — OpenSky Network REST API.
 *
 * Auth strategy (auto):
 *   1. If OPENSKY_CLIENT_ID + OPENSKY_CLIENT_SECRET present →
 *      OAuth2 client_credentials (the 2024+ recommended method),
 *      then GET /states/all with Bearer token.
 *   2. Else → anonymous GET /states/all (heavily rate-limited; may 429/time out).
 *
 * State vector format (array): see https://openskynetwork.github.io/opensky-api
 */
import { makePosition, makeNotFound, metersToFeet, msToKnots, msToFpm } from './normalize.js';

export const meta = {
  id: 'opensky',
  label: 'OpenSky Network',
  kind: 'primary',
  requiresKey: false,
};

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const STATES_URL = 'https://opensky-network.org/api/states/all';

export function isConfigured() {
  return true; // anonymous access is possible (best-effort)
}

function readCreds(env) {
  return {
    id: env.OPENSKY_CLIENT_ID || env.VITE_OPENSKY_CLIENT_ID || '',
    secret: env.OPENSKY_CLIENT_SECRET || env.VITE_OPENSKY_CLIENT_SECRET || '',
  };
}

async function getToken(env, signal) {
  const { id, secret } = readCreds(env);
  if (!id || !secret) return null;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: id,
    client_secret: secret,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  });
  if (!res.ok) throw new Error(`OAuth HTTP ${res.status}`);
  const json = await res.json();
  return json.access_token || null;
}

function parseState(s) {
  if (!s) return null;
  const lat = s[6];
  const lon = s[5];
  return {
    icao24: (s[0] || '').toLowerCase(),
    pos: makePosition({
      lat,
      lon,
      baroAlt_ft:   metersToFeet(s[7]),
      geoAlt_ft:    metersToFeet(s[13]),
      onGround:     Boolean(s[8]),
      velocity_kts: msToKnots(s[9]),
      heading:      s[10] != null ? Math.round(s[10]) : null,
      vertRate_fpm: msToFpm(s[11]),
      callsign:     (s[1] || '').trim() || null,
      originCountry: s[2] || null,
      squawk:       s[14] || null,
      lastContact:  s[4] || s[3] || null,
      source:       'OpenSky Network',
      sourceId:     'opensky',
      matchedBy:    'icao24',
    }),
  };
}

export async function scan({ aircraft, env = {}, signal }) {
  const icao24s = aircraft.map((a) => (a.icao24 || '').toLowerCase()).filter(Boolean);
  const results = {};
  aircraft.forEach((a) => { results[a.id] = makeNotFound('No OpenSky state vector in current scan'); });

  if (!icao24s.length) {
    return {
      provider: meta.id, label: meta.label, attempted: false,
      status: 'skipped', httpStatus: null, count: 0,
      reason: 'No ICAO24 codes to query', lastSuccessAt: null, results,
    };
  }

  let authMode = 'anonymous';
  let token = null;
  try {
    token = await getToken(env, signal);
    if (token) authMode = 'oauth2';
  } catch (e) {
    return {
      provider: meta.id, label: meta.label, attempted: true,
      status: 'unauthorized', httpStatus: null, count: 0,
      reason: `OAuth failed: ${e.message}`, lastSuccessAt: null, results,
    };
  }

  const params = icao24s.map((i) => `icao24=${encodeURIComponent(i)}`).join('&');
  const url = `${STATES_URL}?${params}`;
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers, signal });
    if (!res.ok) {
      return {
        provider: meta.id, label: meta.label, attempted: true,
        status: res.status === 429 ? 'rate_limited' : 'error',
        httpStatus: res.status, count: 0,
        reason: res.status === 429 ? 'Rate limit exceeded (anonymous quota)' : `HTTP ${res.status}`,
        lastSuccessAt: null, results,
      };
    }
    const json = await res.json();
    const byIcao = {};
    (json.states || []).forEach((s) => {
      const p = parseState(s);
      if (p?.icao24) byIcao[p.icao24] = p.pos;
    });
    aircraft.forEach((a) => {
      const hex = (a.icao24 || '').toLowerCase();
      if (hex && byIcao[hex]) results[a.id] = byIcao[hex];
    });
    const found = Object.values(results).filter((r) => r.found).length;
    return {
      provider: meta.id, label: meta.label, attempted: true,
      status: 'ok', httpStatus: res.status, count: found,
      reason: found === 0 ? `No state vectors (auth: ${authMode})` : null,
      authMode, lastSuccessAt: new Date().toISOString(), results,
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
