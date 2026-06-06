import { useState, useEffect, useCallback, useRef } from 'react';
import { FLEET } from '../data/fleet';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const POLL_MS = 60_000;

const metersToFeet = (m) => (m == null ? null : Math.round(m * 3.28084));
const msToKnots = (ms) => (ms == null ? null : Math.round(ms * 1.94384));
const msToFpm = (ms) => (ms == null ? null : Math.round(ms * 196.85));

const parseState = (state) => {
  if (!state) return null;
  return {
    icao24:         state[0]?.toLowerCase(),
    callsign:       state[1]?.trim() || null,
    originCountry:  state[2],
    timePosition:   state[3],
    lastContact:    state[4],
    longitude:      state[5],
    latitude:       state[6],
    baroAlt_ft:     metersToFeet(state[7]),
    onGround:       state[8],
    velocity_kts:   msToKnots(state[9]),
    heading:        state[10] != null ? Math.round(state[10]) : null,
    vertRate_fpm:   msToFpm(state[11]),
    geoAlt_ft:      metersToFeet(state[13]),
    squawk:         state[14],
    positionSource: state[16],
  };
};

export const useOpenSky = () => {
  const [data, setData]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortRef = useRef(null);

  const fetchData = useCallback(async () => {
    const icao24s = FLEET.map((a) => a.icao24).filter(Boolean);
    if (!icao24s.length) { setLoading(false); return; }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const url = `${OPENSKY_URL}?icao24=${icao24s.join(',')}`;
      const res = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);

      const json = await res.json();
      const parsed = {};

      (json.states || []).forEach((state) => {
        const s = parseState(state);
        if (s?.icao24) parsed[s.icao24] = s;
      });

      setData(parsed);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Live data temporarily unavailable');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const getLive = (icao24) => (icao24 ? (data[icao24.toLowerCase()] ?? null) : null);

  const airborneCount = Object.values(data).filter((s) => !s.onGround).length;
  const groundCount   = Object.values(data).filter((s) => s.onGround).length;

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchData,
    getLive,
    airborneCount,
    groundCount,
  };
};
