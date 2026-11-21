import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { FaceFeatures } from '../faceFeatures';
import { metres, type LatLng, type Place } from '../places';
import Figurine from './Figurines';

/**
 * Real street map: MapLibre GL with OpenFreeMap vector tiles (free, no API
 * key). Restyled on load to match the warm look of the drawn fallback map.
 * Loaded lazily by MiniMap, which falls back to the SVG map if this fails.
 */
// MapLibre locates its worker relative to its own module, which Vite's
// dependency pre-bundling breaks; point it at the real file instead.
maplibregl.setWorkerUrl(workerUrl);

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const PAINT: [layer: string, prop: keyof maplibregl.AllPaintProperties, value: string][] = [
  ['background', 'background-color', '#e8e2d2'],
  ['landuse_residential', 'fill-color', '#e8e2d2'],
  ['park', 'fill-color', '#d3dcbf'],
  ['landcover_wood', 'fill-color', '#d3dcbf'],
  ['water', 'fill-color', '#9ec7e8'],
  ['waterway', 'line-color', '#9ec7e8'],
  ['building', 'fill-color', '#ddd5c1'],
  ['highway_path', 'line-color', '#f4f0e6'],
  ['highway_minor', 'line-color', '#ffffff'],
  ['highway_major_casing', 'line-color', '#d5cfbd'],
  ['highway_major_inner', 'line-color', '#ffffff'],
  ['highway_major_subtle', 'line-color', '#ffffff'],
  ['highway_motorway_casing', 'line-color', '#d5cfbd'],
  ['highway_motorway_inner', 'line-color', '#ffffff'],
  ['highway_motorway_subtle', 'line-color', '#ffffff'],
];

function restyle(map: maplibregl.Map) {
  for (const [layer, prop, value] of PAINT) {
    if (map.getLayer(layer)) map.setPaintProperty(layer, prop, value);
  }
}

/** Thumbnail zoom that keeps the nearest landmark inside ~30px of the centre. */
function thumbZoom(me: LatLng, places: Place[]) {
  const nearest = Math.min(...places.map((p) => metres(me, p)));
  if (!Number.isFinite(nearest) || nearest < 1) return 15;
  const z = Math.log2((78_271.5 * Math.cos((me.lat * Math.PI) / 180) * 30) / nearest);
  return Math.min(15, Math.max(11, z));
}

const routeData = (route: LatLng[]): GeoJSON.Feature => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: route.map((p) => [p.lng, p.lat]) },
});

interface Props {
  places: Place[];
  focusId: string | null;
  me: LatLng;
  route: LatLng[];
  heading: number;
  /** Full-screen interactive map with labels, vs. the small thumbnail. */
  labels: boolean;
  face: string | null;
  faceFeatures: FaceFeatures | null;
  onPick?: (id: string) => void;
  /** Called if the map cannot start (no WebGL, style unreachable, timeout). */
  onFail: () => void;
}

export default function LiveMap({ places, focusId, me, route, heading, labels, face, faceFeatures, onPick, onFail }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const [meEl] = useState(() => document.createElement('div'));
  const [pinEls, setPinEls] = useState<Record<string, HTMLDivElement>>({});
  const [ready, setReady] = useState(false);
  const latest = useRef({ onFail, onPick, route });
  latest.current = { onFail, onPick, route };

  const focus = places.find((p) => p.id === focusId) ?? me;
  const zoom = labels ? 15 : thumbZoom(me, places);

  // Create the map once.
  useEffect(() => {
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: box.current!,
        style: STYLE_URL,
        center: [focus.lng, focus.lat],
        zoom,
        interactive: labels,
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: labels ? { compact: true } : false,
      });
    } catch {
      latest.current.onFail();
      return;
    }
    let styled = false;
    const timer = setTimeout(() => !styled && latest.current.onFail(), 8000);
    map.on('style.load', () => {
      styled = true;
      clearTimeout(timer);
      restyle(map);
      // Street and place names are unreadable at thumbnail size; drop them there.
      if (!labels) {
        for (const l of map.getStyle().layers) if (l.type === 'symbol') map.setLayoutProperty(l.id, 'visibility', 'none');
      }
      const accent = getComputedStyle(box.current!).getPropertyValue('--accent').trim() || '#e5484d';
      map.addSource('route', { type: 'geojson', data: routeData(latest.current.route) });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': accent, 'line-width': labels ? 4 : 3, 'line-dasharray': [0.5, 2] },
      });
      setReady(true);
    });
    // Only a failure to get the style counts; stray tile errors later are harmless.
    map.on('error', () => !styled && latest.current.onFail());
    meMarker.current = new maplibregl.Marker({ element: meEl }).setLngLat([me.lng, me.lat]).addTo(map);
    mapRef.current = map;
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    meMarker.current?.setLngLat([me.lng, me.lat]);
  }, [me.lat, me.lng]);

  // Follow the focused landmark, or "you" when nothing is focused.
  useEffect(() => {
    mapRef.current?.easeTo({ center: [focus.lng, focus.lat], ...(labels ? {} : { zoom }), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.lat, focus.lng, labels ? 0 : zoom]);

  // One HTML marker per place; their contents are rendered below via portals.
  const placesKey = places.map((p) => `${p.id}@${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const els: Record<string, HTMLDivElement> = {};
    const markers = places.map((p) => {
      const el = document.createElement('div');
      els[p.id] = el;
      if (labels) el.addEventListener('click', () => latest.current.onPick?.(p.id));
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map);
    });
    setPinEls(els);
    return () => markers.forEach((m) => m.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesKey, labels]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource('route') as maplibregl.GeoJSONSource | undefined)?.setData(routeData(route));
  }, [ready, route]);

  const order = (p: Place) => route.findIndex((r) => r.lat === p.lat && r.lng === p.lng) + 1;
  const pinW = labels ? 28 : 14;

  return (
    <div ref={box} className={`map-art live-map ${labels ? 'live-map--full' : ''}`} aria-hidden={!labels}>
      {places.map((p) => {
        const el = pinEls[p.id];
        if (!el) return null;
        const n = order(p);
        return createPortal(
          <div className={`lm-pin m-pin ${p.id === focusId ? 'is-focus' : ''}`}>
            {labels && <span className="lm-pin__label">{p.name}</span>}
            <svg width={pinW} height={pinW * 1.4} viewBox="-5 -6 10 14">
              <path d="M0 8 L-3.4 1.5 A 4.4 4.4 0 1 1 3.4 1.5 Z" className="m-pin__drop" />
              {labels && n > 0 ? (
                <text y="-1.3" dy="0.35em" className="m-pin__n">{n}</text>
              ) : (
                <circle cy="-1.4" r="1.5" className="m-pin__hole" />
              )}
            </svg>
          </div>,
          el,
          p.id,
        );
      })}
      {createPortal(
        <div className="lm-me">
          <svg width={labels ? 120 : 56} height={labels ? 120 : 56} viewBox="-80 -80 160 160" className="m-me">
            <g transform={`rotate(${heading})`}>
              <polygon points="0,-80 20,-6 0,-18 -20,-6" className="m-me__wedge" />
            </g>
            <circle r={18} className="m-me__halo" />
            <circle r={15} className="m-me__dot" />
          </svg>
          {labels && (
            <span className="lm-me__fig">
              <Figurine id="generic" faceImage={face} features={faceFeatures} size={52} />
            </span>
          )}
        </div>,
        meEl,
      )}
    </div>
  );
}
