// API client for the AI City Guide backend.
//
// NOTE: packages/shared (the single source of truth for the JSON contract)
// is intentionally not created yet. The types below are local placeholders —
// when the team agrees the contract, move them to packages/shared and import
// from there in both web and server.

export type Persona = 'child' | 'architect' | 'historian';
/** Language of the interface and its currently available translations. */
export type Language = 'en' | 'es';
/** `auto` follows the language of the visitor's latest question. */
export type AnswerLanguage = Language | 'auto' | string;

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

/** Latest GPS fix from the device; accuracy is the estimated radius in metres. */
export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface AskRequest {
  frame?: string; // optional after the first question in a tour
  question: string;
  persona: Persona;
  /** Omit or send auto to follow the visitor's question language. */
  language?: AnswerLanguage;
  tourId: string;
  /** Latest GPS fix when the device granted location; null/absent otherwise. */
  location?: UserLocation | null;
}

export interface AskResponse {
  box: Box2D | null;
  point: Point2D | null;
  landmarkId: string | null;
  answerText: string;
  audioUrl: string | null;
}

// Mocks are OFF by default — opt in with VITE_MOCK_API=true.
const MOCK = import.meta.env.VITE_MOCK_API === 'true';
// Mock only /api/ask (agents not wired yet) while STT/TTS hit the real server.
const MOCK_ASK = MOCK || import.meta.env.VITE_MOCK_ASK === 'true';
// Empty = same origin (prod container, or the Vite dev proxy).
const API_URL = import.meta.env.VITE_API_URL ?? '';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Audio blob -> transcript text. `language` is the UI language, used by Voxtral to boost accuracy. */
export async function speechToText(audio: Blob, language?: Language): Promise<string> {
  if (MOCK) {
    await delay(600);
    return 'Why is the dragon holding a shield?';
  }
  const query = language ? `?language=${encodeURIComponent(language)}` : '';
  const res = await fetch(`${API_URL}/api/stt${query}`, {
    method: 'POST',
    headers: { 'Content-Type': audio.type || 'application/octet-stream' },
    body: audio,
  });
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  return (await res.json()).text;
}

/**
 * Text -> spoken answer as a playable object URL (Voxtral TTS, persona voice).
 * Returns null in mock mode so the frontend stays offline-capable.
 */
export async function textToSpeech(
  text: string,
  persona: Persona,
  language: Language,
): Promise<string | null> {
  if (MOCK) return null;
  const res = await fetch(`${API_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, persona, language }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Frame + question -> grounded answer. */
// Mock: each new camera frame is "the next landmark on the walk", so the
// route on the map has more than one stop. Follow-ups on the same frame stay put.
const MOCK_WALK = ['dragon-boundary', 'st-pauls', 'leadenhall-market'] as const;
let mockFrame = '';
let mockStep = -1;

export async function ask(req: AskRequest): Promise<AskResponse> {
  if (MOCK_ASK) {
    await delay(900);
    const frame = req.frame ?? '';
    if (frame !== mockFrame) {
      mockFrame = frame;
      mockStep = (mockStep + 1) % MOCK_WALK.length;
    }
    const landmarkId = MOCK_WALK[mockStep];
    return {
      box: { x: 380, y: 300, width: 260, height: 320 },
      point: null,
      landmarkId,
      answerText: landmarkId === 'dragon-boundary' ? mockAnswer(req.persona, mockLanguage(req.language)) : MOCK_FACTS[landmarkId][mockLanguage(req.language)],
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

const MOCK_FACTS: Record<string, Record<Language, string>> = {
  'st-pauls': {
    en: "Sir Christopher Wren designed St Paul's after the Great Fire of 1666. Its dome was the tallest in London for 300 years.",
    es: 'Sir Christopher Wren diseñó San Pablo tras el Gran Incendio de 1666. Su cúpula fue la más alta de Londres durante 300 años.',
  },
  'leadenhall-market': {
    en: 'Leadenhall Market opened in 1881. Sir Horace Jones designed its iron and glass roof.',
    es: 'El mercado de Leadenhall abrió en 1881. Sir Horace Jones diseñó su cubierta de hierro y vidrio.',
  },
};

export interface RecapStop {
  landmarkId: string | null;
  question: string;
  answerText: string;
}

/** Walk recap. The server route is still a 501 stub, so mock mode builds one locally. */
export async function recap(tourId: string, stops: RecapStop[], language: Language): Promise<string> {
  if (MOCK_ASK) {
    await delay(700);
    const places = [...new Set(stops.map((s) => s.landmarkId).filter(Boolean))].length;
    return language === 'es'
      ? `Has visitado ${places} lugar(es) e hiciste ${stops.length} pregunta(s). Tu última parada respondió: «${stops.at(-1)?.answerText ?? ''}»`
      : `You visited ${places} place(s) and asked ${stops.length} question(s). Your last stop answered: "${stops.at(-1)?.answerText ?? ''}"`;
  }
  const res = await fetch(`${API_URL}/api/recap/${encodeURIComponent(tourId)}`);
  if (!res.ok) throw new Error(`Recap failed: ${res.status}`);
  const data = await res.json();
  return typeof data === 'string' ? data : (data.recap ?? JSON.stringify(data));
}

function mockAnswer(persona: Persona, language: Language): string {
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

function mockLanguage(language: AnswerLanguage | undefined): Language {
  return language === 'es' ? 'es' : 'en';
}
