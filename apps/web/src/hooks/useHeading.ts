import { useCallback, useEffect, useRef, useState } from 'react';

export interface Heading {
  /** Degrees clockwise from north (0 = N). Always a number; sweeps slowly on desktop as a demo fallback. */
  heading: number;
  /** iOS 13+ requires an explicit user gesture before orientation events flow. */
  needsPermission: boolean;
  requestMotion: () => void;
}

/**
 * Device compass heading. Uses webkitCompassHeading (iOS) or 360 - alpha
 * (Android). Until a real sensor event arrives (e.g. desktop demo), the
 * heading slowly sweeps so the compass/map widgets visibly rotate.
 */
export function useHeading(): Heading {
  const [heading, setHeading] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const realSensorRef = useRef(false);

  useEffect(() => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE.requestPermission === 'function') setNeedsPermission(true);

    const onOrient = (e: DeviceOrientationEvent) => {
      const anyE = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const raw =
        typeof anyE.webkitCompassHeading === 'number'
          ? anyE.webkitCompassHeading
          : e.alpha != null
            ? 360 - e.alpha
            : null;
      if (raw != null && !Number.isNaN(raw)) {
        realSensorRef.current = true;
        setHeading(((raw % 360) + 360) % 360);
      }
    };

    window.addEventListener('deviceorientationabsolute', onOrient as EventListener);
    window.addEventListener('deviceorientation', onOrient as EventListener);

    // Demo fallback: gentle sweep until a real event arrives.
    const iv = window.setInterval(() => {
      if (!realSensorRef.current) setHeading((h) => (h + 0.4) % 360);
    }, 50);

    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener);
      window.removeEventListener('deviceorientation', onOrient as EventListener);
      window.clearInterval(iv);
    };
  }, []);

  const requestMotion = useCallback(() => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission()
        .then((res) => {
          if (res === 'granted') setNeedsPermission(false);
        })
        .catch(() => undefined);
    } else {
      setNeedsPermission(false);
    }
  }, []);

  return { heading, needsPermission, requestMotion };
}
