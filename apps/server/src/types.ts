// Local placeholder for the packages/shared contract (see README: the shared
// package is intentionally not created yet). Keep in sync with
// apps/web/src/api.ts.

export type Persona = 'child' | 'architect' | 'historian';
/** BCP-47 language tag such as en, es, zh, or auto. */
export type Language = string;

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

/** GPS fix from the visitor's device; accuracy is the estimated radius in metres. */
export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface AskRequest {
  /** Optional after the first turn of a tour; raw base64 is treated as JPEG. */
  frame?: string;
  question: string;
  persona: Persona;
  language: Language;
  tourId: string;
  /** Optional extra photos the user attached this turn. */
  frames?: string[];
  /** Latest GPS fix when the device granted location; absent/null otherwise. */
  location?: UserLocation | null;
}

export interface AskResponse {
  box: Box2D | null;
  point: Point2D | null;
  landmarkId: string | null;
  answerText: string;
  audioUrl: string | null;
}

/** Accept a data URL or raw base64 and return a data URL the SDK can use. */
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type MediaParseResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: 'empty' | 'unsupported_image' | 'video' | 'invalid' };

/**
 * Normalize a photo to a data URL accepted by the vision model.
 * iPhone HEIC and MOV/HEVC need conversion or frame extraction before this
 * endpoint; they are deliberately rejected with a useful error instead of
 * being forwarded to Mistral as an opaque 400.
 */
export function parseImageDataUrl(input: unknown): MediaParseResult {
  if (typeof input !== 'string' || !input.trim()) return { ok: false, reason: 'empty' };
  const trimmed = input.trim();
  if (!trimmed.startsWith('data:')) return { ok: true, dataUrl: `data:image/jpeg;base64,${trimmed}` };
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
  if (!match) return { ok: false, reason: 'invalid' };
  const mime = match[1].toLowerCase();
  if (mime.startsWith('video/')) return { ok: false, reason: 'video' };
  if (!SUPPORTED_IMAGE_TYPES.has(mime)) return { ok: false, reason: 'unsupported_image' };
  return { ok: true, dataUrl: `data:${mime};base64,${match[2].replace(/\s/g, '')}` };
}

/** @deprecated Use parseImageDataUrl for validation and MIME handling. */
export function normalizeDataUrl(input: string | undefined | null): string | null {
  const parsed = parseImageDataUrl(input);
  return parsed.ok ? parsed.dataUrl : null;
}
