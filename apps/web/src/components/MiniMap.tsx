import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import type { Language } from '../api';
import Icon from './Icon';

/**
 * Prototype-only coordinates. data/landmarks.json has no locations yet;
 * once it does, read them from there instead.
 */
const PLACES = [
  { id: 'st-pauls', name: "St Paul's Cathedral", lat: 51.5138, lng: -0.0984 },
  { id: 'leadenhall-market', name: 'Leadenhall Market', lat: 51.5128, lng: -0.0834 },
  { id: 'dragon-boundary', name: 'Dragon boundary marker', lat: 51.5113, lng: -0.1112 },
];
const CITY_CENTRE: [number, number] = [51.5134, -0.0955];

type LatLng = { lat: number; lng: number };

function useLocation(): LatLng | null {
  const [pos, setPos] = useState<LatLng | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return pos;
}

const metres = (a: LatLng, b: LatLng) => {
  const r = 6371e3;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
};
const fmt = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const TILES = `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;

function LeafletMap({ me, focusId, interactive }: { me: LatLng | null; focusId: string | null; interactive: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>();
  const meMarker = useRef<L.Marker>();
  const pins = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    const m = L.map(el.current!, {
      center: CITY_CENTRE,
      zoom: interactive ? 15 : 14,
      zoomControl: false,
      attributionControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      keyboard: interactive,
    });
    L.tileLayer(TILES, { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }).addTo(m);
    for (const p of PLACES) {
      pins.current[p.id] = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [18, 18] }),
        interactive: false,
      }).addTo(m);
    }
    map.current = m;
    return () => {
      m.remove();
      meMarker.current = undefined;
      pins.current = {};
    };
  }, [interactive]);

  useEffect(() => {
    for (const [id, mk] of Object.entries(pins.current)) {
      mk.getElement()?.classList.toggle('is-focus', id === focusId);
    }
    const target = PLACES.find((p) => p.id === focusId);
    if (target) map.current?.flyTo([target.lat, target.lng], interactive ? 16 : 15, { duration: 0.6 });
  }, [focusId, interactive]);

  useEffect(() => {
    if (!me || !map.current) return;
    if (!meMarker.current) {
      meMarker.current = L.marker([me.lat, me.lng], {
        icon: L.divIcon({ className: 'me', html: '<span></span>', iconSize: [16, 16] }),
        interactive: false,
      }).addTo(map.current);
      if (!focusId) map.current.setView([me.lat, me.lng]);
    } else {
      meMarker.current.setLatLng([me.lat, me.lng]);
    }
  }, [me, focusId]);

  return <div ref={el} className="leaflet-host" />;
}

interface Props {
  language: Language;
  /** Landmark the current answer is about; its pin is highlighted. */
  focusId: string | null;
}

export default function MiniMap({ language, focusId }: Props) {
  const me = useLocation();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const es = language === 'es';

  const sorted = me ? [...PLACES].sort((a, b) => metres(me, a) - metres(me, b)) : PLACES;

  return (
    <>
      <button className="minimap" onClick={() => setOpen(true)} aria-label={es ? 'Abrir mapa' : 'Open map'}>
        <LeafletMap me={me} focusId={focusId} interactive={false} />
      </button>

      {open && (
        <div className="map-sheet">
          <LeafletMap me={me} focusId={picked ?? focusId} interactive />
          <button className="map-close icon-btn" onClick={() => setOpen(false)} aria-label={es ? 'Cerrar' : 'Close'}>
            <Icon name="close" />
          </button>
          <div className="map-list">
            <h2>{es ? 'Cerca' : 'Nearby'}</h2>
            {sorted.map((p) => (
              <button
                key={p.id}
                className={`map-row ${p.id === (picked ?? focusId) ? 'is-on' : ''}`}
                onClick={() => setPicked(p.id)}
              >
                <span className="map-row__dot" />
                <span className="map-row__name">{p.name}</span>
                {me && <span className="map-row__dist">{fmt(metres(me, p))}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
