// In-memory per-tour session state: accumulated photos + chat history.
// Hackathon-grade: a Map is enough; /api/recap can persist it later.

export interface HistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface TourSession {
  tourId: string;
  /** Data URLs of photos, oldest first. Capped. */
  frames: string[];
  history: HistoryEntry[];
  createdAt: number;
}

const MAX_FRAMES = 4; // bound vision cost
const MAX_HISTORY = 24;

const tours = new Map<string, TourSession>();

export function getTour(tourId: string): TourSession {
  let t = tours.get(tourId);
  if (!t) {
    t = { tourId, frames: [], history: [], createdAt: Date.now() };
    tours.set(tourId, t);
  }
  return t;
}

export function addFrames(tour: TourSession, frames: string[]): void {
  tour.frames.push(...frames);
  if (tour.frames.length > MAX_FRAMES) tour.frames = tour.frames.slice(-MAX_FRAMES);
}

export function recentFrames(tour: TourSession): string[] {
  return tour.frames.slice(-MAX_FRAMES);
}

export function addHistory(tour: TourSession, entries: HistoryEntry[]): void {
  // Mistral rejects assistant/user messages with an empty content field.
  // Do not let a transient model response poison later turns in this tour.
  tour.history.push(...entries.filter((entry) => entry.content.trim().length > 0));
  if (tour.history.length > MAX_HISTORY) tour.history = tour.history.slice(-MAX_HISTORY);
}
