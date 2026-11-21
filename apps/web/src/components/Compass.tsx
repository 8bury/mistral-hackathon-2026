interface Props {
  heading: number;
  needsPermission: boolean;
  onEnable: () => void;
}

const CARDINALS = ['N', 'E', 'S', 'W'];

/**
 * Corner compass. The dial rotates against a fixed red needle so that N always
 * points to real north; the number below shows the current heading.
 */
export default function Compass({ heading, needsPermission, onEnable }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        zIndex: 7,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.45)',
          backdropFilter: 'blur(4px)',
          overflow: 'hidden',
        }}
      >
        <svg viewBox="0 0 64 64" width={64} height={64}>
          {/* rotating dial: letters ride at -heading so N tracks real north */}
          <g transform={`rotate(${-heading} 32 32)`}>
            {CARDINALS.map((d, i) => (
              <g key={d} transform={`rotate(${i * 90} 32 32)`}>
                <text
                  x="32"
                  y="12.5"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight={i === 0 ? 800 : 600}
                  fill={i === 0 ? '#ff6b6b' : 'rgba(255,255,255,0.9)'}
                  fontFamily="system-ui, sans-serif"
                >
                  {d}
                </text>
              </g>
            ))}
            <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          </g>
          {/* fixed needle: screen-up is the direction the phone faces */}
          <polygon points="32,9 36.5,32 32,28 27.5,32" fill="#e63946" />
          <polygon points="32,55 35,38 32,41 29,38" fill="rgba(255,255,255,0.75)" />
          <circle cx="32" cy="32" r="2.6" fill="#fff" />
        </svg>
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          background: 'rgba(0,0,0,0.45)',
          borderRadius: 8,
          padding: '1px 6px',
        }}
      >
        {Math.round(heading)}°
      </div>
      {needsPermission && (
        <button
          onClick={onEnable}
          style={{
            fontSize: 10,
            color: '#0b1020',
            background: '#ffd166',
            border: 'none',
            borderRadius: 8,
            padding: '3px 8px',
            fontWeight: 700,
          }}
        >
          Enable compass
        </button>
      )}
    </div>
  );
}
