import { Request, Response } from 'express';

import { Language, Persona, synthesizeSpeech, voiceFor } from '../voxtral';

const PERSONAS: Persona[] = ['child', 'architect', 'historian'];
const LANGUAGES: Language[] = ['en', 'es'];

/**
 * POST /api/tts
 * Body: { text: string, persona: 'child' | 'architect' | 'historian', language: 'en' | 'es' }
 * Response: audio/mpeg bytes (Voxtral TTS 3, persona voice; child can be a
 * cloned teammate voice via VOICE_ID_CHILD).
 */
export async function ttsRouter(req: Request, res: Response) {
  try {
    const { text, persona, language } = req.body ?? {};
    if (typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'missing_text' });
      return;
    }
    if (!PERSONAS.includes(persona) || !LANGUAGES.includes(language)) {
      res.status(400).json({
        error: 'invalid_persona_or_language',
        personas: PERSONAS,
        languages: LANGUAGES,
      });
      return;
    }
    const mp3 = await synthesizeSpeech(text, voiceFor(persona, language));
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(mp3);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    console.error('[tts]', message);
    res.status(502).json({ error: 'voxtral_tts_failed', detail: message });
  }
}
