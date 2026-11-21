import { useEffect, useRef } from 'react';

import type { Box2D, Point2D } from '../api';

interface Props {
  box: Box2D | null;
  point: Point2D | null;
  /** Natural dimensions of the frozen frame the model saw. */
  frameSize: { width: number; height: number } | null;
}

/**
 * Draws the grounding result on a canvas layered over the frozen frame.
 *
 * Coordinates are normalized 0..1000 (Le Chonk convention) against the FULL
 * uncropped frame. The screen shows that frame with objectFit: 'cover', which
 * crops it — so we apply the same cover transform here (scale + centering
 * offset) to land the highlight on the right spot. This is the single place
 * where normalized coordinates meet screen pixels.
 */
export default function Overlay({ box, point, frameSize }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (!frameSize) return;

      // objectFit: 'cover' transform between frame pixels and screen pixels.
      const scale = Math.max(w / frameSize.width, h / frameSize.height);
      const dispW = frameSize.width * scale;
      const dispH = frameSize.height * scale;
      const offX = (w - dispW) / 2;
      const offY = (h - dispH) / 2;
      const toX = (nx: number) => offX + (nx / 1000) * dispW;
      const toY = (ny: number) => offY + (ny / 1000) * dispH;

      ctx.lineWidth = Math.max(3, w / 150);
      ctx.strokeStyle = '#ffd166';
      ctx.fillStyle = '#ffd166';

      if (box) {
        const x = toX(box.x);
        const y = toY(box.y);
        const bw = (box.width / 1000) * dispW;
        const bh = (box.height / 1000) * dispH;
        ctx.strokeRect(x, y, bw, bh);
        // corner accents
        const c = Math.max(12, w / 40);
        for (const [cx, cy, sx, sy] of [
          [x, y, 1, 1],
          [x + bw, y, -1, 1],
          [x, y + bh, 1, -1],
          [x + bw, y + bh, -1, -1],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(cx + sx * c, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + sy * c);
          ctx.stroke();
        }
      }

      if (point) {
        const r = Math.max(6, w / 80);
        ctx.beginPath();
        ctx.arc(toX(point.x), toY(point.y), r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [box, point, frameSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
