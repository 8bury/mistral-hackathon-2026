import { Request, Response } from 'express';

import { transcribeAudio } from '../voxtral';

/**
 * POST /api/stt?language=en  (raw audio body, e.g. webm/opus from MediaRecorder,
 * parsed by express.raw in index.ts -> req.body is a Buffer)
 * Response: { text: string }
 *
 * Voxtral STT (voxtral-mini-latest). Batch per utterance — the app uses
 * push-to-talk snapshots, not streaming. `language` is the UI language and
 * only boosts accuracy; Voxtral auto-detects otherwise.
 */
export async function sttRouter(req: Request, res: Response) {
  try {
    const audio = req.body as Buffer;
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      res.status(400).json({ error: 'empty_audio', todo: 'POST a raw audio body' });
      return;
    }
    const mime = String(req.headers['content-type'] ?? 'audio/webm');
    const language = typeof req.query.language === 'string' ? req.query.language : undefined;
    const text = await transcribeAudio(audio, mime, language);
    res.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[stt]', message);
    res.status(502).json({ error: 'voxtral_stt_failed', detail: message });
  }
}
