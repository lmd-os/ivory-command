/**
 * Shared normalisation helpers for all FlyTrack providers.
 * Output is a single canonical "position" shape used across the app.
 *
 * ABSOLUTE RULE: never fabricate values. Unknown → null.
 */

export const metersToFeet = (m) => (m == null ? null : Math.round(m * 3.28084));
export const msToKnots    = (ms) => (ms == null ? null : Math.round(ms * 1.94384));
export const msToFpm      = (ms) => (ms == null ? null : Math.round(ms * 196.85));

/** Canonical "found" position object. */
export function makePosition(fields) {
  return {
    found:        true,
    lat:          fields.lat ?? null,
    lon:          fields.lon ?? null,
    baroAlt_ft:   fields.baroAlt_ft ?? null,
    geoAlt_ft:    fields.geoAlt_ft ?? null,
    onGround:     Boolean(fields.onGround),
    velocity_kts: fields.velocity_kts ?? null,
    heading:      fields.heading ?? null,
    vertRate_fpm: fields.vertRate_fpm ?? null,
    callsign:     fields.callsign ?? null,
    squawk:       fields.squawk ?? null,
    originCountry: fields.originCountry ?? null,
    lastContact:  fields.lastContact ?? null,   // unix seconds
    ageSec:       fields.ageSec ?? null,
    source:       fields.source ?? null,
    sourceId:     fields.sourceId ?? null,
    matchedBy:    fields.matchedBy ?? null,      // 'icao24' | 'registration' | 'callsign'
    demo:         Boolean(fields.demo),
    receivedAt:   Date.now(),
  };
}

/** Canonical "not found" object — keeps the aircraft in the fleet, no position. */
export function makeNotFound(reason) {
  return {
    found: false,
    reason: reason || 'No public signal currently available',
    source: null,
    demo: false,
    receivedAt: Date.now(),
  };
}

const hasGeo = (p) => p && p.found && p.lat != null && p.lon != null;

/**
 * Pick the better of two positions for the same aircraft.
 * Prefers the one with a real geo position; then the more recent.
 */
export function pickBetter(a, b) {
  if (hasGeo(a) && !hasGeo(b)) return a;
  if (hasGeo(b) && !hasGeo(a)) return b;
  if (!hasGeo(a) && !hasGeo(b)) return a || b;
  const ta = a.lastContact ?? (a.receivedAt / 1000);
  const tb = b.lastContact ?? (b.receivedAt / 1000);
  return tb > ta ? b : a;
}
