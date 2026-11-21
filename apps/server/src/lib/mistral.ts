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
 * on your workspace (e.g. MISTRAL_MODEL_GROUNDING=pixtral-12b-2409).
 */
export const MODELS = {
  /** Cheap text classifier for the router agent. */
  router: process.env.MISTRAL_MODEL_ROUTER ?? 'ministral-8b-latest',
  /** Vision model for the grounding agent (Le Chonk). */
  grounding: process.env.MISTRAL_MODEL_GROUNDING ?? 'pixtral-12b-latest',
  /** Chat model for the guide agent. */
  guide: process.env.MISTRAL_MODEL_GUIDE ?? 'mistral-large-latest',
} as const;
