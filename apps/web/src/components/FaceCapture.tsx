import { useEffect, useRef } from 'react';

interface Props {
  /** 'create' the first time, 'change' when re-scanning an existing figurine. */
  mode: 'create' | 'change';
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

/**
 * Front-camera face scan for the editable "You" mode. A scan line sweeps the
 * live preview while the camera reads the face; Capture turns the centered
 * square snapshot into the figurine's face texture.
 */
export default function FaceCapture({ mode, onCapture, onClose, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch(() => onError('Front camera unavailable. Grant camera permission over HTTPS.'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onError]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) {
      onError('Front camera not ready yet.');
      return;
    }
    const src = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror so the saved face matches the preview the user saw.
    ctx.translate(256, 0);
    ctx.scale(-1, 1);
    ctx.filter = 'saturate(0.9) contrast(1.08) brightness(1.03)';
    ctx.drawImage(
      v,
      (v.videoWidth - src) / 2,
      (v.videoHeight - src) / 2,
      src,
      src,
      0,
      0,
      256,
      256,
    );
    ctx.filter = 'none';
    // Posterize into flat cartoon colours so the face matches the blocky art style.
    const img = ctx.getImageData(0, 0, 256, 256);
    const d = img.data;
    const levels = 5;
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const ch = d[i + c];
        d[i + c] = Math.round((ch / 255) * (levels - 1)) / (levels - 1) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Pixelate: downscale to 64px and upscale with smoothing off -> chunky retro avatar.
    const small = document.createElement('canvas');
    small.width = 64;
    small.height = 64;
    const sctx = small.getContext('2d');
    if (sctx) {
      sctx.drawImage(canvas, 0, 0, 64, 64);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(small, 0, 0, 256, 256);
    }
    // PNG keeps the pixel edges crisp (JPEG would blur them).
    onCapture(canvas.toDataURL('image/png'));
  };

  return (
    <div className="face" role="dialog" aria-label={mode === 'create' ? 'Create your figurine' : 'Change your figurine'}>
      <h2 className="face__title">{mode === 'create' ? 'Make your figurine' : 'Change your figurine'}</h2>
      <p className="face__sub">Center your face in the circle.</p>
      <div className="face__lens">
        <video ref={videoRef} playsInline muted />
        <span className="face__scan" />
      </div>
      <div className="face__actions">
        <button className="ghost-btn" onClick={onClose}>Cancel</button>
        <button className="primary" onClick={capture}>Take photo</button>
      </div>
    </div>
  );
}
