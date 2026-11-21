#!/usr/bin/env python3
"""Render the Vysta hackathon deck as 1920x1080 slide PNGs -> docs/deck/slides/.

Run:  py docs/deck/render_deck.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
OUT = Path(__file__).resolve().parent / "slides"
BG = (8, 11, 16)
ACCENT = (255, 90, 31)   # brand orange
GOLD = (255, 209, 102)
TEXT = (238, 243, 249)
DIM = (160, 172, 188)


def font(size):
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
    for i in range(12):  # concentric accent rings, top-left glow
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
    dict(kicker="Mistral Hackathon 2026", title="️ Vysta — the city that answers back",
         bullets=["Point, ask, listen — and see exactly what it means",
                  "A voice-driven, visually grounded city guide that lives in your browser",
                  "Mobile web PWA · iOS Safari & Android Chrome · City of London pilot"],
         footer="Voice question in -> spoken answer out -> exact spot highlighted on screen"),
    dict(kicker="The story", title="Saturday in the City. You stop in front of a dragon.",
         bullets=['"Mum, what IS that?" — every tourist has asked this out loud',
                  "The guidebook has 400 pages. The audio tour is about something else.",
                  "You take a photo, you google it, you give up. The moment is gone.",
                  "Cities are full of stories — but nothing in your pocket points at them and tells them."],
         footer="That moment is the product brief"),
    dict(kicker="Who it's for", title="Meet the travellers Vysta is built for",
         bullets=[" The 8-year-old: 'Why is the dragon holding a shield?' — wants play, not paragraphs (Child persona)",
                  "️ The architecture student: 'What is that facade made of?' — wants materials and technique (Architect persona)",
                  " The history buff: 'Tell me everything about this gate' — wants dates and anecdotes (Historian persona)",
                  " The visitor abroad: asks in Spanish, gets a Spanish answer — with the spot highlighted (EN/ES)"],
         footer="One app, four travellers — persona + language + detail adapt the same facts"),
    dict(kicker="The gap", title="Existing tools answer, but never point",
         bullets=["Google Lens: great answers, but a text card — it doesn't show you WHERE on the building",
                  "Audio tours: passive, linear, never about the thing you're actually looking at",
                  "Nobody combines: voice question + spoken answer + highlight on the exact spot",
                  "Vysta = the missing 'point at it and ask' layer of the city"],
         footer="Positioning: the visual, voice-first layer on top of the city"),
    dict(kicker="The product", title="Vysta — point, ask, listen, see",
         bullets=["1. Open the app -> live camera fills the screen (or upload a gallery photo/video)",
                  "2. Hold the mic, ask out loud: 'What's that carving above the door?'",
                  "3. Release -> frame freezes, the target is highlighted (box + pulsing point)",
                  "4. Answer appears as a caption AND is spoken in your persona's voice",
                  "5. Ask follow-ups on the same scene -> finish with a shareable tour recap"],
         footer="No typing, no menus — the street is the interface"),
    dict(kicker="The magic moment", title="The dragon lights up — and tells you its story",
         bullets=['Demo: hold mic -> "¿Qué es ese dragón?" -> release',
                  "Frozen frame, glowing highlight box + gold pulsing point on the dragon",
                  "Caption + spoken answer in Spanish, Child persona voice",
                  "Follow-up chip -> second answer on the same frame -> recap page"],
         footer="This 5-second moment is the whole pitch"),
    dict(kicker="Live demo · 60–90s", title="Demo flow (with safety nets)",
         bullets=["Phone over HTTPS tunnel (or laptop) -> live camera on the dragon boundary marker",
                  "Pick Child + Español -> hold mic -> ask -> release -> highlight + spoken answer",
                  "Follow-up chip, then Gallery upload a photo, ask about it",
                  "Open the recap — the shareable artifact",
                  "Fallbacks rehearsed: VITE_MOCK_API=true offline mock · clickable prototype · screen recording"]),
    dict(kicker="Personalisation", title="Same facts, four ways to hear them",
         bullets=["Persona: Child / Architect / Historian — distinct voice, vocabulary, depth (UI re-themes too)",
                  "Language: English / Español — answer language follows the picker, not the question",
                  "Detail: Brief / Standard / Deep — one sentence to full story",
                  "Plus: GPS-aware answers near you · gallery upload · walk minimap + compass"],
         footer="Personalisation is a first-class feature, not a setting"),
    dict(kicker="How", title="Technical implementation",
         bullets=["PWA (Vite+React+TS): getUserMedia camera, MediaRecorder push-to-talk, gallery input, 0-1000 overlay",
                  "Express API: /api/stt · /api/ask · /api/tts · /api/recap (+GPS, tour memory)",
                  "Mistral chain: Voxtral STT -> Large 4 grounding (box_2d/point_2d, 0-1000) -> Agents API (router->grounding->guide) -> Voxtral TTS per persona",
                  "Grounding contract: {\"box_2d\":[x,y,w,h], \"point_2d\":[x,y]} normalised 0-1000, rendered on the displayed rect",
                  "Single-container Docker deploy (API + PWA same origin)"]),
    dict(kicker="Models", title="The model chain",
         bullets=["Speech-to-text: Voxtral (realtime) — low latency, multilingual",
                  "Grounding + landmark ID: Mistral Large 4 — vision + structured JSON box/point",
                  "Answer: Mistral Large 4 via Agents API — handoffs router -> grounding -> guide (persona prompts in prompts/*.md)",
                  "Speech: Voxtral TTS — a distinct voice per persona"]),
    dict(kicker="Proof", title="Built & working today",
         bullets=[" Full live voice flow: PTT -> STT -> grounded answer -> highlight -> TTS",
                  " Personas × languages × detail levels with persona-themed UI",
                  " GPS-aware grounding · gallery upload (photo/video) · minimap + compass · recap",
                  " Grounding eval harness (test-grounding/) · offline mock mode · Docker deploy"]),
    dict(kicker="Roadmap + CTA", title="From one street to every city",
         bullets=["NOW: pilot in the City of London — dragon boundary, St Paul's, Leadenhall Market",
                  "NEXT: curated landmark DB · tap-to-ask sub-regions · shareable answer cards · more cities/languages",
                  "LATER: group tours · AR directions · offline on-device grounding",
                  "Try it: npm install && npm run dev:web -> http://localhost:5173 (ngrok for phone)",
                  "The recap page from the demo is the takeaway artifact."],
         footer="Vysta — point, ask, listen, see."),
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
