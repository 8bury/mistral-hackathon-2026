import { Request, Response } from 'express';

/**
 * POST /api/stt?lang=en|es|auto  (raw audio body, e.g. webm/opus from
 * MediaRecorder, parsed by express.raw in index.ts -> req.body is a Buffer)
 *
 * lang=auto (the default when omitted) lets the STT engine detect the
 * spoken language instead of forcing one.
 *
 * Response: { text: string, language: 'en' | 'es' }
 *   `language` is the resolved concrete language — detected when lang=auto,
 *   echoed back otherwise. The client forwards it to /api/ask so the guide
 *   answers in the language the visitor actually spoke.
 *
 * TODO (voice): Voxtral speech-to-text. Batch per utterance is enough —
 * the app uses push-to-talk snapshots, not streaming.
 */
export function sttRouter(_req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', todo: 'Voxtral STT' });
}
