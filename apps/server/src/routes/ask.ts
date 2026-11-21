import { Request, Response } from 'express';

import { answerQuestion } from '../agents/guide';
import { groundFrame } from '../agents/grounding';
import { findLandmarkById } from '../lib/landmarks';
import { addFrames, addHistory, getTour, recentFrames, setLandmark } from '../lib/store';
import { extractVideoFrames, VideoInputError } from '../lib/video';
import { parseImageDataUrl, type AskRequest, type AskResponse, type Box2D, type Persona, type Point2D, type UserLocation } from '../types';

/**
 * Accept only a well-formed GPS fix; anything else (missing, non-finite,
 * out-of-range) is treated as absent. Location must never cause a 400.
 */
function parseLocation(value: unknown): UserLocation | null {
  if (typeof value !== 'object' || value === null) return null;
  const { lat, lng, accuracy } = value as Record<string, unknown>;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof accuracy !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(accuracy)
  ) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || accuracy < 0) return null;
  return { lat, lng, accuracy };
}

function parsePersona(value: unknown): Persona | null {
  return value === 'child' || value === 'architect' || value === 'historian' ? value : null;
}

function parseLanguage(value: unknown): string {
  if (typeof value !== 'string') return 'auto';
  const normalized = value.trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(normalized) || normalized === 'auto' ? normalized : 'auto';
}

function mediaError(reason: 'empty' | 'unsupported_image' | 'video' | 'invalid'): string {
  if (reason === 'video') return 'Video files are not sent directly to vision. Extract a few JPEG/PNG/WebP frames and send them in frames.';
  if (reason === 'unsupported_image') return 'Supported image formats are JPEG, PNG, WebP, and GIF. Convert iPhone HEIC photos to JPEG before sending.';
  return 'Each frame must be a base64 image data URL or raw base64 JPEG.';
}

/**
 * POST /api/ask
 * Body: { frame: base64Jpeg (data URL or raw base64), question, persona, language, tourId, frames?: string[], location?: { lat, lng, accuracy } | null }
 * Response: { box, point, landmarkId, answerText, audioUrl }
 *
 * Pipeline: accumulate the tour's photos -> grounding agent (Le Chonk, vision,
 * optionally biased by the visitor's GPS location) -> guide agent (persona +
 * language, photos + history).
 * audioUrl stays null until the TTS route is wired.
 */
export async function askRouter(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Partial<AskRequest>;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const persona = parsePersona(body.persona);
    const language = parseLanguage(body.language);
    const tourId = typeof body.tourId === 'string' && body.tourId.trim() ? body.tourId.trim().slice(0, 100) : 'anonymous';
    const location = parseLocation(body.location);

    if (!persona) {
      res.status(400).json({ error: 'invalid_persona', message: 'persona must be child, architect, or historian' });
      return;
    }
    if (!question || question.length > 2000) {
      res.status(400).json({ error: 'missing_question' });
      return;
    }

    const tour = getTour(tourId);
    const supplied = [body.frame, ...(Array.isArray(body.frames) ? body.frames.slice(0, 3) : [])];
    const newFrames: string[] = [];
    for (const input of supplied) {
      const parsed = parseImageDataUrl(input);
      if (parsed.ok) newFrames.push(parsed.dataUrl);
      else if (parsed.reason === 'video') {
        try {
          newFrames.push(...(await extractVideoFrames(input)));
        } catch (error) {
          if (error instanceof VideoInputError) {
            res.status(error.status).json({ error: 'video_processing_failed', message: error.message });
            return;
          }
          throw error;
        }
      }
      else if (parsed.reason !== 'empty') {
        res.status(415).json({ error: 'unsupported_media', message: mediaError(parsed.reason) });
        return;
      }
    }
    if (newFrames.length > 0) addFrames(tour, newFrames);
    if (recentFrames(tour).length === 0) {
      res.status(400).json({ error: 'missing_frame', message: 'Send at least one supported image on the first question of a tour.' });
      return;
    }

    // 1. Ground only when the visitor sends new visual material. Follow-up
    // questions reuse the landmark already identified for this tour.
    let landmark = findLandmarkById(tour.landmarkId);
    let box: Box2D | null = null;
    let point: Point2D | null = null;
    if (newFrames.length > 0) {
      const grounding = await groundFrame(newFrames.at(-1)!, question, location);
      landmark = findLandmarkById(grounding.landmarkId);
      setLandmark(tour, landmark?.id ?? null);
      box = grounding.box;
      point = grounding.point;
    }

    // 2. Guide answers with all recent photos + history.
    const { answerText } = await answerQuestion({
      images: recentFrames(tour),
      question,
      persona,
      language,
      landmark,
      history: tour.history,
      location,
    });

    addHistory(tour, [
      { role: 'user', content: question },
      { role: 'assistant', content: answerText },
    ]);

    const response: AskResponse = {
      box,
      point,
      landmarkId: landmark?.id ?? null,
      answerText,
      audioUrl: null,
    };
    res.json(response);
  } catch (err) {
    console.error('[ask] pipeline failed:', err);
    res.status(502).json({
      error: 'llm_pipeline_failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
