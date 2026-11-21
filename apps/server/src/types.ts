// Local placeholder for the packages/shared contract (see README: the shared
// package is intentionally not created yet). Keep in sync with
// apps/web/src/api.ts.

export type Persona = 'child' | 'architect' | 'historian';
export type Language = 'en' | 'es';

/** Normalized 0..1000, Le Chonk convention. */
export interface Box2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface AskRequest {
  frame: string; // base64 JPEG snapshot captured at push-to-talk (data URL or raw base64)
  question: string;
  persona: Persona;
  language: Language;
  tourId: string;
  /** Optional extra photos the user attached this turn. */
  frames?: string[];
}

export interface AskResponse {
  box: Box2D | null;
  point: Point2D | null;
  landmarkId: string | null;
  answerText: string;
  audioUrl: string | null;
}

/** Accept a data URL or raw base64 and return a data URL the SDK can use. */
export function normalizeDataUrl(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}
