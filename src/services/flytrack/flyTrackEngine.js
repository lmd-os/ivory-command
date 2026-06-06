/**
 * FlyTrackEngine — client-side orchestrator.
 *
 *  REAL mode  → POST /api/flytrack-scan (Netlify Function runs every provider
 *               server-side: bypasses CORS, injects OAuth/API secrets).
 *  DEMO mode  → local simulated tracks (clearly flagged demo:true).
 *
 * Returns a normalised envelope:
 *  {
 *    ok, mode, scannedAt,
 *    results:     { [aircraftId]: position|notFound },
 *    diagnostics: [ { provider,label,attempted,status,httpStatus,count,reason,lastSuccessAt } ],
 *  }
 */
import { FLYTRACK_CONFIG, PROVIDER_CATALOGUE } from './config.js';
import { generateDemoResults } from './demoTrack.js';
import { makeNotFound } from './providers/normalize.js';

function aircraftPayload(fleet) {
  return fleet.map((a) => ({
    id: a.id,
    icao24: a.icao24 || null,
    registration: a.registration || null,
    callsign: a.callsign || null,
  }));
}

/** DEMO scan — entirely local, no network. */
function demoScan(fleet) {
  const aircraft = aircraftPayload(fleet);
  const results = generateDemoResults(aircraft);
  const count = Object.values(results).filter((r) => r.found).length;
  return {
    ok: true,
    mode: 'demo',
    scannedAt: new Date().toISOString(),
    results,
    diagnostics: [
      {
        provider: 'demo',
        label: 'DEMO TRACK MODE',
        attempted: true,
        status: 'ok',
        httpStatus: null,
        count,
        reason: 'Simulated tracks — NOT real positions',
        lastSuccessAt: new Date().toISOString(),
      },
    ],
  };
}

/** REAL scan — via the server-side proxy. */
async function realScan(fleet, { signal } = {}) {
  const aircraft = aircraftPayload(fleet);

  try {
    const res = await fetch(FLYTRACK_CONFIG.scanEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aircraft, preferred: FLYTRACK_CONFIG.preferredProvider }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Proxy HTTP ${res.status}`);
    }
    const data = await res.json();
    // Ensure every aircraft has an entry
    const results = data.results || {};
    fleet.forEach((a) => {
      if (!results[a.id]) results[a.id] = makeNotFound('No data returned for this aircraft');
    });
    return {
      ok: true,
      mode: 'real',
      scannedAt: data.scannedAt || new Date().toISOString(),
      results,
      diagnostics: data.diagnostics || [],
    };
  } catch (e) {
    // Proxy unreachable (e.g. local `vite` without functions): honest fallback,
    // NEVER invent a position.
    const results = {};
    fleet.forEach((a) => { results[a.id] = makeNotFound('Tracking service unreachable'); });
    return {
      ok: false,
      mode: 'real',
      scannedAt: new Date().toISOString(),
      results,
      diagnostics: PROVIDER_CATALOGUE.map((p) => ({
        provider: p.id,
        label: p.label,
        attempted: false,
        status: 'unreachable',
        httpStatus: null,
        count: 0,
        reason: e.name === 'AbortError' ? 'Scan aborted' : `Tracking proxy unreachable: ${e.message}`,
        lastSuccessAt: null,
      })),
    };
  }
}

/**
 * Run a tracking scan for the given fleet.
 * @param {Array} fleet  the FLEET array (or subset)
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function runScan(fleet, opts = {}) {
  if (FLYTRACK_CONFIG.mode === 'demo') return demoScan(fleet);
  return realScan(fleet, opts);
}
