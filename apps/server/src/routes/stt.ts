import { Request, Response } from 'express';

/**
 * POST /api/stt  (raw audio body, e.g. webm/opus from MediaRecorder,
 * parsed by express.raw in index.ts -> req.body is a Buffer)
 * Response: { text: string }
 *
 * TODO (voice): Voxtral speech-to-text. Batch per utterance is enough —
 * the app uses push-to-talk snapshots, not streaming.
 */
export function sttRouter(_req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', todo: 'Voxtral STT' });
}
