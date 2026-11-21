import cors from 'cors';
import express from 'express';

import { loadEnv } from './lib/env';
import { askRouter } from './routes/ask';
import { docsRouter } from './routes/docs';
import { recapRouter } from './routes/recap';
import { sttRouter } from './routes/stt';
import { ttsRouter } from './routes/tts';

// Loads .env from cwd AND from the repo root (workspace scripts run with cwd=apps/server).
loadEnv();

const app = express();

app.use(cors());
// Frames arrive as base64 JPEGs — allow generous payloads.
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-city-guide-server' });
});

app.get('/docs', docsRouter);

app.post('/api/ask', askRouter); // frame + question -> box/point + answer + audioUrl
// STT receives a raw audio body (MediaRecorder blob), not JSON.
app.post('/api/stt', express.raw({ type: '*/*', limit: '15mb' }), sttRouter);
app.post('/api/tts', ttsRouter); // text + persona voice -> audio (Voxtral TTS)
app.get('/api/recap/:tourId', recapRouter); // tour recap workflow

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
