/**
 * statusEnrich — Aircraft status enrichment.
 *
 * Hierarchy (never fabricated):
 *   LIVE          — real-time ADS-B signal
 *   LAST_SEEN     — last confirmed position (localStorage cache)
 *   BASE_VERIFIED — known operational base from public registry
 *   NOT_VISIBLE   — absolutely no data
 *
 * Provides: status, label, region, confidence (0-100), source, timestamps.
 */

export const TRACK_STATUS = {
  LIVE:           'LIVE',
  LAST_SEEN:      'LAST_SEEN',
  BASE_VERIFIED:  'BASE_VERIFIED',
  NOT_VISIBLE:    'NOT_VISIBLE',
};

// ── Known geographic reference points ────────────────────────────────────────
const KNOWN_PLACES = [
  { name: 'Djibouti',       lat: 11.547,  lon: 43.160 },
  { name: 'Abidjan',        lat:  5.261,  lon: -3.926 },
  { name: 'San Marino',     lat: 44.020,  lon: 12.612 },
  { name: 'Nairobi',        lat: -1.286,  lon: 36.820 },
  { name: 'Dubai',          lat: 25.204,  lon: 55.270 },
  { name: 'Addis Ababa',    lat:  8.977,  lon: 38.799 },
  { name: 'Mogadishu',      lat:  2.006,  lon: 45.304 },
  { name: 'Paris',          lat: 48.857,  lon:  2.352 },
  { name: 'Rome',           lat: 41.902,  lon: 12.496 },
  { name: 'Cairo',          lat: 30.044,  lon: 31.235 },
  { name: 'Dakar',          lat: 14.693,  lon:-17.447 },
  { name: 'Lagos',          lat:  6.524,  lon:  3.379 },
  { name: 'Accra',          lat:  5.559,  lon: -0.197 },
  { name: 'Riyadh',         lat: 24.688,  lon: 46.721 },
  { name: 'London',         lat: 51.507,  lon: -0.127 },
];

const BASE_COORDS = {
  Djibouti:     { city: 'Djibouti',              iata: 'JIB',  icao: 'HDAM', lat: 11.547, lon: 43.160 },
  Abidjan:      { city: 'Abidjan',               iata: 'ABJ',  icao: 'DIAP', lat:  5.261, lon: -3.926 },
  'San Marino': { city: 'San Marino (Rimini)',   iata: 'RMI',  icao: 'LIPR', lat: 44.020, lon: 12.612 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns a readable region string from lat/lon.
 * Uses nearest known reference city (< 500 km) or a geographic zone.
 */
export function getRegionFromCoords(lat, lon) {
  if (lat == null || lon == null) return null;
  let nearest = null;
  let minDist = Infinity;
  for (const p of KNOWN_PLACES) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < minDist) { minDist = d; nearest = p; }
  }
  if (nearest && minDist < 500) return `${nearest.name} area`;

  // Broad geographic zones
  if (lat > 0  && lat < 30 && lon > 30 && lon < 60) return 'East Africa / Horn of Africa';
  if (lat > -5 && lat < 20 && lon > -20 && lon < 15) return 'West Africa';
  if (lat > 30 && lat < 40 && lon > -5 && lon < 15) return 'Mediterranean';
  if (lat > 40 && lon > -10 && lon < 42) return 'Europe';
  if (lat > 15 && lat < 35 && lon > 35 && lon < 65) return 'Middle East / Gulf';
  if (lat > -35 && lat < 5 && lon > 10 && lon < 50) return 'Central / Southern Africa';
  return 'International airspace';
}

/** Confidence (0-100) based on data freshness (age in hours). */
function confidenceFromAge(ageH) {
  if (ageH == null) return 55;
  if (ageH <  1)   return 97;
  if (ageH <  6)   return 92;
  if (ageH < 12)   return 87;
  if (ageH < 24)   return 82;
  if (ageH < 48)   return 71;
  if (ageH < 72)   return 62;
  if (ageH < 168)  return 50;
  return 40;
}

/** Format a UTC timestamp to "DD Mon YYYY · HH:MM UTC". */
export function formatTimestamp(isoOrUnix) {
  if (!isoOrUnix) return null;
  const d = typeof isoOrUnix === 'number' ? new Date(isoOrUnix * 1000) : new Date(isoOrUnix);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  const yr  = d.getUTCFullYear();
  const hh  = String(d.getUTCHours()).padStart(2, '0');
  const mm  = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${mon} ${yr} · ${hh}:${mm} UTC`;
}

/** Human-readable age (e.g. "2h ago"). */
export function formatAge(seenAtUnix) {
  if (!seenAtUnix) return null;
  const diffMs = Date.now() - seenAtUnix * 1000;
  const h = Math.floor(diffMs / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  const m = Math.floor(diffMs / 60_000);
  return m > 0 ? `${m}m ago` : 'just now';
}

// ── Main enrichment function ──────────────────────────────────────────────────

/**
 * Returns the best displayable status for an aircraft.
 *
 * @param {string}  aircraftId
 * @param {object}  liveRecord        — from scan results (may be null)
 * @param {object}  cachedPositions   — { [id]: { lat, lon, seenAtUnix, ... } }
 * @param {object}  fleetAircraft     — fleet.js entry
 * @returns enriched status object
 */
export function getAircraftStatus(aircraftId, liveRecord, cachedPositions, fleetAircraft) {

  // ── 1. LIVE ─────────────────────────────────────────────────────────────────
  if (liveRecord?.found && liveRecord.lat != null && liveRecord.lon != null) {
    const onGround = Boolean(liveRecord.onGround);
    return {
      status:      TRACK_STATUS.LIVE,
      label:       onGround ? 'ON GROUND' : 'AIRBORNE',
      subLabel:    'Live ADS-B signal',
      region:      getRegionFromCoords(liveRecord.lat, liveRecord.lon),
      confidence:  100,
      demo:        Boolean(liveRecord.demo),
      lat:         liveRecord.lat,
      lon:         liveRecord.lon,
      baroAlt_ft:  liveRecord.baroAlt_ft ?? null,
      geoAlt_ft:   liveRecord.geoAlt_ft  ?? null,
      velocity_kts: liveRecord.velocity_kts ?? null,
      heading:     liveRecord.heading ?? null,
      callsign:    liveRecord.callsign || null,
      source:      liveRecord.source || 'ADS-B public network',
      seenAt:      null,
      seenAtUnix:  null,
      ageLabel:    null,
      timestamp:   null,
    };
  }

  // ── 2. LAST_SEEN ────────────────────────────────────────────────────────────
  const cached = cachedPositions?.[aircraftId];
  if (cached?.lat != null && cached?.lon != null) {
    const ageH = cached.seenAtUnix
      ? Math.floor((Date.now() / 1000 - cached.seenAtUnix) / 3600)
      : null;
    return {
      status:      TRACK_STATUS.LAST_SEEN,
      label:       'LAST SEEN',
      subLabel:    formatTimestamp(cached.seenAtUnix) || 'Previously confirmed',
      region:      getRegionFromCoords(cached.lat, cached.lon),
      confidence:  confidenceFromAge(ageH),
      demo:        false,
      lat:         cached.lat,
      lon:         cached.lon,
      baroAlt_ft:  cached.baroAlt_ft    ?? null,
      geoAlt_ft:   null,
      velocity_kts: cached.velocity_kts ?? null,
      heading:     cached.heading       ?? null,
      callsign:    cached.callsign      ?? null,
      source:      cached.source || 'Public flight network',
      seenAt:      cached.seenAt     || null,
      seenAtUnix:  cached.seenAtUnix || null,
      ageLabel:    cached.seenAtUnix ? formatAge(cached.seenAtUnix) : null,
      timestamp:   formatTimestamp(cached.seenAtUnix),
    };
  }

  // ── 3. BASE_VERIFIED ────────────────────────────────────────────────────────
  if (fleetAircraft?.bases?.length) {
    const baseName  = fleetAircraft.bases[0];
    const baseInfo  = BASE_COORDS[baseName] || null;
    return {
      status:      TRACK_STATUS.BASE_VERIFIED,
      label:       'BASE VERIFIED',
      subLabel:    fleetAircraft.bases.join(' · '),
      region:      fleetAircraft.bases[0],
      confidence:  78,
      demo:        false,
      lat:         baseInfo?.lat ?? null,
      lon:         baseInfo?.lon ?? null,
      baroAlt_ft:  null,
      geoAlt_ft:   null,
      velocity_kts: null,
      heading:     null,
      callsign:    null,
      source:      'Public operator data (ivoryjetservices.com, ch-aviation)',
      seenAt:      null,
      seenAtUnix:  null,
      ageLabel:    null,
      timestamp:   null,
      bases:       fleetAircraft.bases,
      primaryBase: baseName,
      baseInfo,
    };
  }

  // ── 4. NOT_VISIBLE ──────────────────────────────────────────────────────────
  return {
    status:      TRACK_STATUS.NOT_VISIBLE,
    label:       'PRIVATE VISIBILITY',
    subLabel:    'Not broadcasting on public ADS-B networks',
    region:      null,
    confidence:  0,
    demo:        false,
    lat:         null,
    lon:         null,
    source:      null,
    seenAt:      null,
    ageLabel:    null,
    timestamp:   null,
  };
}
