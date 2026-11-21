import fs from 'node:fs';
import path from 'node:path';

import { repoRoot } from './env';
import { landmarkCatalog, landmarkFact, landmarksByDistance, type Landmark } from './landmarks';
import type { Language, Persona, UserLocation } from '../types';

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(repoRoot(), 'prompts', name), 'utf8');
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', es: 'Spanish', zh: 'Chinese', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean' };

/** Landmarks within this radius of the visitor count as "nearby" for grounding. */
const NEARBY_BASE_RADIUS_M = 500;
/** Cap so a very poor fix (e.g. wifi-only, several km) doesn't make everything "nearby". */
const NEARBY_MAX_RADIUS_M = 1500;

/**
 * Grounding agent ("Le Chonk") system prompt: prompts/grounding.md plus the
 * catalog of allowed landmark ids from data/landmarks.json. When the visitor's
 * GPS fix is known, nearby landmarks (with distances) are listed so the model
 * can prefer them — the full catalog stays valid regardless.
 */
export function groundingSystemPrompt(location?: UserLocation | null): string {
  const parts = [
    readPrompt('grounding.md'),
    '',
    'Candidate landmarks (only these ids are valid for landmarkId):',
    landmarkCatalog(),
  ];

  if (location) {
    const radiusM = Math.min(NEARBY_BASE_RADIUS_M + location.accuracy, NEARBY_MAX_RADIUS_M);
    const nearby = landmarksByDistance(location).filter((entry) => entry.distanceM <= radiusM);
    if (nearby.length > 0) {
      parts.push(
        '',
        `The visitor's GPS fix is known (accuracy about ${Math.round(location.accuracy)} m). Landmarks within ${Math.round(radiusM)} m, nearest first:`,
        ...nearby.map((entry) => `- ${entry.landmark.id} | ${entry.landmark.name} | ${Math.round(entry.distanceM)} m away`),
        'Prefer a nearby landmark when the photo plausibly matches it, but every candidate id above remains valid — a bad GPS fix must not make identification impossible.',
      );
    }
  }

  parts.push(
    '',
    'Respond with STRICT JSON only, no prose:',
    '{"landmarkId": string|null, "box_2d": {"x":0,"y":0,"width":0,"height":0}|null, "point_2d": {"x":0,"y":0}|null}',
  );
  return parts.join('\n');
}

/** Line that separates the spoken answer from the suggested follow-up questions. */
export const FOLLOW_UPS_MARKER = 'FOLLOW_UPS:';

/**
 * Guide agent system prompt: fills the prompts/guide.md template with the
 * persona + language, then appends operational rules (photos,
 * curated facts) and the identified landmark's facts.
 */
export function guideSystemPrompt(opts: {
  persona: Persona;
  language: Language;
  landmark: Landmark | null;
  location?: UserLocation | null;
}): string {
  const { persona, language, landmark, location } = opts;
  const base = readPrompt('guide.md')
    .replaceAll('{{persona}}', persona)
    .replaceAll('{{language}}', language)
    .replaceAll('{{landmarkId}}', landmark?.id ?? 'none');

  const fact = landmarkFact(landmark, language);
  const factBlock = landmark
    ? [
        `Identified landmark: ${landmark.name} (id: ${landmark.id}).`,
        fact ? `Curated fact (${language}): ${fact}` : 'No curated fact in this language — use the English fact if it helps.',
      ].join('\n')
    : [
        'None of the curated landmarks was matched in the photo, so you have no curated fact.',
        'Identify it yourself from the photo, your own knowledge and the location hint, and name it with confidence the way a real guide would: "This is St Bride\'s Church", never "this resembles a church" or "this looks like it could be…".',
        'Commit to your best answer. Only if you genuinely cannot decide between specific places, add a brief hedge — and still name the one you think it is.',
        'Do not reply that you cannot identify it from the image alone. Only if the photo is genuinely unreadable, say what you can see and ask for a clearer or closer shot.',
      ].join('\n');

  // Short orientation hint from the visitor's GPS fix; distances only, never raw coordinates.
  let locationBlock = '';
  if (location) {
    const nearest = landmarksByDistance(location)[0];
    // Only when actually close — "8000 m from St Paul's" would just confuse the guide.
    if (nearest && nearest.distanceM <= NEARBY_MAX_RADIUS_M) {
      locationBlock = [
        `Visitor location hint: the visitor appears to be about ${Math.round(nearest.distanceM)} m from ${nearest.landmark.name} (the nearest known landmark).`,
        'You may use this to orient the answer, but the photo remains the source of truth for what the visitor is looking at.',
      ].join('\n');
    }
  }

  return [
    base,
    '',
    '---',
    'Operational rules:',
    `- The visitor's photos from this tour are attached to the user message as images. Look at them before answering.`,
    language === 'auto'
      ? `- Detect the language of the visitor's latest question and reply in that same language. If the visitor explicitly asks for a different answer language (for example, "answer in Chinese"), honor that request. Do not mention language detection.`
      : `- Answer in ${LANGUAGE_NAMES[language] ?? language} (${language}). If the visitor asks in a different language, follow their requested language when it is unambiguous.`,
    `- Use the curated fact below when it covers the question. For time-sensitive details such as today's opening hours, say that the visitor should verify with the venue's official site.`,
    `- Keep the answer to at most 3 sentences. Do not end the answer with a question to the visitor.`,
    `- After the answer, write a line containing only "${FOLLOW_UPS_MARKER}" and then exactly 3 short questions the visitor might tap to ask you next, one per line, each starting with "- ". Write them in the answer's language, in the visitor's voice (e.g. "Who designed it?"), at most 8 words each, matching your persona's interests. Base them on what you just said or on what the photo shows that you have not covered yet; never repeat a question already asked. They are shown as buttons, not read aloud.`,
    '',
    factBlock,
    ...(locationBlock ? ['', locationBlock] : []),
  ].join('\n');
}
