import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BASES } from '../data/fleet';
import { TRACK_STATUS } from '../services/flytrack/statusEnrich';

/* ── Dark luxury map ── */
const MAP_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
  },
  layers: [
    { id: 'bg',    type: 'background', paint: { 'background-color': '#000000' } },
    { id: 'tiles', type: 'raster',     source: 'carto-dark', paint: { 'raster-opacity': 0.7 } },
  ],
};

/* ── Aircraft SVGs ── */
const svgAircraft = (heading = 0, size = 24, color = '#c9a84c') => `
  <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
       style="transform:rotate(${heading - 90}deg);display:block;">
    <path d="M16 3L13 11L3 17.5V20L13 16.5V24.5L10 26.5V28.5L16 27L22 28.5V26.5L19 24.5V16.5L29 20V17.5L19 11L16 3Z"
      fill="${color}" />
  </svg>
`;

// Grounded / static marker: use a dot+ring combo
const svgDot = (size = 14, color = '#4a90d9') => `
  <svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <circle cx="10" cy="10" r="5" fill="${color}" />
    <circle cx="10" cy="10" r="8" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
  </svg>
`;

/**
 * marker types:
 *   'live'      — real-time signal (gold, pulsing, aircraft icon)
 *   'last_seen' — cached position (amber, static aircraft icon)
 *   'base'      — base location (blue, dot)
 */
function createAircraftEl(aircraft, live, onClick, markerType = 'live', statusInfo = null) {
  const heading = live?.heading ?? statusInfo?.heading ?? 0;
  const isDemo  = Boolean(live?.demo);

  let color, iconHtml, cls, pulseHtml = '';

  switch (markerType) {
    case 'live': {
      const onGround = Boolean(live?.onGround);
      color = isDemo ? '#f0a030' : '#2ecc94';   // demo amber, live green
      cls = `ac-marker${onGround ? ' ac-marker--ground' : ''}${isDemo ? ' ac-marker--demo' : ''}`;
      if (!onGround) pulseHtml = '<div class="ac-marker__pulse"></div>';
      iconHtml = onGround
        ? svgAircraft(0, 20, '#c9a84c')
        : svgAircraft(heading, 24, color);
      break;
    }
    case 'last_seen':
      color = '#f0a030';   // amber
      cls = 'ac-marker ac-marker--last-seen';
      iconHtml = svgAircraft(heading, 18, color);
      break;
    case 'base':
      color = '#4a90d9';   // blue
      cls = 'ac-marker ac-marker--base';
      iconHtml = svgDot(14, color);
      break;
    default:
      return null;
  }

  const el = document.createElement('div');
  el.className = cls;
  el.setAttribute('title', `${aircraft.registration} — ${statusInfo?.label || aircraft.type}`);

  const labelSuffix = isDemo ? ' · DEMO' : (markerType === 'last_seen' ? ' ◌' : markerType === 'base' ? ' ◎' : '');
  el.innerHTML = `
    ${pulseHtml}
    <div class="ac-marker__ring"></div>
    <div class="ac-marker__icon">${iconHtml}</div>
    <div class="ac-marker__label">${aircraft.registration}${labelSuffix}</div>
  `;

  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(aircraft); });
  return el;
}

/* ── Base marker ── */
function createBaseEl(base) {
  const el = document.createElement('div');
  el.className = 'base-marker';
  el.title = `${base.name} — ${base.airport}`;
  el.innerHTML = `
    <div class="base-marker__dot"></div>
    <div class="base-marker__name">${base.name.toUpperCase()}</div>
  `;
  return el;
}

/* ── Component ── */
export function FleetMap({ fleet, getLive, getStatus, onAircraftClick }) {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);
  const markersRef     = useRef({});
  const baseMarkersRef = useRef({});

  /* Init map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container:          containerRef.current,
      style:              MAP_STYLE,
      center:             [22, 10],
      zoom:               2.8,
      minZoom:            1,
      maxZoom:            14,
      attributionControl: false,
      logoPosition:       'bottom-right',
    });

    const map = mapRef.current;
    map.on('load', () => {
      BASES.forEach((base) => {
        const el     = createBaseEl(base);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(base.coordinates)
          .addTo(map);
        baseMarkersRef.current[base.id] = marker;
      });
    });

    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      Object.values(baseMarkersRef.current).forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* Update aircraft markers when data changes */
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    fleet.forEach((aircraft) => {
      // Remove stale marker
      if (markersRef.current[aircraft.id]) {
        markersRef.current[aircraft.id].remove();
        delete markersRef.current[aircraft.id];
      }

      const live       = getLive(aircraft.icao24);
      const statusInfo = getStatus ? getStatus(aircraft.id) : null;

      let lat = null, lon = null, markerType = null;

      if (live?.lat != null && live?.lon != null) {
        // LIVE: real-time position
        lat = live.lat; lon = live.lon; markerType = 'live';
      } else if (statusInfo?.status === TRACK_STATUS.LAST_SEEN && statusInfo.lat != null) {
        // LAST_SEEN: cached historical position
        lat = statusInfo.lat; lon = statusInfo.lon; markerType = 'last_seen';
      } else if (statusInfo?.status === TRACK_STATUS.BASE_VERIFIED && statusInfo.lat != null) {
        // BASE_VERIFIED: operational base coordinates
        // Only show if no base-marker already overlaps (avoid clutter)
        lat = statusInfo.lat; lon = statusInfo.lon; markerType = 'base';
      }

      if (lat == null || lon == null || !markerType) return;

      const el = createAircraftEl(aircraft, live, onAircraftClick, markerType, statusInfo);
      if (!el) return;

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lon, lat])
        .addTo(map);

      markersRef.current[aircraft.id] = marker;
    });
  }, [fleet, getLive, getStatus, onAircraftClick]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
