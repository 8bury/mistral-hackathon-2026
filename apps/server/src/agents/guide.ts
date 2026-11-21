import { MODELS, mistral } from '../lib/mistral';
import type { Landmark } from '../lib/landmarks';
import { guideSystemPrompt } from '../lib/prompts';
import type { HistoryEntry } from '../lib/store';
import type { Language, Persona, UserLocation } from '../types';

export interface GuideInput {
  /** Data URLs of the tour's recent photos, oldest first. */
  images: string[];
  question: string;
  persona: Persona;
  language: Language;
  landmark: Landmark | null;
  history: HistoryEntry[];
  /** Visitor's GPS fix, when known — gives the guide an orientation hint. */
  location?: UserLocation | null;
}

export interface GuideResult {
  answerText: string;
}

/** Content may be a string or an array of chunks; keep only real text chunks. */
function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text')
      .map((c) => String((c as { text: unknown }).text))
      .join('');
  }
  return '';
}

/**
 * Guide agent (prototype): tour-guide system prompt (persona + language) +
 * the visitor's photos + short history + the question, in ONE model call.
 * Web-search tool loop is a later step — keep the prototype simple.
 */
export async function answerQuestion(input: GuideInput): Promise<GuideResult> {
  const { images, question, persona, language, landmark, history, location } = input;

  const userContent = [
    ...images.map((url) => ({ type: 'image_url' as const, imageUrl: url })),
    { type: 'text' as const, text: question },
  ];

  const res = await mistral().chat.complete({
    model: MODELS.guide,
    temperature: 0.7,
    maxTokens: 500,
    // mistral-large reasons by default and can starve the text chunk — keep it low.
    reasoningEffort: 'low',
    messages: [
      { role: 'system', content: guideSystemPrompt({ persona, language, landmark, location }) },
      // Filter legacy/previously stored blank entries as well as new ones.
      ...history.filter((h) => h.content.trim().length > 0).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: userContent },
    ],
  });

  // SDK v3: choices[0].message, or choices[0].messages[0] in some response shapes.
  const choice = res.choices[0] as unknown as {
    message?: { content?: unknown };
    messages?: Array<{ content?: unknown }>;
  };
  const answerText = contentToText(choice?.message?.content ?? choice?.messages?.[0]?.content).trim();
  if (!answerText) {
    throw new Error('Guide model returned no text response; please retry the request.');
  }
  return { answerText };
}
