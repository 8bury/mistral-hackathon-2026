import { Request, Response } from 'express';

import { answerQuestion } from '../agents/guide';
import { groundFrame } from '../agents/grounding';
import { findLandmarkById } from '../lib/landmarks';
import { addFrames, addHistory, getTour, recentFrames } from '../lib/store';
import { normalizeDataUrl, type AskRequest, type AskResponse } from '../types';

/**
 * POST /api/ask
 * Body: { frame: base64Jpeg (data URL or raw base64), question, persona, language, tourId, frames?: string[] }
 * Response: { box, point, landmarkId, answerText, audioUrl }
 *
 * Pipeline: accumulate the tour's photos -> grounding agent (Le Chonk, vision)
 * -> guide agent (persona + language, photos + history).
 * audioUrl stays null until the TTS route is wired.
 */
export async function askRouter(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Partial<AskRequest>;
    const frame = normalizeDataUrl(body.frame);
    const question = (body.question ?? '').trim();
    const persona = body.persona ?? 'child';
    const language = body.language ?? 'en';
    const tourId = body.tourId ?? 'anonymous';

    if (!frame) {
      res.status(400).json({ error: 'missing_frame', message: 'frame must be a base64 JPEG (data URL or raw base64)' });
      return;
    }
    if (!question) {
      res.status(400).json({ error: 'missing_question' });
      return;
    }

    const tour = getTour(tourId);
    const extra = Array.isArray(body.frames) ? body.frames.map(normalizeDataUrl).filter((f): f is string => !!f) : [];
    addFrames(tour, [frame, ...extra]);

    // 1. Ground the latest frame against the curated landmark set.
    const grounding = await groundFrame(frame, question);
    const landmark = findLandmarkById(grounding.landmarkId);

    // 2. Guide answers with all recent photos + history.
    const { answerText } = await answerQuestion({
      images: recentFrames(tour),
      question,
      persona,
      language,
      landmark,
      history: tour.history,
    });

    addHistory(tour, [
      { role: 'user', content: question },
      { role: 'assistant', content: answerText },
    ]);

    const response: AskResponse = {
      box: grounding.box,
      point: grounding.point,
      landmarkId: grounding.landmarkId,
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
