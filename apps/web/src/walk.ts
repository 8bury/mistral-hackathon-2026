import type { Box2D } from './api';
import type { Frame } from './components/CameraView';

export interface Stop {
  id: string;
  time: number;
  thumb: string;
  question: string;
  answer: string;
  landmarkId: string | null;
}

/** Crop the highlighted area of the frame into a small square thumbnail. */
export function cropThumb(frame: Frame, box: Box2D | null): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(frame.dataUrl);
      let sx = 0, sy = 0, sw = frame.width, sh = frame.height;
      if (box) {
        const pad = 1.4;
        const cx = ((box.x + box.width / 2) / 1000) * frame.width;
        const cy = ((box.y + box.height / 2) / 1000) * frame.height;
        const side = Math.min(Math.max((box.width / 1000) * frame.width, (box.height / 1000) * frame.height) * pad, frame.width, frame.height);
        sw = sh = side;
        sx = Math.min(Math.max(cx - side / 2, 0), frame.width - side);
        sy = Math.min(Math.max(cy - side / 2, 0), frame.height - side);
      } else {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => resolve(frame.dataUrl);
    img.src = frame.dataUrl;
  });
}
