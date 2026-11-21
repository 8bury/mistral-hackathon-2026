#!/usr/bin/env python3
"""Render docs/deck.md content as 1920x1080 slide PNGs -> docs/deck/slides/.

Run:  py docs/deck/render_deck.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
OUT = Path(__file__).resolve().parent / "slides"
BG = (8, 11, 16)
PANEL = (15, 20, 29)
ACCENT = (255, 90, 31)   # architect orange — brand
GOLD = (255, 209, 102)
TEXT = (238, 243, 249)
DIM = (160, 172, 188)


def font(size, bold=False):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def wrap(d, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def slide(title, kicker=None, bullets=(), footer=None):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # accent glow top-left
    for i in range(12):
        r = 520 - i * 42
        d.ellipse([-r, -r, r, r], outline=(ACCENT[0], ACCENT[1], ACCENT[2], 12), width=2)
    y = 130
    if kicker:
        d.text((110, y), kicker.upper(), font=font(26), fill=GOLD)
        y += 56
    for line in wrap(d, title, font(64), W - 220):
        d.text((110, y), line, font=font(64), fill=TEXT)
        y += 78
    y += 40
    bf = font(31)
    for b in bullets:
        for j, line in enumerate(wrap(d, b, bf, W - 300)):
            if j == 0:
                d.ellipse([116, y + 14, 128, y + 26], fill=ACCENT)
            d.text((150, y), line, font=bf, fill=TEXT if j == 0 else DIM)
            y += 44
        y += 14
    if footer:
        d.text((110, H - 70), footer, font=font(22), fill=DIM)
    return img


SLIDES = [
    dict(kicker="Mistral Hackathon 2026", title="🗺️ Vysta — the city that answers back",
         bullets=["Point, ask, listen — and see exactly what it means",
                  "Voice-driven, visually grounded city guide",
                  "Mobile web PWA · iOS Safari & Android Chrome · City of London pilot"],
         footer="Voice question in -> spoken answer out -> exact spot highlighted on screen"),
    dict(kicker="Why", title="People guess at buildings. Guides don't point.",
         bullets=["Guidebooks are walls of text; audio tours are passive and off-topic",
                  'The real questions in the street: "What is that carving? When was it built? Who is it for?"',
                  "Google Lens answers with text cards; audio guides never show WHERE",
                  "Nobody combines voice question + spoken answer + highlight on the exact spot"],
         footer="Vysta closes that gap"),
    dict(kicker="What", title="Vysta — a tour guide that lives in your browser",
         bullets=["1. Open the app -> live camera fills the screen",
                  "2. Hold the mic, ask a question out loud",
                  "3. Release -> frame freezes, target highlighted (box + pulsing point)",
                  "4. Answer as caption AND spoken aloud",
                  "5. Follow-ups on the same scene -> shareable tour recap"],
         footer='Demo line: "What\'s that dragon above the door?" -> it lights up and the guide explains'),
    dict(kicker="Personalisation", title="One guide, three personalities",
         bullets=["Persona: 🧒 Child · 🏛️ Architect · 📜 Historian — different voice, vocabulary, depth, same facts",
                  "Language: English / Español — answer in the chosen language regardless of the question",
                  "Detail: Brief / Standard / Deep — one sentence to full story",
                  "Plus: GPS-aware answers, gallery upload (ask about your own photos/videos), per-persona UI theming"]),
    dict(kicker="Live demo · 60–90s", title="The demo flow",
         bullets=["Phone over HTTPS (or laptop) -> live camera on a landmark",
                  'Pick Child persona + Español, hold mic: "¿Qué es ese dragón?" -> release',
                  "FREEZE + HIGHLIGHT + SPOKEN ANSWER ← pause 3s here (the money shot)",
                  "Follow-up chip -> second answer on the same frame",
                  "Gallery: upload a photo, ask about it -> open the recap artifact",
                  "Fallbacks ready: VITE_MOCK_API=true offline mock, clickable prototype, recording"]),
    dict(kicker="How", title="Technical implementation",
         bullets=["PWA (Vite+React+TS): getUserMedia camera, MediaRecorder push-to-talk, gallery input, 0–1000 overlay",
                  "Express API: /api/stt · /api/ask · /api/tts · /api/recap (+GPS, tour memory)",
                  "Mistral chain: Voxtral STT -> Mistral Large 4 grounding (box_2d/point_2d, 0–1000) -> Agents API (router->grounding->guide) -> Voxtral TTS per persona",
                  "Grounding contract: {\"box_2d\":[x,y,w,h], \"point_2d\":[x,y]} rendered on the displayed image rect",
                  "Single-container Docker deploy (API + PWA same origin)"]),
    dict(kicker="Models", title="The model chain",
         bullets=["Speech-to-text: Voxtral (realtime) — low latency, multilingual",
                  "Grounding + landmark ID: Mistral Large 4 — vision + structured JSON box/point",
                  "Answer: Mistral Large 4 via Agents API — handoffs router -> grounding -> guide (persona prompts)",
                  "Speech: Voxtral TTS — a distinct voice per persona"]),
    dict(kicker="Status", title="Built & working today",
         bullets=["✅ Full voice flow: PTT -> STT -> grounded answer -> highlight -> TTS (live)",
                  "✅ Personas × languages × detail levels, persona-themed UI",
                  "✅ GPS-aware grounding · gallery upload (photo/video) · minimap + compass",
                  "✅ Follow-up chips, replay/stop · tour recap · grounding eval harness",
                  "✅ Offline mock mode for demos · Docker deploy"]),
    dict(kicker="Roadmap", title="Now -> next -> later",
         bullets=["NOW: demo-ready pilot — 3 City of London landmarks (dragon boundary, St Paul's, Leadenhall)",
                  "NEXT: more landmarks + curated facts DB · tap-to-ask sub-regions · shareable answer cards",
                  "LATER: multi-city & multi-language · group tours · AR directions · offline on-device grounding"]),
    dict(kicker="Try it", title="Run Vysta in 30 seconds",
         bullets=["git clone <repo> && cd mistral-hackathon-2026",
                  "npm install && cp .env.example .env  # add MISTRAL_API_KEY",
                  "npm run dev:server  # :3001      npm run dev:web  # :5173",
                  "Phone: npx ngrok http 5173 -> open the HTTPS URL (camera needs a secure context)",
                  "Offline demo: VITE_MOCK_API=true npm run dev:web"]),
    dict(kicker="Appendix", title="Judging criteria mapping",
         bullets=["Innovation: voice + visual grounding + spoken persona answers in one flow",
                  "Technical: real chain Voxtral STT/TTS + Large 4 grounding + Agents API, installable PWA",
                  "Design: mobile-first, persona theming, polished dock/sheets — prototypes in docs/design/",
                  "Demo: 90s live flow with mock fallback; recap artifact to take away"]),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i, s in enumerate(SLIDES, 1):
        img = slide(s["title"], s.get("kicker"), s.get("bullets", ()), s.get("footer"))
        p = OUT / f"slide-{i:02d}.png"
        img.save(p)
        print("wrote", p)


if __name__ == "__main__":
    main()
