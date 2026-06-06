/**
 * DEMO TRACK MODE — strictly identified simulated tracks.
 *
 * Activated ONLY when VITE_FLYTRACK_MODE=demo. Every position produced here
 * carries demo:true and source:'DEMO TRACK MODE' so the UI can label it
 * unmistakably. This must NEVER be confused with real public data.
 *
 * Motion: deterministic great-circle interpolation between the operator's
 * real bases, driven by wall-clock time so markers move smoothly.
 */
import { BASES } from '../../data/fleet.js';
import { makePosition } from './providers/normalize.js';

const baseCoord = (id) => BASES.find((b) => b.id === id)?.coordinates || [0, 0];

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

/** Great-circle interpolation between [lng,lat] A and B at fraction f∈[0,1]. */
function interpolate([lng1, lat1], [lng2, lat2], f) {
  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);
  const Δφ = φ2 - φ1, Δλ = λ2 - λ1;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (δ === 0) return { lng: lng1, lat: lat1, bearing: 0 };

  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);

  const θ = Math.atan2(
    Math.sin(λ2 - λ) * Math.cos(φ2),
    Math.cos(φ) * Math.sin(φ2) - Math.sin(φ) * Math.cos(φ2) * Math.cos(λ2 - λ),
  );
  return { lng: toDeg(λ), lat: toDeg(φ), bearing: (toDeg(θ) + 360) % 360 };
}

/** Per-aircraft demo route definitions (between real bases). */
const ROUTES = {
  'T7-NTT': { from: 'djibouti', to: 'abidjan', periodMs: 90_000, alt: 41000, spd: 459 },
  'T7-AWO': { from: 'abidjan',  to: 'rimini',  periodMs: 120_000, alt: 39000, spd: 442 },
  'J2-HPV': { from: 'rimini',   to: 'djibouti', periodMs: 150_000, alt: 45000, spd: 488 },
};

/**
 * Build a demo results map keyed by aircraft.id.
 * @param {Array<{id,registration,icao24}>} aircraft
 */
export function generateDemoResults(aircraft) {
  const now = Date.now();
  const results = {};

  aircraft.forEach((ac) => {
    const route = ROUTES[ac.registration] || ROUTES[ac.id];
    if (!route) {
      // Hold on first base if no route defined
      const [lng, lat] = baseCoord('djibouti');
      results[ac.id] = makePosition({
        lat, lon: lng, onGround: true, velocity_kts: 0, heading: 0,
        source: 'DEMO TRACK MODE', sourceId: 'demo', matchedBy: 'demo', demo: true,
        lastContact: Math.round(now / 1000),
      });
      return;
    }

    // Triangle-wave fraction for back-and-forth motion
    const phase = (now % (route.periodMs * 2)) / route.periodMs;
    const f = phase <= 1 ? phase : 2 - phase;
    const forward = phase <= 1;
    const a = baseCoord(forward ? route.from : route.to);
    const b = baseCoord(forward ? route.to : route.from);
    const { lng, lat, bearing } = interpolate(a, b, f);

    const climbing = f < 0.12 || f > 0.88;
    results[ac.id] = makePosition({
      lat,
      lon: lng,
      baroAlt_ft: climbing ? Math.round(route.alt * (f < 0.5 ? f / 0.12 : (1 - f) / 0.12)) : route.alt,
      onGround: false,
      velocity_kts: route.spd,
      heading: Math.round(bearing),
      vertRate_fpm: f < 0.12 ? 2200 : f > 0.88 ? -1800 : 0,
      callsign: ac.callsign || ac.registration.replace('-', ''),
      source: 'DEMO TRACK MODE',
      sourceId: 'demo',
      matchedBy: 'demo',
      demo: true,
      lastContact: Math.round(now / 1000),
    });
  });

  return results;
}
