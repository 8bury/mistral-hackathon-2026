/**
 * Transparent grey/white ripples — every interaction with image intelligence
 * (focus tap, scan, recognition result, mode switch, face capture, language…)
 * emits one. Kept soft and organic: no hard pop-in, gentle ease-out, slightly
 * irregular "blob" ring instead of a perfect circle. Pointer-events pass through.
 */

export type RippleKind = 'tap' | 'scan' | 'result';

export interface Ripple {
  id: number;
  x: number; // viewport px
  y: number; // viewport px
  kind: RippleKind;
}

const RING_SIZES: Record<RippleKind, number[]> = {
  tap: [150],
  scan: [200, 300],
  result: [240, 370],
};

const STYLE = `
@keyframes vysta-ripple {
  0%   { transform: scale(0.55); opacity: 0.5; border-radius: 50%; }
  60%  { opacity: 0.28; }
  100% {
    transform: scale(1.05);
    opacity: 0;
    border-radius: 46% 54% 52% 48% / 52% 47% 53% 48%;
  }
}
.vysta-ripple-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: vysta-ripple 1.15s cubic-bezier(0.25, 0.6, 0.35, 1) forwards;
}
`;

export default function RippleLayer({ ripples }: { ripples: Ripple[] }) {
  return (
    <>
      <style>{STYLE}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {ripples.map((r) =>
          RING_SIZES[r.kind].map((s, i) => (
            <span
              key={`${r.id}-${i}`}
              className="vysta-ripple-ring"
              style={{
                left: r.x - s / 2,
                top: r.y - s / 2,
                width: s,
                height: s,
                animationDelay: `${i * 180}ms`,
                // transparent grey / white rings, thin and quiet
                border: `1.5px solid ${i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(210,210,210,0.3)'}`,
                background: 'rgba(255,255,255,0.04)',
              }}
            />
          )),
        )}
      </div>
    </>
  );
}
