import { Request, Response } from 'express';

/**
 * GET /api/recap/:tourId
 * Response: { stops: [{ landmarkId, photo, facts, answerText }], ... }
 *
 * TODO (agents & knowledge): post-walk "your tour" recap workflow,
 * persisted to a JSON file per tour.
 */
export function recapRouter(_req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', todo: 'tour recap workflow' });
}
