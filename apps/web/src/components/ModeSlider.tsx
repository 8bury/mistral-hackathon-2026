import { useEffect, useRef, useState } from 'react';

import Figurine, { FIGURINE_LABELS, type FigurineId } from './Figurines';

interface Props {
  modes: FigurineId[];
  value: FigurineId;
  faceImage: string | null;
  /** Called with the chosen mode + viewport coords of its stop (for the ripple). */
  onChange: (id: FigurineId, x: number, y: number) => void;
  /** 📷 badge on the "You" stop. */
  onFaceEdit: (x: number, y: number) => void;
}

/**
 * Character selection as a modern sliding scale: a glass track with one stop
 * per figurine and a glowing thumb that drags freely and snaps to the nearest
 * stop on release. Tapping a stop slides the thumb there.
 */
export default function ModeSlider({ modes, value, faceImage, onChange, onFaceEdit }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const n = modes.length;
  const active = modes.indexOf(value);
  const posRef = useRef(active);
  const [pos, setPos] = useState(active);
  const [dragging, setDragging] = useState(false);

  // External changes (e.g. face badge selecting "You") slide the thumb over.
  useEffect(() => {
    if (!dragging) {
      posRef.current = active;
      setPos(active);
    }
  }, [active, dragging]);

  const posFromClientX = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.width <= 24) return posRef.current;
    const t = (clientX - r.left - 12) / (r.width - 24);
    return Math.min(n - 1, Math.max(0, t * (n - 1)));
  };

  const stopX = (i: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    return r ? r.left + 12 + (r.width - 24) * (i / (n - 1)) : 0;
  };
  const stopY = () => {
    const r = trackRef.current?.getBoundingClientRect();
    return r ? r.top + r.height / 2 : 0;
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const p = posFromClientX(e.clientX);
      posRef.current = p;
      setPos(p);
    };
    const up = () => {
      setDragging(false);
      const s = Math.round(posRef.current);
      posRef.current = s;
      setPos(s);
      if (modes[s] !== value) onChange(modes[s], stopX(s), stopY());
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, modes, value]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = posFromClientX(e.clientX);
    posRef.current = p;
    setPos(p);
    setDragging(true);
  };

  const leftOf = (i: number) => `calc(12px + (100% - 24px) * ${i / (n - 1)})`;

  return (
    <div
      style={{
        width: 'min(320px, calc(100vw - 150px))',
        padding: '6px 10px 3px',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.16)',
        background: 'rgba(10,14,26,0.5)',
        backdropFilter: 'blur(14px) saturate(1.4)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* track */}
      <div
        ref={trackRef}
        onPointerDown={startDrag}
        style={{ position: 'relative', height: 50, cursor: 'grab' }}
      >
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: '50%',
            height: 2,
            transform: 'translateY(-50%)',
            borderRadius: 2,
            background: 'rgba(255,255,255,0.22)',
          }}
        />
        {/* stops with dimmed figurines (active one lives in the thumb) */}
        {modes.map((m, i) => (
          <button
            key={m}
            onPointerDown={(e) => {
              e.stopPropagation();
              posRef.current = i;
              setPos(i);
              if (modes[i] !== value) onChange(m, stopX(i), stopY());
            }}
            style={{
              position: 'absolute',
              left: leftOf(i),
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'none',
              border: 'none',
              padding: 4,
              opacity: i === active ? 0 : 0.5,
              transition: 'opacity 0.2s',
              touchAction: 'none',
            }}
            aria-label={FIGURINE_LABELS[m]}
          >
            <div style={{ position: 'relative' }}>
              <Figurine id={m} faceImage={faceImage} size={28} />
              {m === 'generic' && (
                <span
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    onFaceEdit(r.left + r.width / 2, r.top + r.height / 2);
                  }}
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -6,
                    width: 17,
                    height: 17,
                    borderRadius: '50%',
                    background: faceImage ? '#2a9d8f' : '#ffd166',
                    color: '#0b1020',
                    fontSize: 8.5,
                    lineHeight: '17px',
                    textAlign: 'center',
                    fontWeight: 900,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                  title="Scan / re-scan your face (front camera)"
                >
                  📷
                </span>
              )}
            </div>
          </button>
        ))}
        {/* sliding thumb with the live figurine */}
        <div
          style={{
            position: 'absolute',
            left: `calc(12px + (100% - 24px) * ${pos / (n - 1)})`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            transition: dragging ? 'none' : 'left 0.3s cubic-bezier(0.3, 0.9, 0.3, 1.1)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,209,102,0.22)',
            border: '2px solid #ffd166',
            boxShadow:
              '0 0 0 2px rgba(255,209,102,0.25), 0 0 26px rgba(255,209,102,0.65), inset 0 0 12px rgba(255,209,102,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Figurine id={modes[Math.round(pos)]} faceImage={faceImage} size={36} />
        </div>
      </div>
      {/* labels */}
      <div style={{ position: 'relative', height: 13 }}>
        {modes.map((m, i) => (
          <span
            key={m}
            style={{
              position: 'absolute',
              left: leftOf(i),
              transform: 'translateX(-50%)',
              fontSize: i === active ? 8.5 : 7.5,
              fontWeight: i === active ? 900 : 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: i === active ? '#ffd166' : 'rgba(255,255,255,0.55)',
              textShadow: i === active ? '0 0 10px rgba(255,209,102,0.8)' : 'none',
              transition: 'color 0.2s, font-size 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {FIGURINE_LABELS[m]}
          </span>
        ))}
      </div>
    </div>
  );
}
