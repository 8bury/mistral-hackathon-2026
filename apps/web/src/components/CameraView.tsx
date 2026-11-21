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
const CameraView = forwardRef<CameraHandle, Props>(function CameraView({ onError }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
      .catch(() => {
        onError(
          'Camera unavailable. On a phone, serve the app over HTTPS (ngrok / tunnel) and grant camera permission.',
        );
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onError]);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return null;
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
