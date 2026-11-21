import { useState } from 'react';

import type { Language } from '../api';
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

const PLACES = [
  { id: 'st-pauls', name: "St Paul's Cathedral", lat: 51.5138, lng: -0.0984 },
  { id: 'leadenhall-market', name: 'Leadenhall Market', lat: 51.5128, lng: -0.0834 },
  { id: 'dragon-boundary', name: 'Dragon boundary marker', lat: 51.5113, lng: -0.1112 },
].map((p) => ({ ...p, ...project(p.lat, p.lng) }));

/** Mock "you are here": outside Bank station. */
const ME = { lat: 51.5133, lng: -0.089, ...project(51.5133, -0.089) };

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

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = (b.lat - a.lat) * 111_320;
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};
const fmt = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

function MapArt({ focusId, span, labels }: { focusId: string | null; span: number; labels: boolean }) {
  const focus = PLACES.find((p) => p.id === focusId) ?? ME;
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
        {PLACES.map((p) => (
          <g key={p.id} className={`m-pin ${p.id === focusId ? 'is-focus' : ''}`} transform={`translate(${p.x} ${p.y})`}>
            <circle r={labels ? 11 : 16} />
            {labels && <text y={-20} className="m-label m-label--pin">{p.name}</text>}
          </g>
        ))}
        <g className="m-me" transform={`translate(${ME.x} ${ME.y})`}>
          <circle r={labels ? 22 : 30} className="m-me__halo" />
          <circle r={labels ? 9 : 13} className="m-me__dot" />
        </g>
      </g>
    </svg>
  );
}

interface Props {
  language: Language;
  /** Landmark the current answer is about; its pin is highlighted. */
  focusId: string | null;
}

export default function MiniMap({ language, focusId }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const es = language === 'es';
  const sorted = [...PLACES].sort((a, b) => metres(ME, a) - metres(ME, b));
  const selected = picked ?? focusId;

  return (
    <>
      <button className="minimap" onClick={() => setOpen(true)} aria-label={es ? 'Abrir mapa' : 'Open map'}>
        <MapArt focusId={focusId} span={320} labels={false} />
      </button>

      {open && (
        <div className="map-sheet">
          <MapArt focusId={selected} span={560} labels />
          <button className="map-close icon-btn" onClick={() => setOpen(false)} aria-label={es ? 'Cerrar' : 'Close'}>
            <Icon name="close" />
          </button>
          <div className="map-list">
            <h2>{es ? 'Cerca' : 'Nearby'}</h2>
            {sorted.map((p) => (
              <button key={p.id} className={`map-row ${p.id === selected ? 'is-on' : ''}`} onClick={() => setPicked(p.id)}>
                <span className="map-row__dot" />
                <span className="map-row__name">{p.name}</span>
                <span className="map-row__dist">{fmt(metres(ME, p))}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
