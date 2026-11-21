import data from '../../../data/landmarks.json';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  id: string;
  name: string;
}

interface Landmark {
  id: string;
  name: string;
  locations?: LatLng[];
}

/** Shorter names for the map, where the full catalogue name is too long. */
const SHORT_NAMES: Record<string, string> = {
  'dragon-boundary': 'Dragon boundary marker',
};

/** Demo "you are here" when there is no GPS fix: outside Bank station. */
export const BANK: LatLng = { lat: 51.5133, lng: -0.089 };

export const metres = (a: LatLng, b: LatLng) => {
  const dLat = (b.lat - a.lat) * 111_320;
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

export const fmtDistance = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : m < 10_000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 1000).toLocaleString()} km`;

/**
 * One pin per landmark that has coordinates in data/landmarks.json. Landmarks
 * found in several spots (the dragon markers) use the spot closest to `me`.
 */
export function placesNear(me: LatLng): Place[] {
  return (data.landmarks as Landmark[]).flatMap((l) => {
    if (!l.locations?.length) return [];
    const spot = l.locations.reduce((best, loc) => (metres(me, loc) < metres(me, best) ? loc : best));
    return [{ id: l.id, name: SHORT_NAMES[l.id] ?? l.name, lat: spot.lat, lng: spot.lng }];
  });
}
