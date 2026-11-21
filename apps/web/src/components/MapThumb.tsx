export type HotspotKind = 'tourist' | 'guide' | 'custom';

export interface Hotspot {
  id: string;
  /** Normalized 0..1 position inside the map square. */
  x: number;
  y: number;
  kind: HotspotKind;
  label: string;
}

interface Props {
  heading: number;
  hotspots?: Hotspot[];
  /** id of the currently selected hotspot (emboldened on the map). */
  selectedId?: string | null;
  /** Tap on a hotspot -> select it (receives viewport coords for the ripple). */
  onSelect?: (h: Hotspot, x: number, y: number) => void;
  /** Tap on empty map -> just a ripple. */
  onTap?: (x: number, y: number) => void;
}

const PULSE = `
@keyframes vysta-map-pulse {
  0%   { r: 4; opacity: 0.9; }
  100% { r: 12; opacity: 0; }
}
.vysta-map-pulse { animation: vysta-map-pulse 1.8s ease-out infinite; }
@keyframes vysta-map-selected {
  0%, 100% { stroke-width: 2; opacity: 0.95; }
  50%      { stroke-width: 3.5; opacity: 0.55; }
}
.vysta-map-selected { animation: vysta-map-selected 1.4s ease-in-out infinite; }
`;

interface MarkerProps {
  h: Hotspot;
  selected: boolean;
  onSelect?: (h: Hotspot, x: number, y: number) => void;
}

/** Tap handler shared by all markers: stop the map-level ripple, report the tap. */
function markerTap(h: Hotspot, e: React.PointerEvent<SVGGElement>, onSelect?: Props['onSelect']) {
  e.stopPropagation();
  const r = e.currentTarget.getBoundingClientRect();
  onSelect?.(h, r.left + r.width / 2, r.top + r.height / 2);
}

function SelectedRing() {
  return (
    <circle
      className="vysta-map-selected"
      r="9.5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.5"
      style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.9))' }}
    />
  );
}

function TouristPin({ h, selected, onSelect }: MarkerProps) {
  return (
    <g
      transform={`translate(${h.x * 92} ${h.y * 92})`}
      onPointerDown={(e) => markerTap(h, e, onSelect)}
      style={{ cursor: 'pointer' }}
    >
      <title>{h.label} — tap to select</title>
      {selected && <SelectedRing />}
      <path d="M0 8 L-3.4 1.5 A 4.4 4.4 0 1 1 3.4 1.5 Z" fill="#e63946" stroke="#fff" strokeWidth="1.1" />
      <circle cy="1.6" r="1.5" fill="#fff" />
    </g>
  );
}

function GuideDot({ h, selected, onSelect }: MarkerProps) {
  return (
    <g
      transform={`translate(${h.x * 92} ${h.y * 92})`}
      onPointerDown={(e) => markerTap(h, e, onSelect)}
      style={{ cursor: 'pointer' }}
    >
      <title>{h.label} — tap to select</title>
      {selected && <SelectedRing />}
      <circle r="4.2" fill="#3a86ff" stroke="#fff" strokeWidth="1.2" />
      <circle cy="-1" r="1.4" fill="#fff" />
      <path d="M-2.4 3.4 Q 0 1.6 2.4 3.4" fill="#fff" />
    </g>
  );
}

function CustomStar({ h, selected, onSelect }: MarkerProps) {
  return (
    <g
      transform={`translate(${h.x * 92} ${h.y * 92})`}
      onPointerDown={(e) => markerTap(h, e, onSelect)}
      style={{ cursor: 'pointer' }}
    >
      <title>{h.label} — tap to select</title>
      {selected && <SelectedRing />}
      <path
        d="M0 -5 L1.5 -1.6 L5 -1.6 L2.2 0.8 L3.2 4.4 L0 2.2 L-3.2 4.4 L-2.2 0.8 L-5 -1.6 L-1.5 -1.6 Z"
        fill="#ffd166"
        stroke="#8a6d1a"
        strokeWidth="0.9"
      />
    </g>
  );
}

/**
 * Small stylized map in the corner opposite the compass: paper background, the
 * Thames, streets, selectable hotspots (tourist pins, guide figurines, your own
 * hallmarks as stars — tap one to select it), and a pulsing "you are here" dot
 * with a heading wedge.
 */
export default function MapThumb({ heading, hotspots = [], selectedId = null, onSelect, onTap }: Props) {
  const renderMarker = (h: Hotspot) => {
    const selected = h.id === selectedId;
    const common = { h, selected, onSelect };
    if (h.kind === 'tourist') return <TouristPin key={h.id} {...common} />;
    if (h.kind === 'guide') return <GuideDot key={h.id} {...common} />;
    return <CustomStar key={h.id} {...common} />;
  };

  return (
    <div
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onTap?.(r.left + r.width / 2, r.top + r.height / 2);
      }}
      style={{
        position: 'absolute',
        right: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 7,
        width: 104,
        height: 104,
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.35)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        touchAction: 'none',
      }}
    >
      <style>{PULSE}</style>
      <svg viewBox="0 0 92 92" width={104} height={104}>
        <rect width="92" height="92" fill="#e8e2d2" />
        {/* the Thames */}
        <path d="M-4 66 C 22 58 40 78 62 70 C 76 65 88 70 96 64 L96 96 L-4 96 Z" fill="#9ec7e8" />
        {/* streets */}
        <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
          <line x1="8" y1="-4" x2="30" y2="60" />
          <line x1="34" y1="-4" x2="52" y2="62" />
          <line x1="62" y1="-4" x2="80" y2="58" />
          <line x1="-4" y1="22" x2="96" y2="14" />
          <line x1="-4" y1="44" x2="96" y2="36" />
        </g>
        <g stroke="#d5cfbd" strokeWidth="1.3">
          <line x1="8" y1="-4" x2="30" y2="60" />
          <line x1="34" y1="-4" x2="52" y2="62" />
          <line x1="-4" y1="22" x2="96" y2="14" />
          <line x1="-4" y1="44" x2="96" y2="36" />
        </g>
        {/* hotspots: guides, then tourist pins, then custom hallmark stars on top */}
        {hotspots.filter((h) => h.kind === 'guide').map(renderMarker)}
        {hotspots.filter((h) => h.kind === 'tourist').map(renderMarker)}
        {hotspots.filter((h) => h.kind === 'custom').map(renderMarker)}
        {/* heading wedge, rotating with the compass */}
        <g transform={`rotate(${heading} 46 46)`}>
          <polygon points="46,25 51.5,46 46,42 40.5,46" fill="rgba(230,57,70,0.30)" />
        </g>
        {/* you are here */}
        <circle className="vysta-map-pulse" cx="46" cy="46" r="4" fill="none" stroke="#e63946" strokeWidth="2" />
        <circle cx="46" cy="46" r="4.4" fill="#e63946" stroke="#fff" strokeWidth="1.6" />
      </svg>
    </div>
  );
}
