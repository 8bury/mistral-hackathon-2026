import { useEffect, useRef } from 'react';

interface Props {
  /** 'create' the first time, 'change' when re-scanning an existing figurine. */
  mode: 'create' | 'change';
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

const SCAN = `
@keyframes vysta-face-scan {
  0%, 100% { top: 10%; opacity: 0.9; }
  50%      { top: 86%; opacity: 0.9; }
}
.vysta-face-scanline {
  position: absolute;
  left: 10%;
  right: 10%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,209,102,0.95), transparent);
  box-shadow: 0 0 12px rgba(255,209,102,0.8);
  animation: vysta-face-scan 1.6s ease-in-out infinite;
  pointer-events: none;
}
`;

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
      .catch(() => onError('Front camera unavailable — grant camera permission over HTTPS.'));
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
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        background: 'rgba(5,8,18,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        color: '#fff',
      }}
    >
      <style>{SCAN}</style>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.2, textAlign: 'center', padding: '0 24px' }}>
        {mode === 'create' ? 'Scan your face to create your figurine' : 'Re-scan your face to change it'}
      </div>
      <div
        style={{
          position: 'relative',
          width: 240,
          height: 240,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid #ffd166',
          boxShadow: '0 0 32px rgba(255,209,102,0.35)',
          background: '#000',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        <div className="vysta-face-scanline" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={capture}
          style={{
            padding: '10px 22px',
            borderRadius: 999,
            border: 'none',
            background: '#ffd166',
            color: '#0b1020',
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 0 18px rgba(255,209,102,0.5)',
          }}
        >
          {mode === 'create' ? 'Create figurine' : 'Update figurine'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 22px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'transparent',
            color: '#fff',
            fontSize: 14,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
