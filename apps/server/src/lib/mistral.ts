import { Mistral } from '@mistralai/mistralai';

let client: Mistral | null = null;

/** Singleton Mistral client. Throws a clear error if MISTRAL_API_KEY is missing. */
export function mistral(): Mistral {
  if (!client) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not set — copy .env.example to .env at the repo root and fill it in.');
    }
    client = new Mistral({ apiKey });
  }
  return client;
}

/**
 * Model picks per pipeline step. Override via env if a model id is unavailable
 * on your workspace (e.g. MISTRAL_MODEL_GROUNDING=mistral-large-latest).
 */
export const MODELS = {
  /** Cheap text classifier for the router agent. */
  router: process.env.MISTRAL_MODEL_ROUTER ?? 'ministral-8b-latest',
  /**
   * Vision model for the grounding agent (Le Chonk). Medium 3.5 reasons and
   * localises far better than the small models, without stacking two
   * Large-sized calls before every answer. (pixtral-12b-latest is retired and
   * silently served by ministral-14b.)
   */
  grounding: process.env.MISTRAL_MODEL_GROUNDING ?? 'mistral-medium-latest',
  /** Chat model for the guide agent: Mistral Large 4, the flagship. */
  guide: process.env.MISTRAL_MODEL_GUIDE ?? 'mistral-large-latest',
} as const;

/** Content may be a string or an array of chunks; keep only real text chunks. */
export function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text')
      .map((c) => String((c as { text: unknown }).text))
      .join('');
  }
  return '';
}

