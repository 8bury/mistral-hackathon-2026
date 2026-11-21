import fs from 'node:fs';
import path from 'node:path';

import { repoRoot } from './env';

export interface Landmark {
  id: string;
  name: string;
  aliases: string[];
  facts: Record<string, string>;
  /** Ids of other landmarks physically close by (for "what's near" answers). */
  near?: string[];
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
