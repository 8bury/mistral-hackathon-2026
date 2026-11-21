import { contentToText, MODELS, mistral } from '../lib/mistral';
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

/** Mistral may expose a single `message` or a sequence in `messages`. */
function choiceToText(choice: { message?: { content?: unknown }; messages?: Array<{ content?: unknown }> }): string {
  const contents = [choice.message, ...(choice.messages ?? [])]
    .filter((message): message is { content?: unknown } => !!message)
    .map((message) => contentToText(message.content))
    .filter(Boolean);
  return contents.join('\n').trim();
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

  const attempt = async (retry: boolean) => {
    const res = await mistral().chat.complete({
      model: MODELS.guide,
      // Low variance plus a fixed seed keeps repeated questions stable while
      // the message history still lets genuine follow-ups evolve naturally.
      temperature: 0.2,
      randomSeed: retry ? 43 : 42,
      // Reasoning shares this budget with the answer: measured answers use up to
      // ~700 tokens, so 500 cut them off mid-sentence. The retry gets more room.
      maxTokens: retry ? 3000 : 1500,
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
      finishReason?: string;
    };
    return { text: choiceToText(choice ?? {}), truncated: choice?.finishReason === 'length' };
  };

  let { text: answerText, truncated } = await attempt(false);
  if (!answerText || truncated) {
    console.warn(`[guide] ${answerText ? 'truncated' : 'empty'} model response, retrying once`);
    const second = await attempt(true);
    // Prefer the retry; keep a cut-off first answer only if the retry came back empty.
    if (second.text) answerText = second.text;
  }
  if (!answerText) {
    throw new Error('Guide model returned no text response; please retry the request.');
  }
  return { answerText };
}
