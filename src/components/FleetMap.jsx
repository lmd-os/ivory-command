import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BASES } from '../data/fleet';

/* ── Dark luxury map style (CARTO dark no-labels, free with attribution) ── */
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
    {
      id: 'bg',
      type: 'background',
      paint: { 'background-color': '#000000' },
    },
    {
      id: 'tiles',
      type: 'raster',
      source: 'carto-dark',
      paint: { 'raster-opacity': 0.65 },
    },
  ],
};

/* ── Aircraft top-view SVG ── */
const aircraftSVG = (color = '#c9a84c', size = 22) => `
  <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L13 11L3 17.5V20L13 16.5V24.5L10 26.5V28.5L16 27L22 28.5V26.5L19 24.5V16.5L29 20V17.5L19 11L16 3Z"
      fill="${color}" />
  </svg>
`;

const groundAircraftSVG = (size = 18) => `
  <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L13 11L3 17.5V20L13 16.5V24.5L10 26.5V28.5L16 27L22 28.5V26.5L19 24.5V16.5L29 20V17.5L19 11L16 3Z"
      fill="#5a5a5a" />
  </svg>
`;

function createAircraftElement(aircraft, liveData, onClick) {
  const onGround = liveData?.onGround;
  const heading  = liveData?.heading ?? 0;
  const hasLive  = liveData && liveData.longitude != null;

  const el = document.createElement('div');
  el.className = `ac-marker${onGround ? ' ac-marker--ground' : ''}`;
  el.setAttribute('title', `${aircraft.registration} — ${aircraft.type}`);

  el.innerHTML = `
    <div class="ac-marker__ring"></div>
    ${!onGround ? '<div class="ac-marker__pulse"></div>' : ''}
    <div class="ac-marker__icon" style="transform: rotate(${heading - 90}deg)">
      ${onGround ? groundAircraftSVG() : aircraftSVG()}
    </div>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick(aircraft);
  });

  return el;
}

function createBaseElement(base) {
  const el = document.createElement('div');
  el.className = 'base-marker';
  el.title = `${base.name} — ${base.airport}`;
  el.innerHTML = `<div class="base-marker__dot"></div>`;
  return el;
}

export function FleetMap({ fleet, getLive, onAircraftClick }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef({});
  const baseMarkersRef = useRef({});

  /* ── Initialize map once ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [22, 10],
      zoom: 2.8,
      minZoom: 1,
      maxZoom: 14,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });

    const map = mapRef.current;

    /* Add base markers after map loads */
    map.on('load', () => {
      BASES.forEach((base) => {
        const el     = createBaseElement(base);
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

  /* ── Update aircraft markers when live data changes ── */
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    fleet.forEach((aircraft) => {
      const live = getLive(aircraft.icao24);

      /* Remove stale marker */
      if (markersRef.current[aircraft.id]) {
        markersRef.current[aircraft.id].remove();
        delete markersRef.current[aircraft.id];
      }

      if (!live || live.longitude == null || live.latitude == null) return;

      const el     = createAircraftElement(aircraft, live, onAircraftClick);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([live.longitude, live.latitude])
        .addTo(map);

      markersRef.current[aircraft.id] = marker;
    });
  }, [fleet, getLive, onAircraftClick]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
