// API client for the AI City Guide backend.
//
// NOTE: packages/shared (the single source of truth for the JSON contract)
// is intentionally not created yet. The types below are local placeholders —
// when the team agrees the contract, move them to packages/shared and import
// from there in both web and server.

export type Persona = 'child' | 'architect' | 'historian';
/** 'auto' = let the STT engine detect the spoken language. */
export type Language = 'auto' | 'en' | 'es';
/** A concrete language — what 'auto' resolves to after STT detection. */
export type DetectedLanguage = Exclude<Language, 'auto'>;

/** Normalized 0..1000, Le Chonk convention. */
export interface Box2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface AskRequest {
  frame: string; // base64 JPEG snapshot captured at push-to-talk
  question: string;
  persona: Persona;
  language: Language;
  tourId: string;
}

export interface AskResponse {
  box: Box2D | null;
  point: Point2D | null;
  landmarkId: string | null;
  answerText: string;
  audioUrl: string | null;
}

const MOCK = import.meta.env.VITE_MOCK_API !== 'false';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SttResult {
  text: string;
  /** Concrete language — detected server-side when language === 'auto'. */
  language: DetectedLanguage;
}

/** Audio blob -> transcript + resolved language (autodetect when 'auto'). */
export async function speechToText(audio: Blob, language: Language): Promise<SttResult> {
  if (MOCK) {
    await delay(600);
    // Mock detection: pretend the engine heard English or Spanish at random.
    const detected: DetectedLanguage =
      language === 'auto' ? (Math.random() < 0.5 ? 'en' : 'es') : language;
    return {
      text:
        detected === 'es'
          ? '¿Por qué el dragón sostiene un escudo?'
          : 'Why is the dragon holding a shield?',
      language: detected,
    };
  }
  const res = await fetch(`${API_URL}/api/stt?lang=${language}`, {
    method: 'POST',
    headers: { 'Content-Type': audio.type || 'application/octet-stream' },
    body: audio,
  });
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  return res.json();
}

/** Frame + question -> grounded answer. */
export async function ask(req: AskRequest): Promise<AskResponse> {
  if (MOCK) {
    await delay(900);
    return {
      box: { x: 380, y: 300, width: 260, height: 320 },
      point: null,
      landmarkId: 'dragon-boundary',
      answerText: mockAnswer(req.persona, req.language),
      audioUrl: null,
    };
  }
  const res = await fetch(`${API_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Ask failed: ${res.status}`);
  return res.json();
}

function mockAnswer(persona: Persona, language: Language): string {
  // 'auto' is resolved to a concrete language via STT before ask() is called;
  // if it ever arrives here, fall through to the English answers.
  if (language === 'es') {
    return {
      child: '¡Mira! El dragón sostiene un escudo porque protege la City de Londres.',
      architect: 'El dragón sostiene un escudo: es el emblema heráldico de la City of London.',
      historian: 'Este dragón es el guardián de la City; el escudo recuerda su patronazgo histórico.',
    }[persona];
  }
  return {
    child: 'Look! The dragon is holding a shield because it guards the City of London!',
    architect: 'The dragon holds a shield — it is the heraldic emblem of the City of London.',
    historian: 'This dragon is the guardian of the City; the shield recalls its historic patronage.',
  }[persona];
}
