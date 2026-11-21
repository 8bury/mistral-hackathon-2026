import fs from 'node:fs';
import path from 'node:path';

import { repoRoot } from './env';
import { landmarkCatalog, landmarkFact, type Landmark } from './landmarks';
import type { Language, Persona } from '../types';

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(repoRoot(), 'prompts', name), 'utf8');
}

const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', es: 'Spanish' };

/**
 * Grounding agent ("Le Chonk") system prompt: prompts/grounding.md plus the
 * catalog of allowed landmark ids from data/landmarks.json.
 */
export function groundingSystemPrompt(): string {
  return [
    readPrompt('grounding.md'),
    '',
    'Candidate landmarks (only these ids are valid for landmarkId):',
    landmarkCatalog(),
    '',
    'Respond with STRICT JSON only, no prose:',
    '{"landmarkId": string|null, "box_2d": {"x":0,"y":0,"width":0,"height":0}|null, "point_2d": {"x":0,"y":0}|null}',
  ].join('\n');
}

/**
 * Guide agent system prompt: fills the prompts/guide.md template with the
 * persona + language, then appends operational rules (photos,
 * curated facts) and the identified landmark's facts.
 */
export function guideSystemPrompt(opts: {
  persona: Persona;
  language: Language;
  landmark: Landmark | null;
}): string {
  const { persona, language, landmark } = opts;
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
    : 'No landmark was identified in the photo. Describe what you actually see; do not invent a landmark.';

  return [
    base,
    '',
    '---',
    'Operational rules:',
    `- The visitor's photos from this tour are attached to the user message as images. Look at them before answering.`,
    `- Answer in ${LANGUAGE_NAMES[language]} (${language}).`,
    `- Use the curated fact below when it covers the question. For time-sensitive details such as today's opening hours, say that the visitor should verify with the venue's official site.`,
    `- Keep the answer to at most 3 sentences and end with one follow-up question the visitor might ask next.`,
    '',
    factBlock,
  ].join('\n');
}
