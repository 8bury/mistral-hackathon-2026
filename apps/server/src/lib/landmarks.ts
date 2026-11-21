import fs from 'node:fs';
import path from 'node:path';

import { repoRoot } from './env';

export interface LandmarkLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface Landmark {
  id: string;
  name: string;
  aliases: string[];
  facts: Record<string, string>;
  /** Known physical spots — some landmarks (e.g. boundary markers) exist in many places. */
  locations?: LandmarkLocation[];
  /** Ids of other landmarks physically close by (for "what's near" answers). */
  near?: string[];
}

const EARTH_RADIUS_M = 6371008.8;

/** Great-circle distance between two lat/lng points, in metres (haversine). */
export function haversineDistanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface LandmarkWithDistance {
  landmark: Landmark;
  /** Distance in metres to the landmark's nearest known location (Infinity if it has none). */
  distanceM: number;
}

/** All landmarks sorted by their nearest known location's distance to `user`, nearest first. */
export function landmarksByDistance(user: { lat: number; lng: number }): LandmarkWithDistance[] {
  return allLandmarks()
    .map((landmark) => {
      const spots = landmark.locations ?? [];
      const distanceM = spots.length
        ? Math.min(...spots.map((spot) => haversineDistanceM(user, spot)))
        : Number.POSITIVE_INFINITY;
      return { landmark, distanceM };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

let cache: Landmark[] | null = null;

export function allLandmarks(): Landmark[] {
  if (!cache) {
    const file = path.join(repoRoot(), 'data', 'landmarks.json');
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as { landmarks: Landmark[] };
    cache = json.landmarks;
  }
  return cache;
}

export function findLandmarkById(id: string | null | undefined): Landmark | null {
  if (!id) return null;
  const wanted = id.toLowerCase();
  return allLandmarks().find((l) => l.id.toLowerCase() === wanted) ?? null;
}

/** Match free text (model output) against ids and aliases. */
export function matchLandmark(text: string | null | undefined): Landmark | null {
  if (!text) return null;
  const wanted = text.toLowerCase().trim();
  return (
    allLandmarks().find(
      (l) => l.id.toLowerCase() === wanted || l.aliases.some((a) => a.toLowerCase() === wanted),
    ) ?? null
  );
}

/** Compact catalog injected into the grounding prompt so the model can only pick real ids. */
export function landmarkCatalog(): string {
  return allLandmarks()
    .map((l) => `- ${l.id} | ${l.name} | aliases: ${l.aliases.join(', ')}`)
    .join('\n');
}

/** Curated fact for a landmark in the requested language (falls back to English). */
export function landmarkFact(landmark: Landmark | null, language: string): string | null {
  if (!landmark) return null;
  return landmark.facts[language] ?? landmark.facts.en ?? null;
}
