interface Props {
  heading: number;
  needsPermission: boolean;
  onEnable: () => void;
}

const CARDINALS = ['N', 'E', 'S', 'W'];

/**
 * Compass dial. The dial rotates against a fixed needle so N tracks real
 * north; the needle is the direction the phone faces.
 */
export default function Compass({ heading, needsPermission, onEnable }: Props) {
  return (
    <button
      className="compass"
      onClick={needsPermission ? onEnable : undefined}
      aria-label={needsPermission ? 'Enable compass' : `Heading ${Math.round(heading)}°`}
    >
      <svg viewBox="0 0 64 64" width={52} height={52} aria-hidden="true">
        <g transform={`rotate(${-heading} 32 32)`}>
          {CARDINALS.map((d, i) => (
            <text key={d} x="32" y="14" transform={`rotate(${i * 90} 32 32)`} className={i === 0 ? 'compass__n' : 'compass__d'}>
              {d}
            </text>
          ))}
        </g>
        <polygon points="32,20 36,34 32,31 28,34" className="compass__needle" />
        <circle cx="32" cy="32" r="2.4" className="compass__hub" />
      </svg>
      {needsPermission && <span className="compass__enable">Enable</span>}
    </button>
  );
}
