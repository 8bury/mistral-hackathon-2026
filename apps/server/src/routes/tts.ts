import { Request, Response } from 'express';

/**
 * POST /api/tts
 * Body: { text: string, persona: 'child' | 'architect' | 'historian', language: 'en' | 'es' }
 *   ('auto' is resolved to a concrete language by /api/stt before this call)
 * Response: audio/mpeg (Voxtral TTS, persona voice; child = cloned teammate voice)
 */
export function ttsRouter(_req: Request, res: Response) {
  res.status(501).json({ error: 'not_implemented', todo: 'Voxtral TTS with persona voices' });
}
