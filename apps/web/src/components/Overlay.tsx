import { useEffect, useState, type ReactNode } from 'react';

import type { Box2D, Point2D } from '../api';
import type { PersonaTheme } from '../personas';

interface Props {
  box: Box2D | null;
  point: Point2D | null;
  /** Natural dimensions of the frozen frame the model saw. */
  frameSize: { width: number; height: number } | null;
  theme: PersonaTheme;
  /** Answer card, anchored next to the highlight. */
  children?: ReactNode;
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
 * frozen <img>, then animates the highlight in and anchors the answer card.
 */
export default function Overlay({ box, point, frameSize, theme, children }: Props) {
  const { w, h } = useViewport();
  if (!frameSize || (!box && !point)) {
    return children ? <div className="card-dock card-dock--bottom">{children}</div> : null;
  }

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

  // Card goes below the highlight if there is room, else above.
  const below = rect.y + rect.h < h * 0.55;
  const anchorX = Math.min(Math.max(rect.x + rect.w / 2, 40), w - 40);

  return (
    <div className="overlay" style={{ ['--accent' as string]: theme.accent }}>
      <div
        key={`${rect.x}-${rect.y}-${theme.id}`}
        className={`hl hl--${theme.frame}`}
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      >
        {box && (
          <>
            <i className="c tl" />
            <i className="c tr" />
            <i className="c bl" />
            <i className="c br" />
          </>
        )}
      </div>
      {point && (
        <div className="pt" style={{ left: toX(point.x), top: toY(point.y) }}>
          <span />
        </div>
      )}
      {children && (
        <div
          className={`card-anchor ${below ? 'is-below' : 'is-above'}`}
          style={{
            top: below ? rect.y + rect.h + 14 : undefined,
            bottom: below ? undefined : h - rect.y + 14,
            ['--tail-x' as string]: `${anchorX}px`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
