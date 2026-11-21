import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface Frame {
  dataUrl: string;
  width: number;
  height: number;
}

export interface CameraHandle {
  /** Capture the current video frame as a base64 JPEG. */
  captureFrame: () => Frame | null;
}

interface Props {
  onError: (message: string) => void;
}

/**
 * Full-screen live camera preview. The frame is only *read* (snapshot) when
 * the user asks a question — no continuous video is sent anywhere.
 */
/** No camera (desktop / denied): a stand-in frame so the UI flow is still demoable. */
function demoFrame(): Frame | null {
  const width = 768;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#8aa4c0');
  g.addColorStop(0.6, '#5b6b7c');
  g.addColorStop(1, '#2d3540');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#3b4450';
  ctx.fillRect(width * 0.47, height * 0.6, width * 0.06, height * 0.4); // plinth
  ctx.font = `${width * 0.26}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐉', width * 0.51, height * 0.46);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.8), width, height };
}

const CameraView = forwardRef<CameraHandle, Props>(function CameraView({ onError }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep the latest callback in a ref so a new onError identity doesn't
  // restart the stream (App re-renders many times a second from the compass).
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
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
      .catch((e: unknown) => {
        const name = e instanceof Error ? e.name : '';
        onErrorRef.current(
          name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access for this site in your browser settings.'
            : name === 'NotReadableError'
              ? 'Camera is busy. Close other apps using the camera and reload.'
              : `Camera unavailable${name ? ` (${name})` : ''}. Open the app over HTTPS and allow camera access.`,
        );
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return demoFrame();
      // Cap the frame size — grounding works on a downscaled image and the
      // payload stays small. The FULL uncropped frame is what the model sees;
      // Overlay applies the screen crop on top of these dimensions.
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);
      return { dataUrl: canvas.toDataURL('image/jpeg', 0.8), width, height };
    },
  }));

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
});

export default CameraView;
