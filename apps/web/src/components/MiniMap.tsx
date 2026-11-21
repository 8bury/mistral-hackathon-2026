import { useEffect, useState, type ComponentType } from 'react';

import type { Stop } from '../walk';

import type { Language, UserLocation } from '../api';
import type { FaceFeatures } from '../faceFeatures';
import { BANK, fmtDistance as fmt, metres, placesNear, type LatLng, type Place } from '../places';
import Figurine from './Figurines';
import Icon from './Icon';

/**
 * Offline fallback map: a hand-drawn SVG of the City, used when the live
 * MapLibre map (LiveMap) cannot load. Coordinates are approximate.
 */
const BOUNDS = { west: -0.116, east: -0.076, north: 51.518, south: 51.506 };
const W = 1000;
const H = 482; // keeps the ratio right at this latitude

const project = (lat: number, lng: number) => ({
  x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
  y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
});

/** Whether a position falls on (or near) the drawn area. */
const onDrawnMap = (l: LatLng) => {
  const { x, y } = project(l.lat, l.lng);
  return x > -W * 0.25 && x < W * 1.25 && y > -H * 0.25 && y < H * 1.25;
};

/** Visited places in walk order, without consecutive repeats. */
function routeOf(stops: Stop[], places: Place[]): Place[] {
  const out: Place[] = [];
  for (const s of stops) {
    const p = places.find((pl) => pl.id === s.landmarkId);
    if (p && out.at(-1)?.id !== p.id) out.push(p);
  }
  return out;
}

const ROADS_MAJOR = [
  'M0,240 L300,215 L420,182 L560,232 L760,262 L1000,300', // Fleet St, Ludgate Hill, Cannon St
  'M440,165 L600,176 L675,189 L820,201 L1000,215', // Cheapside, Cornhill, Leadenhall St
  'M0,140 L300,130 L420,148', // Holborn, Newgate St
  'M0,278 C150,288 300,342 430,362 L560,372', // Victoria Embankment, Upper Thames St
];
const ROADS_MINOR = [
  'M420,205 L675,189', // Queen Victoria St
  'M790,0 L805,201', // Bishopsgate
  'M650,0 L675,189', // Moorgate
  'M675,189 L720,340', // King William St
  'M300,0 L300,372', // Farringdon St, New Bridge St
  'M520,0 L540,176', // Aldersgate
  'M860,201 L900,330', // Lime St
  'M120,240 L130,300', // Temple
];

interface MapProps {
  places: Place[];
  focusId: string | null;
  labels: boolean;
  me: LatLng;
  route: Place[];
  heading: number;
  face: string | null;
  faceFeatures: FaceFeatures | null;
  onPick?: (id: string) => void;
}

function MapArt({ places, focusId, labels, me, route, heading, face, faceFeatures }: MapProps) {
  const span = labels ? 560 : 320;
  const PLACES = places.map((p) => ({ ...p, ...project(p.lat, p.lng) }));
  // A visitor far outside the drawn City is shown at the demo spot instead.
  const here = onDrawnMap(me) ? me : BANK;
  const ME = { ...here, ...project(here.lat, here.lng) };
  const focus = PLACES.find((p) => p.id === focusId) ?? ME;
  const order = (id: string) => route.findIndex((p) => p.id === id) + 1;
  return (
    <svg className="map-art" viewBox={`0 0 ${span} ${span}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="map-art__pan" style={{ transform: `translate(${span / 2 - focus.x}px, ${span / 2 - focus.y}px)` }}>
        <rect x={-2000} y={-2000} width={W + 4000} height={H + 4000} className="m-land" />
        <rect x={395} y={150} width={70} height={45} rx={8} className="m-park" />
        <rect x={470} y={60} width={60} height={50} rx={8} className="m-park" />
        <path d="M-200,300 C120,302 250,368 400,392 S700,402 1200,430 L1200,700 L-200,700 Z" className="m-water" />
        {ROADS_MINOR.map((d) => <path key={d} d={d} className="m-road m-road--minor" />)}
        {ROADS_MAJOR.map((d) => <path key={d} d={d} className="m-road" />)}
        {labels && (
          <>
            <text x={560} y={455} className="m-label m-label--water">River Thames</text>
            <text x={180} y={222} className="m-label" transform="rotate(-5 180 222)">Fleet St</text>
            <text x={560} y={166} className="m-label">Cheapside</text>
          </>
        )}
        {route.length > 1 && (
          <polyline className="m-route" points={route.map((p) => project(p.lat, p.lng)).map((p) => `${p.x},${p.y}`).join(' ')} style={{ strokeWidth: labels ? 6 : 9 }} />
        )}
        {PLACES.map((p) => {
          const n = order(p.id);
          return (
            <g key={p.id} className={`m-pin ${p.id === focusId ? 'is-focus' : ''} ${n ? 'is-visited' : ''}`} transform={`translate(${p.x} ${p.y})`}>
              <g transform={`scale(${labels ? 2.6 : 3.8}) translate(0 -8)`}>
                <path d="M0 8 L-3.4 1.5 A 4.4 4.4 0 1 1 3.4 1.5 Z" className="m-pin__drop" />
                {labels && n > 0 ? (
                  <text y="1.6" dy="0.35em" className="m-pin__n">{n}</text>
                ) : (
                  <circle cy="1.6" r="1.5" className="m-pin__hole" />
                )}
              </g>
              {labels && <text y={-34} className="m-label m-label--pin">{p.name}</text>}
            </g>
          );
        })}
        <g className="m-me" transform={`translate(${ME.x} ${ME.y})`}>
          <g transform={`rotate(${heading})`}>
            <polygon points={labels ? '0,-62 16,-6 0,-16 -16,-6' : '0,-80 20,-6 0,-18 -20,-6'} className="m-me__wedge" />
          </g>
          <circle r={labels ? 14 : 18} className="m-me__halo" />
          <circle r={labels ? 11 : 15} className="m-me__dot" />
          {labels && (
            <g transform="translate(-26 -66)">
              <Figurine id="generic" faceImage={face} features={faceFeatures} size={52} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

interface Props {
  language: Language;
  /** Landmark the current answer is about; its pin is highlighted. */
  focusId: string | null;
  stops: Stop[];
  onRecap: () => Promise<string>;
  heading: number;
  face: string | null;
  /** Analyzed face-scan features for the personalized "You" figurine. */
  faceFeatures: FaceFeatures | null;
  /** Live GPS fix; "you are here" on the map, anywhere in the world. */
  location: UserLocation | null;
}

type LiveMapComponent = ComponentType<MapProps & { onFail: () => void }>;
let liveMapLoad: Promise<LiveMapComponent> | null = null;
const loadLiveMap = () => (liveMapLoad ??= import('./LiveMap').then((m) => m.default));

/** The live street map, or the drawn map while it loads, offline, or if it fails. */
function MapView(props: MapProps) {
  const [Live, setLive] = useState<LiveMapComponent | null>(null);
  const [failed, setFailed] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    if (failed) return;
    let alive = true;
    loadLiveMap().then(
      (C) => alive && setLive(() => C),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [failed]);
  if (failed || !Live) return <MapArt {...props} />;
  return <Live {...props} onFail={() => setFailed(true)} />;
}

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MiniMap({ language, focusId, stops, onRecap, heading, face, faceFeatures, location }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'nearby' | 'walk'>('nearby');
  const [picked, setPicked] = useState<string | null>(null);
  const [recapText, setRecapText] = useState<string | null>(null);
  const [recapBusy, setRecapBusy] = useState(false);
  const es = language === 'es';

  // Real GPS wherever the visitor is; without a fix, beside the latest stop or at the demo spot.
  const lastStop = [...stops].reverse().find((s) => s.landmarkId);
  const anchor: LatLng = location ?? BANK;
  const places = placesNear(anchor);
  const lastPlace = places.find((p) => p.id === lastStop?.landmarkId);
  const me: LatLng = location
    ? { lat: location.lat, lng: location.lng }
    : lastPlace
      ? { lat: lastPlace.lat - 0.0002, lng: lastPlace.lng + 0.0002 }
      : BANK;
  const route = routeOf(stops, places);
  const sorted = [...places].sort((a, b) => metres(me, a) - metres(me, b));
  const selected = picked ?? focusId;
  const nameOf = (id: string | null) => places.find((p) => p.id === id)?.name ?? (es ? 'Sin lugar' : 'Unplaced');
  const mapProps = { places, me, route, heading, face, faceFeatures };

  const doRecap = async () => {
    setRecapBusy(true);
    try {
      setRecapText(await onRecap());
    } catch (e) {
      setRecapText(e instanceof Error ? e.message : 'Recap failed');
    } finally {
      setRecapBusy(false);
    }
  };

  return (
    <>
      <button className="minimap" onClick={() => setOpen(true)} aria-label={es ? 'Abrir mapa' : 'Open map'}>
        <MapView {...mapProps} focusId={focusId} labels={false} />
        {stops.length > 0 && <span className="minimap__count">{stops.length}</span>}
      </button>

      {open && (
        <div className="map-sheet">
          <MapView {...mapProps} focusId={selected} labels onPick={(id) => { setPicked(id); setTab('nearby'); }} />
          <div className="map-top">
            <div className="seg" role="tablist">
              <button role="tab" aria-selected={tab === 'nearby'} className={tab === 'nearby' ? 'is-on' : ''} onClick={() => setTab('nearby')}>
                {es ? 'Cerca' : 'Nearby'}
              </button>
              <button role="tab" aria-selected={tab === 'walk'} className={tab === 'walk' ? 'is-on' : ''} onClick={() => setTab('walk')}>
                {es ? 'Tu paseo' : 'Your walk'}
                {stops.length > 0 && <span className="seg__n">{stops.length}</span>}
              </button>
            </div>
            <button className="icon-btn map-close" onClick={() => setOpen(false)} aria-label={es ? 'Cerrar' : 'Close'}>
              <Icon name="close" />
            </button>
          </div>

          <div className="map-list">
            {!location && (
              <p className="map-note">
                {es
                  ? 'Sin acceso a tu ubicación: el mapa muestra una posición de demostración en la City de Londres.'
                  : "Location is off, so the map shows a demo position in the City of London."}
              </p>
            )}
            {tab === 'nearby' &&
              sorted.map((p) => (
                <button key={p.id} className={`map-row ${p.id === selected ? 'is-on' : ''}`} onClick={() => setPicked(p.id)}>
                  <span className="map-row__dot" />
                  <span className="map-row__name">{p.name}</span>
                  <span className="map-row__dist">{fmt(metres(me, p))}</span>
                </button>
              ))}

            {tab === 'walk' && stops.length === 0 && (
              <p className="walk-empty">
                {es ? 'Aún no hay paradas. Pregunta por algo para empezar tu paseo.' : 'No stops yet. Ask about something to start your walk.'}
              </p>
            )}

            {tab === 'walk' && stops.length > 0 && (
              <>
                <ol className="walk">
                  {stops.map((s) => (
                    <li key={s.id}>
                      <button className={`walk-row ${s.landmarkId === selected ? 'is-on' : ''}`} onClick={() => setPicked(s.landmarkId)}>
                        <img src={s.thumb} alt="" />
                        <span className="walk-row__body">
                          <span className="walk-row__name">{nameOf(s.landmarkId)}</span>
                          <span className="walk-row__q">{s.question}</span>
                        </span>
                        <span className="walk-row__time">{clock(s.time)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                {recapText ? (
                  <p className="recap">{recapText}</p>
                ) : (
                  <button className="primary" onClick={() => void doRecap()} disabled={recapBusy}>
                    {recapBusy ? (es ? 'Preparando…' : 'Writing recap…') : es ? 'Resumen del paseo' : 'Recap my walk'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
