/**
 * statusEnrich — Aircraft status enrichment.
 *
 * For each aircraft, determines the "best" displayable status from:
 *  1. LIVE        — real-time ADS-B signal right now
 *  2. LAST_SEEN   — previously confirmed position (localStorage cache)
 *  3. BASE_VERIFIED — known operational base from public operator data
 *  4. NOT_VISIBLE — no data from any source
 *
 * ABSOLUTE RULE: never fabricate a position.
 * The cache only stores positions that were actually received from public APIs.
 */

export const TRACK_STATUS = {
  LIVE:           'LIVE',
  LAST_SEEN:      'LAST_SEEN',
  BASE_VERIFIED:  'BASE_VERIFIED',
  NOT_VISIBLE:    'NOT_VISIBLE',
};

const BASE_LOCATIONS = {
  Djibouti:   { city: 'Djibouti', iata: 'JIB', icao: 'HDAM', lat: 11.547, lon: 43.160 },
  Abidjan:    { city: 'Abidjan', iata: 'ABJ', icao: 'DIAP', lat: 5.261, lon: -3.926 },
  'San Marino': { city: 'San Marino (Rimini)', iata: 'RMI', icao: 'LIPR', lat: 44.020, lon: 12.612 },
};

/** Format a staleness string from a Unix timestamp. */
export function formatAge(seenAtUnix) {
  if (!seenAtUnix) return null;
  const diffMs = Date.now() - seenAtUnix * 1000;
  const h = Math.floor(diffMs / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diffMs / 60_000);
  return m > 0 ? `${m}m ago` : 'just now';
}

/** Format an ISO timestamp for display (UTC). */
export function formatTimestamp(isoOrUnix) {
  if (!isoOrUnix) return null;
  const d = typeof isoOrUnix === 'number'
    ? new Date(isoOrUnix * 1000)
    : new Date(isoOrUnix);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

/**
 * Determine the enriched status for one aircraft.
 *
 * @param {string}  aircraftId        - fleet aircraft id
 * @param {object}  liveRecord        - from useFlyTrack results (may be null)
 * @param {object}  cachedPositions   - { [aircraftId]: { lat,lon,...,seenAtUnix } }
 * @param {object}  fleetAircraft     - the fleet entry (for bases)
 * @returns {object} enriched status object
 */
export function getAircraftStatus(aircraftId, liveRecord, cachedPositions, fleetAircraft) {
  // ── 1. LIVE ───────────────────────────────────────────────────────────────
  if (liveRecord?.found && liveRecord.lat != null && liveRecord.lon != null) {
    const onGround = Boolean(liveRecord.onGround);
    return {
      status:     TRACK_STATUS.LIVE,
      label:      onGround ? 'ON GROUND' : 'AIRBORNE',
      subLabel:   'Live ADS-B signal',
      confidence: 'HIGH',
      demo:       Boolean(liveRecord.demo),
      lat:        liveRecord.lat,
      lon:        liveRecord.lon,
      baroAlt_ft: liveRecord.baroAlt_ft,
      geoAlt_ft:  liveRecord.geoAlt_ft,
      velocity_kts: liveRecord.velocity_kts,
      heading:    liveRecord.heading,
      callsign:   liveRecord.callsign,
      source:     liveRecord.source || 'ADS-B public network',
      seenAt:     null,
      seenAtUnix: null,
      ageLabel:   null,
    };
  }

  // ── 2. LAST_SEEN ─────────────────────────────────────────────────────────
  const cached = cachedPositions?.[aircraftId];
  if (cached?.lat != null && cached?.lon != null) {
    const ageH = cached.seenAtUnix
      ? Math.floor((Date.now() / 1000 - cached.seenAtUnix) / 3600)
      : null;
    return {
      status:     TRACK_STATUS.LAST_SEEN,
      label:      'LAST SEEN',
      subLabel:   formatTimestamp(cached.seenAtUnix) || 'Previously confirmed',
      confidence: ageH != null && ageH < 24 ? 'MEDIUM' : 'LOW',
      demo:       false,
      lat:        cached.lat,
      lon:        cached.lon,
      baroAlt_ft: cached.baroAlt_ft ?? null,
      geoAlt_ft:  null,
      velocity_kts: cached.velocity_kts ?? null,
      heading:    cached.heading ?? null,
      callsign:   cached.callsign ?? null,
      source:     cached.source || 'ADS-B public network (cached)',
      seenAt:     cached.seenAt || null,
      seenAtUnix: cached.seenAtUnix || null,
      ageLabel:   cached.seenAtUnix ? formatAge(cached.seenAtUnix) : null,
    };
  }

  // ── 3. BASE_VERIFIED ─────────────────────────────────────────────────────
  if (fleetAircraft?.bases?.length) {
    const baseName = fleetAircraft.bases[0];
    const baseInfo = BASE_LOCATIONS[baseName] || null;
    return {
      status:     TRACK_STATUS.BASE_VERIFIED,
      label:      'BASE VERIFIED',
      subLabel:   fleetAircraft.bases.join(' · '),
      confidence: 'VERIFIED',
      demo:       false,
      lat:        baseInfo?.lat ?? null,
      lon:        baseInfo?.lon ?? null,
      baroAlt_ft: null,
      velocity_kts: null,
      heading:    null,
      callsign:   null,
      source:     'Public operator data (ivoryjetservices.com, ch-aviation)',
      seenAt:     null,
      seenAtUnix: null,
      ageLabel:   null,
      bases:      fleetAircraft.bases,
      primaryBase: baseName,
      baseInfo,
    };
  }

  // ── 4. NOT_VISIBLE ───────────────────────────────────────────────────────
  return {
    status:     TRACK_STATUS.NOT_VISIBLE,
    label:      'NOT PUBLICLY VISIBLE',
    subLabel:   'Aircraft not broadcasting on public ADS-B networks',
    confidence: 'N/A',
    demo:       false,
    lat:        null,
    lon:        null,
    source:     null,
    seenAt:     null,
    ageLabel:   null,
  };
}
