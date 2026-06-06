/**
 * FlyTrack — client configuration (Vite env, non-secret only).
 *
 * Secrets (OpenSky client secret, ADS-B keys) are NEVER read client-side.
 * They live server-side in the Netlify Function (process.env).
 *
 * Env vars (set in Netlify dashboard or .env):
 *   VITE_FLYTRACK_MODE   = real | demo        (default: real)
 *   VITE_FLIGHT_PROVIDER = adsb | opensky      (preferred primary, default: adsb)
 *
 * The following are documented for completeness but are read SERVER-SIDE
 * by the proxy (prefer the non-VITE names so they are not exposed in the
 * client bundle):
 *   OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET   (OAuth2 client credentials)
 *   ADSB_API_KEY / AVIATIONSTACK_API_KEY / FLIGHTRADAR_API_KEY
 */

const env = import.meta.env ?? {};

const rawMode = String(env.VITE_FLYTRACK_MODE ?? 'real').trim().toLowerCase();

export const FLYTRACK_CONFIG = {
  /** 'real' = public data only · 'demo' = clearly-marked simulated tracks */
  mode: rawMode === 'demo' ? 'demo' : 'real',

  /** Preferred primary real provider when several return a position. */
  preferredProvider: String(env.VITE_FLIGHT_PROVIDER ?? 'adsb').trim().toLowerCase(),

  /** Server-side proxy endpoint (bypasses CORS, injects secrets). */
  scanEndpoint: '/api/flytrack-scan',

  /** Real-mode polling cadence (ms) — within the 30–60 s requested window. */
  realPollMs: 45_000,

  /** Demo-mode animation cadence (ms) — smooth simulated motion. */
  demoPollMs: 2_000,
};

/** Static provider catalogue for the diagnostics UI (labels only, no secrets). */
export const PROVIDER_CATALOGUE = [
  { id: 'opensky',       label: 'OpenSky Network',         kind: 'primary'  },
  { id: 'adsb',          label: 'ADS-B Exchange (adsb.lol)', kind: 'primary' },
  { id: 'aviationstack', label: 'AviationStack',           kind: 'optional' },
  { id: 'flightradar',   label: 'FlightRadar24',           kind: 'optional' },
  { id: 'manual',        label: 'Manual Verified Fallback', kind: 'fallback' },
];

export const isDemoMode = () => FLYTRACK_CONFIG.mode === 'demo';
