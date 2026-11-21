// In-memory per-tour session state: accumulated photos + chat history.
// Hackathon-grade: a Map is enough; /api/recap can persist it later.

import type { Box2D, Point2D } from '../types';

export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface TourSession {
  tourId: string;
  /** Data URLs of photos, oldest first. Capped. */
  frames: string[];
  history: HistoryEntry[];
  /** Landmark identified from the most recently analysed photo in this tour. */
  landmarkId: string | null;
  /** Grounding result for that photo, replayed on follow-up questions. */
  box: Box2D | null;
  point: Point2D | null;
  createdAt: number;
  updatedAt: number;
}

const MAX_FRAMES = 4; // bound vision cost
const MAX_HISTORY = 24;
const MAX_TOURS = 100;
const TOUR_TTL_MS = 2 * 60 * 60 * 1000;

const tours = new Map<string, TourSession>();

export function getTour(tourId: string): TourSession {
  pruneTours();
  let t = tours.get(tourId);
  if (!t) {
    const now = Date.now();
    t = { tourId, frames: [], history: [], landmarkId: null, box: null, point: null, createdAt: now, updatedAt: now };
    tours.set(tourId, t);
  }
  t.updatedAt = Date.now();
  return t;
}

/**
 * Append photos, skipping any identical to the one stored before it (clients
 * may resend the same frozen frame on a follow-up). Returns the frames that
 * were actually new.
 */
export function addFrames(tour: TourSession, frames: string[]): string[] {
  const added: string[] = [];
  for (const frame of frames) {
    if (frame === (added.at(-1) ?? tour.frames.at(-1))) continue;
    added.push(frame);
  }
  tour.frames.push(...added);
  if (tour.frames.length > MAX_FRAMES) tour.frames = tour.frames.slice(-MAX_FRAMES);
  tour.updatedAt = Date.now();
  return added;
}

export function recentFrames(tour: TourSession): string[] {
  return tour.frames.slice(-MAX_FRAMES);
}

export function addHistory(tour: TourSession, entries: HistoryEntry[]): void {
  // Mistral rejects assistant/user messages with an empty content field.
  // Do not let a transient model response poison later turns in this tour.
  tour.history.push(...entries.filter((entry) => entry.content.trim().length > 0));
  if (tour.history.length > MAX_HISTORY) tour.history = tour.history.slice(-MAX_HISTORY);
  tour.updatedAt = Date.now();
}

export function setGrounding(
  tour: TourSession,
  grounding: { landmarkId: string | null; box: Box2D | null; point: Point2D | null },
): void {
  tour.landmarkId = grounding.landmarkId;
  tour.box = grounding.box;
  tour.point = grounding.point;
  tour.updatedAt = Date.now();
}

export function deleteTour(tourId: string): boolean {
  return tours.delete(tourId);
}

function pruneTours(): void {
  const cutoff = Date.now() - TOUR_TTL_MS;
  for (const [id, tour] of tours) if (tour.updatedAt < cutoff) tours.delete(id);
  if (tours.size <= MAX_TOURS) return;
  const oldest = [...tours.values()].sort((a, b) => a.updatedAt - b.updatedAt);
  for (const tour of oldest.slice(0, tours.size - MAX_TOURS)) tours.delete(tour.tourId);
}
