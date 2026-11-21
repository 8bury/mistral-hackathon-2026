import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
// Base64 expands payloads by about a third. The HTTP JSON limit is 35 MiB,
// which leaves room for one 25 MiB source clip plus the rest of the request.
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_FRAMES = 4;
const VIDEO_TYPES = new Map([
  ['video/mp4', 'mp4'],
  ['video/quicktime', 'mov'],
  ['video/webm', 'webm'],
]);

export class VideoInputError extends Error {
  constructor(message: string, readonly status: 413 | 415 | 422) {
    super(message);
  }
}

/**
 * Decode a small client-supplied MP4/MOV/WebM data URL into a handful of
 * 1024px JPEG samples. Vision models receive images, not video containers.
 */
export async function extractVideoFrames(input: unknown): Promise<string[]> {
  if (typeof input !== 'string') throw new VideoInputError('Video must be a base64 data URL.', 415);
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(input.trim());
  if (!match) throw new VideoInputError('Video must be a base64 data URL.', 415);
  const mime = match[1].toLowerCase();
  const ext = VIDEO_TYPES.get(mime);
  if (!ext) throw new VideoInputError('Supported video formats are MP4, MOV (iPhone QuickTime), and WebM.', 415);
  const source = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!source.length) throw new VideoInputError('The uploaded video is empty.', 422);
  if (source.length > MAX_VIDEO_BYTES) {
    throw new VideoInputError('Video is too large for inline analysis (maximum 25 MiB). Trim it to a short clip or upload extracted photos.', 413);
  }
  if (!ffmpegPath) throw new Error('Video frame extraction is unavailable on this server.');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vysta-video-'));
  const inputPath = path.join(tempDir, `source.${ext}`);
  const outputPattern = path.join(tempDir, 'frame-%02d.jpg');
  try {
    await fs.writeFile(inputPath, source);
    await execFileAsync(
      ffmpegPath,
      [
        '-hide_banner', '-loglevel', 'error', '-i', inputPath,
        '-vf', 'fps=1/3,scale=min(1024\\,iw):-2',
        '-frames:v', String(MAX_VIDEO_FRAMES), '-q:v', '3', outputPattern,
      ],
      { timeout: 20_000, maxBuffer: 1_000_000 },
    );
    const files = (await fs.readdir(tempDir)).filter((file) => /^frame-\d+\.jpg$/.test(file)).sort();
    if (!files.length) throw new VideoInputError('No usable frames could be extracted from this video.', 422);
    return Promise.all(files.map(async (file) => `data:image/jpeg;base64,${(await fs.readFile(path.join(tempDir, file))).toString('base64')}`));
  } catch (error) {
    if (error instanceof VideoInputError) throw error;
    throw new VideoInputError('Could not read this video. Try a short MP4 or MOV clip.', 422);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
