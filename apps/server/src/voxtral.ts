/**
 * Voxtral client — Mistral's speech models, called directly over HTTPS.
 *
 *   STT: POST https://api.mistral.ai/v1/audio/transcriptions (multipart)
 *        model: voxtral-mini-transcribe-3 (batch; voxtral-small-transcribe-3 = flagship)
 *   TTS: POST https://api.mistral.ai/v1/audio/speech (JSON)
 *        model: voxtral-mini-tts-3-0, response { audio_data: base64 }
 *
 * Docs: docs.mistral.ai/studio/audio (speech_to_text, text_to_speech)
 */

const API_BASE = 'https://api.mistral.ai/v1';
const STT_MODEL = process.env.VOXTRAL_STT_MODEL ?? 'voxtral-mini-transcribe-3';
const TTS_MODEL = process.env.VOXTRAL_TTS_MODEL ?? 'voxtral-mini-tts-3-0';

export type Persona = 'child' | 'architect' | 'historian';
export type Language = 'en' | 'es';

/**
 * Voxtral 3 preset voices (docs.mistral.ai/studio/audio/text-to-speech/voices).
 * Spanish uses Elena (voice_483) for every persona; English picks per persona.
 * Any entry can be overridden via env — e.g. VOICE_ID_CHILD for the cloned
 * teammate voice once voice cloning is set up in AI Studio.
 */
const PERSONA_VOICES: Record<Language, Record<Persona, string>> = {
  en: {
    child: process.env.VOICE_ID_CHILD ?? 'voice_1786', // Sky, English (UK)
    architect: process.env.VOICE_ID_ARCHITECT ?? 'voice_1788', // David, English (UK)
    historian: process.env.VOICE_ID_HISTORIAN ?? 'voice_3147', // Howard, English (UK)
  },
  es: {
    child: process.env.VOICE_ID_ES ?? 'voice_483', // Elena, Spanish
    architect: process.env.VOICE_ID_ES ?? 'voice_483',
    historian: process.env.VOICE_ID_ES ?? 'voice_483',
  },
};

export function voiceFor(persona: Persona, language: Language): string {
  return PERSONA_VOICES[language][persona];
}

function apiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('MISTRAL_API_KEY is not set');
  return key;
}

async function assertOk(res: Response, what: string): Promise<void> {
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${what} failed: ${res.status} ${detail.slice(0, 500)}`);
  }
}

/** File extension for the upload, derived from the MediaRecorder mime type. */
function extForMime(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  return 'webm';
}

/**
 * Transcribe one utterance (push-to-talk snapshot). Batch is enough —
 * no streaming needed for this app.
 */
export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
  language?: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([audio], { type: mimeType }), `utterance.${extForMime(mimeType)}`);
  form.append('model', STT_MODEL);
  if (language) form.append('language', language); // boosts accuracy

  const res = await fetch(`${API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  await assertOk(res, 'Voxtral STT');
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}

/**
 * Synthesize speech. Returns raw MP3 bytes.
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string,
): Promise<Buffer> {
  const res = await fetch(`${API_BASE}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice_id: voiceId,
      response_format: 'mp3',
    }),
  });
  await assertOk(res, 'Voxtral TTS');
  const data = (await res.json()) as { audio_data?: string };
  if (!data.audio_data) throw new Error('Voxtral TTS returned no audio_data');
  return Buffer.from(data.audio_data, 'base64');
}
