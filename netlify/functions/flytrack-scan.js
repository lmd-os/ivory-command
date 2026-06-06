/**
 * /.netlify/functions/flytrack-scan
 * ──────────────────────────────────────────────────────────────
 * Server-side FlyTrack aggregator. Runs every provider against the
 * requested aircraft, server-side, so the browser is free of CORS
 * limits and API secrets stay off the client.
 *
 * Request  (POST JSON):
 *   { aircraft: [{ id, icao24, registration, callsign }], preferred?: 'adsb'|'opensky' }
 *
 * Response (JSON):
 *   { ok, mode:'real', scannedAt, results: { [id]: position|notFound }, diagnostics: [...] }
 *
 * Secrets read from env (prefer non-VITE names; VITE_ names also accepted):
 *   OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET
 *   ADSB_API_KEY / ADSB_API_BASE
 *   AVIATIONSTACK_API_KEY
 *   FLIGHTRADAR_API_KEY / FLIGHTRADAR_API_BASE
 *   FLYTRACK_MANUAL_<HEX>
 */
import * as openSky from '../../src/services/flytrack/providers/openSkyProvider.js';
import * as adsb from '../../src/services/flytrack/providers/adsbProvider.js';
import * as aviationStack from '../../src/services/flytrack/providers/aviationStackProvider.js';
import * as flightRadar from '../../src/services/flytrack/providers/flightRadarProvider.js';
import * as manual from '../../src/services/flytrack/providers/manualVerifiedFallbackProvider.js';
import { makeNotFound, pickBetter } from '../../src/services/flytrack/providers/normalize.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const PER_PROVIDER_TIMEOUT_MS = 8000;

/** Run a provider with its own timeout so one slow source can't hang the scan. */
async function runProvider(mod, ctx) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_PROVIDER_TIMEOUT_MS);
  try {
    return await mod.scan({ ...ctx, signal: controller.signal });
  } catch (e) {
    return {
      provider: mod.meta.id,
      label: mod.meta.label,
      attempted: true,
      status: e.name === 'AbortError' ? 'timeout' : 'error',
      httpStatus: null,
      count: 0,
      reason: e.name === 'AbortError' ? `Timed out after ${PER_PROVIDER_TIMEOUT_MS}ms` : e.message,
      lastSuccessAt: null,
      results: {},
    };
  } finally {
    clearTimeout(timer);
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'invalid_json' }) };
  }

  const aircraft = Array.isArray(body.aircraft) ? body.aircraft : [];
  if (!aircraft.length) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'no_aircraft' }) };
  }

  const env = process.env;
  const ctx = { aircraft, env };

  // Provider order: optional preferred first, then the rest.
  const preferred = String(body.preferred || 'adsb').toLowerCase();
  const primaries = preferred === 'opensky' ? [openSky, adsb] : [adsb, openSky];
  const ordered = [...primaries, aviationStack, flightRadar, manual];

  // Skip providers that aren't configured (placeholders without keys) but still
  // record a diagnostic line so the UI shows they were considered.
  const diagnostics = [];
  const runnable = [];
  for (const mod of ordered) {
    const configured = typeof mod.isConfigured === 'function' ? mod.isConfigured(env) : true;
    if (!configured) {
      diagnostics.push({
        provider: mod.meta.id,
        label: mod.meta.label,
        attempted: false,
        status: 'skipped',
        httpStatus: null,
        count: 0,
        reason: mod.meta.skipHint || 'Not configured (no API key)',
        lastSuccessAt: null,
      });
    } else {
      runnable.push(mod);
    }
  }

  // Run all runnable providers in parallel.
  const runResults = await Promise.all(runnable.map((mod) => runProvider(mod, ctx)));

  // Merge: seed every aircraft as not-found, then fold in provider results by
  // priority (earlier providers win when both have a geo fix; pickBetter also
  // prefers the fresher fix).
  const merged = {};
  aircraft.forEach((a) => { merged[a.id] = makeNotFound('No public signal across all sources'); });

  // runResults are in the same order as `runnable` (Promise.all preserves order)
  runResults.forEach((r) => {
    const { results, ...diag } = r;
    diagnostics.push(diag);
    if (!results) return;
    Object.entries(results).forEach(([id, pos]) => {
      if (!merged[id]) { merged[id] = pos; return; }
      if (pos && pos.found) {
        merged[id] = merged[id].found ? pickBetter(merged[id], pos) : pos;
      }
    });
  });

  // Re-order diagnostics to a stable, readable order (primary → optional → fallback)
  const orderIndex = { opensky: 0, adsb: 1, aviationstack: 2, flightradar: 3, manual: 4 };
  diagnostics.sort((a, b) => (orderIndex[a.provider] ?? 9) - (orderIndex[b.provider] ?? 9));

  const detected = Object.values(merged).filter((r) => r.found).length;

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      ok: true,
      mode: 'real',
      scannedAt: new Date().toISOString(),
      detected,
      fleetCount: aircraft.length,
      results: merged,
      diagnostics,
    }),
  };
};
