# Vysta

Voice-asked, visually grounded city guide for the City of London (hackathon project). Point your
camera at a landmark (e.g. a dragon boundary marker), ask a question by
voice, get a spoken answer in your persona and language — with the exact spot
highlighted on the frozen frame.

## Layout

```
apps/web/            Vite + React PWA: camera, push-to-talk, box/point overlay, persona + language picker
apps/server/         Express API: /api/ask, /api/stt, /api/tts, /api/recap (stubs for now)
prompts/             Agent prompts (router, grounding, guide personas)
data/landmarks.json  Curated fact file for demo landmarks
test-grounding/      Photo set + scoring harness for point_2d/box_2d reliability
docs/                Pitch script, slides, demo runbook
```

> `packages/shared` (the JSON contract) is intentionally not created yet —
> it's the first thing to agree on as a team. Until then, request/response
> types are local placeholders in `apps/web/src/api.ts` and the server routes.

## Run

```bash
npm install
cp .env.example .env   # add MISTRAL_API_KEY when wiring real APIs
npm run dev:server     # http://localhost:3001
npm run dev:web        # http://localhost:5173 (proxies /api to the server)
```

The web app mocks `/api/ask` and `/api/stt` by default (`VITE_MOCK_API=true`)
so the frontend is never blocked on the backend. Set it to `false` to hit the
real server.

On a real phone, serve over HTTPS (ngrok / Cloudflare Tunnel) — camera APIs
require a secure context.

