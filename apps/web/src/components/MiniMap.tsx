import { useState } from 'react';

import type { Stop } from '../walk';

import type { Language, UserLocation } from '../api';
import type { FaceFeatures } from '../faceFeatures';
import Compass from './Compass';
import Figurine from './Figurines';
import Icon from './Icon';

/**
 * Mock map: a hand-drawn SVG of the City, offline and deterministic for the
 * demo. Coordinates are approximate; data/landmarks.json has no locations yet.
 */
const BOUNDS = { west: -0.116, east: -0.076, north: 51.518, south: 51.506 };
const W = 1000;
const H = 482; // keeps the ratio right at this latitude

const project = (lat: number, lng: number) => ({
  x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
  y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
});

export const PLACES = [
  { id: 'st-pauls', name: "St Paul's Cathedral", lat: 51.5138, lng: -0.0984 },
  { id: 'leadenhall-market', name: 'Leadenhall Market', lat: 51.5128, lng: -0.0834 },
  { id: 'dragon-boundary', name: 'Dragon boundary marker', lat: 51.5113, lng: -0.1112 },
].map((p) => ({ ...p, ...project(p.lat, p.lng) }));

export type Place = (typeof PLACES)[number];
export type Me = { lat: number; lng: number; x: number; y: number };

/** Mock "you are here": outside Bank station, then beside your latest stop. */
const BANK: Me = { lat: 51.5133, lng: -0.089, ...project(51.5133, -0.089) };

/** Visited places in walk order, without consecutive repeats. */
export function routeOf(stops: Stop[]): Place[] {
  const out: Place[] = [];
  for (const s of stops) {
    const p = PLACES.find((pl) => pl.id === s.landmarkId);
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

export const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = (b.lat - a.lat) * 111_320;
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};
export const fmt = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

export function MapArt({ focusId, span, labels, me, route, heading, face, faceFeatures }: { focusId: string | null; span: number; labels: boolean; me: Me; route: Place[]; heading: number; face: string | null; faceFeatures: FaceFeatures | null }) {
  const ME = me;
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
          <polyline className="m-route" points={route.map((p) => `${p.x},${p.y}`).join(' ')} style={{ strokeWidth: labels ? 6 : 9 }} />
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


/** Real GPS is used for "you are here" only within this margin of the map. */
const onMap = (l: UserLocation) => {
  const { x, y } = project(l.lat, l.lng);
  return x > -W * 0.25 && x < W * 1.25 && y > -H * 0.25 && y < H * 1.25;
};

/** Where to draw "you": real GPS inside the City, else beside the latest stop, else Bank. */
export function whereAmI(stops: Stop[], location: UserLocation | null): { me: Me; farAway: number | null } {
  const last = routeOf(stops).at(-1);
  const gps = location && onMap(location) ? location : null;
  const me: Me = gps
    ? { lat: gps.lat, lng: gps.lng, ...project(gps.lat, gps.lng) }
    : last
      ? { lat: last.lat, lng: last.lng, x: last.x + 18, y: last.y + 22 }
      : BANK;
  // Outside the City: say how far away the visitor is instead of faking it silently.
  return { me, farAway: location && !gps ? metres(location, BANK) : null };
}

export const placeName = (id: string | null, es: boolean) =>
  PLACES.find((p) => p.id === id)?.name ?? (es ? 'Sin lugar' : 'Unplaced');

export const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

interface Props {
  language: Language;
  /** Landmark the current answer is about; its pin is highlighted. */
  focusId: string | null;
  stops: Stop[];
  heading: number;
  face: string | null;
  /** Analyzed face-scan features for the personalized "You" figurine. */
  faceFeatures: FaceFeatures | null;
  /** Live GPS fix; drawn on the map when it falls inside the mapped area. */
  location: UserLocation | null;
  /** The map sheet is controlled by the app (mode row + widget both open it). */
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Open the walk recap page. */
  onRecap: () => void;
  needsPermission: boolean;
  onEnableCompass: () => void;
}

/** Top-right "nearest landmark" widget on the camera, plus the full map sheet. */
export default function MiniMap(props: Props) {
  const { language, focusId, stops, heading, face, faceFeatures, location, open } = props;
  const [tab, setTab] = useState<'nearby' | 'walk'>('nearby');
  const [picked, setPicked] = useState<string | null>(null);
  const es = language === 'es';

  const route = routeOf(stops);
  const { me, farAway } = whereAmI(stops, location);
  const sorted = [...PLACES].sort((a, b) => metres(me, a) - metres(me, b));
  const nearest = sorted[0];
  const selected = picked ?? focusId;
  const dist = (m: number) => (m < 25 ? (es ? 'Aquí' : 'Here') : fmt(m));
  // Arrow points from you to the nearest place, relative to where the phone faces.
  const bearing = (Math.atan2(nearest.x - me.x, me.y - nearest.y) * 180) / Math.PI;

  return (
    <>
      <button className="place-widget" onClick={props.onOpen} aria-label={es ? 'Abrir mapa' : 'Open map'}>
        <span className="place-widget__dir">
          {/* Without a real position or compass the arrow would point nowhere useful. */}
          {farAway == null && !props.needsPermission ? (
            <span style={{ transform: `rotate(${bearing - heading}deg)` }}><Icon name="arrow" size={14} /></span>
          ) : (
            <Icon name="map" size={14} />
          )}
        </span>
        <span className="place-widget__text">
          <span className="place-widget__name">{nearest.name}</span>
          <span className="place-widget__dist">
            {farAway == null ? dist(metres(me, nearest)) : es ? 'Posición demo' : 'Demo position'}
          </span>
        </span>
        {stops.length > 0 && <span className="place-widget__count">{stops.length}</span>}
      </button>

      {open && (
        <div className="map-sheet">
          <MapArt focusId={selected} span={560} labels me={me} route={route} heading={heading} face={face} faceFeatures={faceFeatures} />
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
            <Compass heading={heading} needsPermission={props.needsPermission} onEnable={props.onEnableCompass} />
            <button className="icon-btn map-close" onClick={props.onClose} aria-label={es ? 'Cerrar' : 'Close'}>
              <Icon name="close" />
            </button>
          </div>

          <div className="map-list">
            {farAway != null && (
              <p className="map-note">
                {es
                  ? `Estás a ${fmt(farAway)} de la City de Londres: el mapa muestra una posición de demostración.`
                  : `You're ${fmt(farAway)} from the City of London, so the map shows a demo position.`}
              </p>
            )}
            {tab === 'nearby' &&
              sorted.map((p) => (
                <button key={p.id} className={`map-row ${p.id === selected ? 'is-on' : ''}`} onClick={() => setPicked(p.id)}>
                  <span className="map-row__dot" />
                  <span className="map-row__name">{p.name}</span>
                  <span className="map-row__dist">{dist(metres(me, p))}</span>
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
                          <span className="walk-row__name">{placeName(s.landmarkId, es)}</span>
                          <span className="walk-row__q">{s.question}</span>
                        </span>
                        <span className="walk-row__time">{clock(s.time)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <button className="primary" onClick={props.onRecap}>
                  {es ? 'Ver resumen del paseo' : 'See walk recap'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
