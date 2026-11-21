import { Request, Response } from 'express';

/**
 * POST /api/ask
 * Body (contract TBD — packages/shared will own these types):
 *   { frame: base64Jpeg, question: string, persona, language, tourId }
 *   language: 'en' | 'es' — the client sends the concrete language it got
 *   from /api/stt (i.e. 'auto' is already resolved by STT detection).
 * Response:
 *   { box, point, landmarkId, answerText, audioUrl }
 *
 * TODO (agents & knowledge): router agent -> grounding agent (Le Chonk)
 * -> guide agent (persona + language, answers from data/landmarks.json)
 */
export function askRouter(_req: Request, res: Response) {
  res.status(501).json({
    error: 'not_implemented',
    todo: 'wire router -> grounding -> guide agents; see prompts/ and data/landmarks.json',
  });
}
