// API client for the AI City Guide backend.
//
// NOTE: packages/shared (the single source of truth for the JSON contract)
// is intentionally not created yet. The types below are local placeholders —
// when the team agrees the contract, move them to packages/shared and import
// from there in both web and server.

export type Persona = 'child' | 'architect' | 'historian' | 'generic';
export type Language = 'en' | 'es' | 'fr' | 'de';

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

/** Audio blob -> transcript text. */
export async function speechToText(audio: Blob): Promise<string> {
  if (MOCK) {
    await delay(600);
    return 'Why is the dragon holding a shield?';
  }
  const res = await fetch(`${API_URL}/api/stt`, {
    method: 'POST',
    headers: { 'Content-Type': audio.type || 'application/octet-stream' },
    body: audio,
  });
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  return (await res.json()).text;
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

const MOCK_LINES: Record<Language, Record<Persona, string>> = {
  en: {
    child: 'Look! The dragon is holding a shield because it guards the City of London!',
    architect: 'The dragon holds a shield — it is the heraldic emblem of the City of London.',
    historian: 'This dragon is the guardian of the City; the shield recalls its historic patronage.',
    generic: 'Noted. The dragon boundary marker marks where the historic City begins.',
  },
  es: {
    child: '¡Mira! El dragón sostiene un escudo porque protege la City de Londres.',
    architect: 'El dragón sostiene un escudo: es el emblema heráldico de la City of London.',
    historian: 'Este dragón es el guardián de la City; el escudo recuerda su patronazgo histórico.',
    generic: 'Entendido. El mojón del dragón marca dónde comienza la City histórica.',
  },
  fr: {
    child: 'Regarde ! Le dragon tient un bouclier parce qu’il garde la City de Londres !',
    architect: 'Le dragon porte un bouclier — c’est l’emblème héraldique de la City de Londres.',
    historian: 'Ce dragon est le gardien de la City ; le bouclier rappelle son patronage historique.',
    generic: 'Noté. Le marqueur au dragon indique où commence la City historique.',
  },
  de: {
    child: 'Schau! Der Drache hält ein Schild, weil er die City of London beschützt!',
    architect: 'Der Drache trägt ein Schild — das Wappen der City of London.',
    historian: 'Dieser Drache ist der Wächter der City; das Schild erinnert an ihren historischen Schutz.',
    generic: 'Verstanden. Der Drachen-Grenzstein markiert den Beginn der historischen City.',
  },
};

function mockAnswer(persona: Persona, language: Language): string {
  return MOCK_LINES[language][persona];
}
