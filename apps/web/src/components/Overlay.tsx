import { useEffect, useState } from 'react';

import type { Box2D, Point2D } from '../api';
import type { PersonaTheme } from '../personas';

interface Props {
  box: Box2D | null;
  point: Point2D | null;
  /** Natural dimensions of the frozen frame the model saw. */
  frameSize: { width: number; height: number } | null;
  theme: PersonaTheme;
  /** Landmark name pinned to the highlight. */
  label?: string | null;
}

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/**
 * DOM overlay for the grounding result (normalized 0..1000 against the FULL
 * uncropped frame). Applies the same objectFit:'cover' transform as the
 * frozen <img>, then animates the highlight in.
 */
export default function Overlay({ box, point, frameSize, theme, label }: Props) {
  const { w, h } = useViewport();
  if (!frameSize || (!box && !point)) return null;

  const scale = Math.max(w / frameSize.width, h / frameSize.height);
  const dispW = frameSize.width * scale;
  const dispH = frameSize.height * scale;
  const offX = (w - dispW) / 2;
  const offY = (h - dispH) / 2;
  const toX = (nx: number) => offX + (nx / 1000) * dispW;
  const toY = (ny: number) => offY + (ny / 1000) * dispH;

  const rect = box
    ? { x: toX(box.x), y: toY(box.y), w: (box.width / 1000) * dispW, h: (box.height / 1000) * dispH }
    : { x: toX(point!.x) - 30, y: toY(point!.y) - 30, w: 60, h: 60 };

  return (
    <div className="overlay">
      <div
        key={`${rect.x}-${rect.y}-${theme.id}`}
        className={`hl hl--${theme.frame}`}
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      >
        {box && theme.frame !== 'ink' && (
          <>
            <i className="c tl" />
            <i className="c tr" />
            <i className="c bl" />
            <i className="c br" />
          </>
        )}
        {theme.frame === 'ink' && (
          <svg className="ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength={1} d="M52 4 C80 3 97 22 96 50 C95 79 76 97 48 96 C20 95 3 77 4 49 C5 24 22 6 56 7 C70 8 82 14 88 22" />
          </svg>
        )}
        {label && <span className="hl__label">{label}</span>}
      </div>
      {point && (
        <div className="pt" style={{ left: toX(point.x), top: toY(point.y) }}>
          <span />
        </div>
      )}
    </div>
  );
}
