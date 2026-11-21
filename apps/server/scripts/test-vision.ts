/**
 * Prototype smoke test — run: npm run test:vision --workspace=apps/server
 *
 *   A. API key works (models.list)
 *   B. Vision model sees a photo and describes it
 *   C. Grounding agent: photo + question -> { landmarkId, box_2d, point_2d } JSON
 *   D. Guide agent: tour-guide system prompt + photo + question -> answerText
 *
 * Uses the first photo in test-grounding/photos/ if present, otherwise a
 * synthetic PNG generated locally.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { answerQuestion } from '../src/agents/guide';
import { groundFrame } from '../src/agents/grounding';
import { loadEnv, repoRoot } from '../src/lib/env';
import { MODELS, mistral } from '../src/lib/mistral';
import { findLandmarkById } from '../src/lib/landmarks';

loadEnv();

// ---------- tiny PNG encoder (no deps) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
/** 256x192: blue sky, green ground, red circle with eyes (a "dragon" doodle). */
function makeSyntheticPng(): Buffer {
  const w = 256;
  const h = 192;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  const cx = 128;
  const cy = 96;
  const r = 48;
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      let rgb: [number, number, number] = y < h * 0.6 ? [70, 130, 200] : [60, 140, 70];
      if (Math.hypot(x - cx, y - cy) < r) rgb = [200, 40, 40];
      if (Math.hypot(x - (cx - 16), y - (cy - 12)) < 8) rgb = [255, 255, 255];
      if (Math.hypot(x - (cx + 16), y - (cy - 12)) < 8) rgb = [255, 255, 255];
      const o = row + 1 + x * 3;
      raw[o] = rgb[0];
      raw[o + 1] = rgb[1];
      raw[o + 2] = rgb[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- test ----------
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function main(): Promise<void> {
  console.log(`repo root: ${repoRoot()}`);
  console.log(`models: grounding=${MODELS.grounding} guide=${MODELS.guide}\n`);

  // A. key
  const models = await mistral().models.list();
  check('A. MISTRAL_API_KEY works (models.list)', (models.data ?? []).length > 0, `${(models.data ?? []).length} models`);

  // test image
  const photosDir = path.join(repoRoot(), 'test-grounding', 'photos');
  const real = fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
  let imageDataUrl: string;
  if (real.length > 0) {
    const buf = fs.readFileSync(path.join(photosDir, real[0]));
    const mime = real[0].toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    imageDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    console.log(`test image: test-grounding/photos/${real[0]}`);
  } else {
    imageDataUrl = `data:image/png;base64,${makeSyntheticPng().toString('base64')}`;
    console.log('test image: synthetic PNG (drop real photos into test-grounding/photos/ to test grounding)');
  }
  console.log();

  // B. vision describe
  const describe = await mistral().chat.complete({
    model: MODELS.grounding,
    maxTokens: 120,
    messages: [
      { role: 'system', content: 'You are a concise vision assistant. Describe the image in one or two sentences.' },
      { role: 'user', content: [{ type: 'image_url', imageUrl: imageDataUrl }, { type: 'text', text: "What's in this image?" }] },
    ],
  });
  const describeChoice = describe.choices[0] as any;
  const describeText = String(describeChoice?.message?.content ?? describeChoice?.messages?.[0]?.content ?? '');
  console.log(`B. vision describe: "${describeText.slice(0, 140)}"`);
  check('B. vision model saw the photo', describeText.trim().length > 10);

  // C. grounding
  const grounding = await groundFrame(imageDataUrl, 'what is this?');
  console.log(`C. grounding: landmarkId=${grounding.landmarkId} box=${JSON.stringify(grounding.box)} point=${JSON.stringify(grounding.point)}`);
  check('C. grounding returned parseable JSON', grounding.raw.includes('{'));
  check('C. landmarkId valid or null', grounding.landmarkId === null || findLandmarkById(grounding.landmarkId) !== null);

  // D. guide with system prompt + photo
  const guide = await answerQuestion({
    images: [imageDataUrl],
    question: 'What is in this photo? Tell me one fun thing about it.',
    persona: 'child',
    language: 'en',
    landmark: grounding.landmarkId ? findLandmarkById(grounding.landmarkId) : null,
    history: [],
  });
  console.log(`D. guide answer: "${guide.answerText.slice(0, 300)}"`);
  check('D. guide answered from system prompt + photo', guide.answerText.trim().length > 10);

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('test crashed:', String(err).slice(0, 800));
  process.exit(1);
});
