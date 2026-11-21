import { MODELS, mistral } from '../lib/mistral';
import { matchLandmark } from '../lib/landmarks';
import { groundingSystemPrompt } from '../lib/prompts';
import type { Box2D, Point2D, UserLocation } from '../types';

export interface GroundingResult {
  landmarkId: string | null;
  box: Box2D | null;
  point: Point2D | null;
  /** Raw model output, for debugging / the test-grounding scorer. */
  raw: string;
}

function clamp(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(1000, Math.max(0, v));
}

/** Extract the first JSON object from a model response (defensive against prose). */
function extractJson(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseBox(v: unknown): Box2D | null {
  if (typeof v !== 'object' || v === null) return null;
  const b = v as Record<string, unknown>;
  if (![b.x, b.y, b.width, b.height].every((n) => typeof n === 'number')) return null;
  return { x: clamp(b.x), y: clamp(b.y), width: clamp(b.width), height: clamp(b.height) };
}

function parsePoint(v: unknown): Point2D | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
  return { x: clamp(p.x), y: clamp(p.y) };
}

/**
 * Le Chonk: send one photo + the user's question to the vision model and get
 * back a grounded landmark id + normalized box/point (0..1000).
 * When `location` is known, the system prompt lists nearby landmarks with
 * distances and asks the model to prefer them (all candidates stay valid).
 */
export async function groundFrame(
  imageDataUrl: string,
  question: string,
  location?: UserLocation | null,
): Promise<GroundingResult> {
  const res = await mistral().chat.complete({
    model: MODELS.grounding,
    temperature: 0,
    maxTokens: 300,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: groundingSystemPrompt(location) },
      {
        role: 'user',
        content: [
          { type: 'image_url', imageUrl: imageDataUrl },
          {
            type: 'text',
            text: `The visitor asks: "${question}". Identify the landmark in the photo and return STRICT JSON only, per the system instructions.`,
          },
        ],
      },
    ],
  });

  // SDK v3: choices[0].message, or choices[0].messages[0] when tools were involved.
  const choice = res.choices[0] as unknown as { message?: { content?: unknown }; messages?: Array<{ content?: unknown }> };
  const content = choice?.message?.content ?? choice?.messages?.[0]?.content;
  const raw = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  const parsed = extractJson(raw);

  const landmark = parsed ? matchLandmark(parsed.landmarkId as string | null) : null;
  return {
    landmarkId: landmark?.id ?? null,
    box: parsed ? parseBox(parsed.box_2d) : null,
    point: parsed ? parsePoint(parsed.point_2d) : null,
    raw,
  };
}
