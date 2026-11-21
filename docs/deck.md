# Vysta — hackathon deck

Voice-asked, visually grounded city guide. Point your camera at a landmark, ask out
loud, get a spoken answer — with the exact spot highlighted on screen.

Slide format: markdown, `---` between slides. Paste into Google Slides / reveal.js /
Marp as-is.

---

## 1 — Title

# 🗺️ Vysta
### The city that answers back — point, ask, listen, see exactly what it means

*H fordern — Mistral Hackathon 2026*
Mobile web PWA · iOS Safari & Android Chrome · City of London pilot

---

## 2 — The problem (WHY)

- Tourists stare at buildings and guess. Guidebooks are walls of text; audio tours are
  passive and off-topic.
- **"What is that carving? When was it built? Who is it for?"** — the questions people
  actually have in the street.
- Existing tools: Google Lens answers with text cards; audio guides don't show *where*.
  Nobody combines **voice question + spoken answer + visual highlight on the exact spot**.

---

## 3 — The product (WHAT)

**Vysta** — a personalised, voice-driven tour guide that lives in your phone's browser.

1. Open the app → live camera fills the screen
2. **Hold the mic**, ask a question out loud
3. Release → frame freezes, the answer's target is **highlighted (box + pulsing point)**
4. Answer appears as a caption **and is spoken aloud**
5. Ask follow-ups about the same scene; end with a **shareable tour recap**

> Demo line: *"What's that dragon above the door?"* → the dragon lights up on screen and
> the guide tells you why it's there.

---

## 4 — Personalisation

| Lever | Options | Effect |
|---|---|---|
| Persona | 🧒 Child · 🏛️ Architect · 📜 Historian | Different voice, vocabulary, depth — same facts |
| Language | English / Español | Answer in the chosen language regardless of question language |
| Detail | Brief / Standard / Deep | 1 sentence → paragraph → story |

Plus: GPS-aware answers (landmarks near you), gallery upload (ask about your own
photos/videos), per-persona UI theming.

---

## 5 — Live demo flow (60–90s)

1. Phone (HTTPS via tunnel) or laptop simulator → live camera on a landmark
2. Pick persona (e.g. Child) + language (Español)
3. Hold mic → *"¿Qué es ese dragón?"* → release
4. **Freeze + highlight + spoken answer** ← the money shot, pause 3s here
5. Follow-up chip tap → second answer on the same frame
6. Gallery: upload a photo → ask about it
7. Open the **recap** — the shareable artifact

Fallbacks ready: offline mock mode (`VITE_MOCK_API=true`), clickable prototype, screen recording.

---

## 6 — Technical implementation (HOW)

```
Phone (PWA)                         Server (Express + TS)              Mistral
┌──────────────────┐   /api/stt ──▶ Voxtral STT (realtime) ─────────────┐
│ getUserMedia     │   /api/ask ──▶ Mistral Large 4 ──▶ box_2d/point_2d │
│ MediaRecorder ───┼── frame+jpg ─▶ Agents API: router → grounding     │
│ push-to-talk     │              └─▶ guide (persona prompt) ─▶ answer │
│ Overlay (0-1000) │   /api/tts ──▶ Voxtral TTS (voice per persona) ◀─────┘
│ gallery upload   │   /api/recap ▶ tour recap workflow
└──────────────────┘   GPS + tour memory in store
```

- **Grounding contract**: `{"box_2d":[x,y,w,h], "point_2d":[x,y]}` normalised 0–1000
  (Le Chonk), rendered on the displayed image rect
- **Agents**: router agent hands off to grounding agent → guide agent with persona
  system prompts (`prompts/*.md`)
- **Frontend**: Vite + React + TS PWA, camera/mic via getUserMedia + MediaRecorder,
  installable, offline-capable

---

## 7 — Models

| Step | Model | Why |
|---|---|---|
| Speech-to-text | **Voxtral** (realtime) | low-latency transcription, multilingual |
| Grounding + ID | **Mistral Large 4** | vision + structured JSON box/point output |
| Answer | **Mistral Large 4** via **Agents API** | handoffs router → grounding → guide |
| Speech | **Voxtral TTS** | distinct voice per persona |

---

## 8 — What's built & working today

- ✅ Full voice flow: PTT → STT → grounded answer → highlight → TTS (live, City of London)
- ✅ Personas × languages × detail levels, persona-themed UI
- ✅ GPS-aware grounding (nearby landmarks)
- ✅ **Gallery upload** (photos freeze directly; videos play, frame captured on ask)
- ✅ Walk route minimap + compass, follow-up chips, replay/stop
- ✅ Tour recap, eval harness for grounding (`test-grounding/`)
- ✅ Mock mode for offline demos
- ✅ Single-container Docker deploy (API + PWA same origin)

---

## 9 — Roadmap

| Now | Next | Later |
|---|---|---|
| Demo-ready pilot (3 City of London landmarks) | More landmarks + curated fact DB; tap-to-ask sub-regions; shareable answer cards | Multi-city, multi-language; group tours; AR directions; offline on-device grounding |

---

## 10 — Try it

```bash
git clone <repo> && cd mistral-hackathon-2026
npm install && cp .env.example .env   # add MISTRAL_API_KEY
npm run dev:server   # :3001
npm run dev:web      # :5173  (proxies /api)
# phone: npx ngrok http 5173 → open HTTPS URL (camera needs secure context)
# offline demo: VITE_MOCK_API=true npm run dev:web
```

Repo layout: `apps/web` (PWA) · `apps/server` (API) · `prompts/` (agents) ·
`data/landmarks.json` · `test-grounding/` (eval) · `docs/` (runbook, design, this deck)

---

## 11 — Appendix: judging criteria mapping

- **Innovation**: voice + visual grounding + spoken persona answers in one flow
- **Technical**: real model chain (Voxtral STT/TTS, Large 4 grounding + Agents API), PWA
- **Design**: mobile-first, persona theming, polished dock/sheets — prototypes in `docs/design/`
- **Demo**: 90s live flow with mock fallback; recap artifact to take away
