# Vysta — hackathon deck (story + speaker notes)

**Present:** open `docs/deck/index.html` in a browser. → / Space / click = next, ← = back,
F = fullscreen, `#5` in the URL jumps to slide 5. Every element builds in with an animation.
**Static PNGs** (1920×1080, for upload/backup): `docs/deck/slides/slide-01…12.png`.
Regenerate them with `bash docs/deck/render.sh` (headless Chrome).
Screens on the slides are the real app in mock mode (`docs/design/appllama/implemented/`).

Story: **Why** (a moment everyone has had → the gap) → **Who** (four travellers) →
**What** (three steps → the magic moment → the walk) → **Demo** → **How** (pipeline → identify, then explain) → **Proof** → **Next**.
Target: about 4 minutes plus a 60–90 s demo.

---

## 1 — Title · *Vysta. The city that answers back.*
On screen: logo, tagline, Point · Ask · Listen · See exactly where, the answer screen.

**Say:** "Vysta turns any street into a guide you can talk to. You point your phone at
something, ask out loud, and it shows you exactly what it's talking about."

---

## 2 — Why · the moment
On screen: *Saturday in the City. You stop in front of a dragon.* — “What **is** that?” —
guidebook / audio tour / photo search — *You give up. The moment is gone.*

**Say:** "Everyone has stood in front of something and wondered what it was. The
guidebook doesn't cover it, the audio tour is talking about something else, and a photo
search gives you a text card without telling you which part of the building it means. So
you walk on."

---

## 3 — Why · the gap
On screen: matrix — ask out loud / answers out loud / about what you see / shows exactly
where — for guidebook, audio tour, visual search apps, Vysta.

**Say:** "Existing tools can answer questions. None of them point. Vysta does all four:
you ask by voice, it answers by voice, about what's in front of you, with the exact spot
highlighted."

---

## 4 — Who · personas
On screen: *Same dragon. Four travellers. Four ways to hear it.* The 8-year-old → Little
Soldier · the architecture student → The Architect · the history buff → The Historian ·
the visitor abroad → any guide in Español. Each card has the traveller's question and the
guide's sample answer (from the app's mock answers).

**Say:** "The same facts land differently for different people. A child wants wonder, a
student wants materials and intent, a history buff wants patrons and dates, and a visitor
wants it in their own language. You pick a guide; each has its own voice, tone and look."

---

## 5 — What · the product
On screen: *The street is the interface.* 1 Point · 2 Ask · 3 See + hear, with the live,
listening and answer screens.

**Say:** "Three steps. Point the camera, or pick a photo from your gallery. Hold the mic
and ask. Let go, and the spot lights up while your guide answers out loud."

---

## 6 — What · the magic moment
On screen: answer screen + four callouts: the frame freezes · the exact spot is
highlighted · your guide answers out loud · one tap to go deeper (AI follow-ups).

**Say:** "This is the moment we built everything around. The frame freezes so you and the
guide look at the same picture. A box and a pulsing point mark what the answer is about.
The guide speaks while the caption reveals word by word, and follow-up questions written
for this answer let you dig in with one tap."

---

## 7 — What · the walk
On screen: *Every question becomes a stop on your walk.* Nearest-landmark widget · route ·
recap page · Share my walk; map and recap screens.

**Say:** "Every question becomes a stop. The map shows your route, and at the end the recap
gives you stats, a timeline and your guide's summary, ready to share. That's what you take
home."

---

## 8 — Live demo (60–90 s)
On screen: LIVE · Demo · pick a guide (Español) → hold, ask, release → highlight + voice →
follow-up → recap.

**Do:** phone over HTTPS (or laptop) → camera on the dragon boundary marker photo → pick a
guide + Español → "¿Qué es ese dragón?" → release → highlight + spoken answer → tap a
follow-up → open Recap.
**Fallbacks (rehearsed):** `VITE_MOCK_API=true` offline mock · gallery photo instead of
live camera · screen recording.

---

## 9 — How · all Mistral, end to end
On screen: You ask → Hear it (Voxtral Transcribe) → Find it (Mistral Medium, vision) →
Explain it (Mistral Large) → Say it (Voxtral TTS). Stack: Vite + React PWA ·
getUserMedia / MediaRecorder · Express API · normalised 0–1000 overlay · one Docker
container · offline mock mode.

**Say:** "Under the hood it's an all-Mistral pipeline. Voxtral transcribes the question.
Mistral Medium looks at the frozen frame and returns a box and a point, using GPS to know
which landmarks are nearby. Mistral Large writes the answer in the chosen persona's voice,
plus follow-up questions. Voxtral TTS speaks it with a different voice per guide. It all
runs as one container."
*(Models are configurable via `MISTRAL_MODEL_*` / `VOXTRAL_*` in `.env`; defaults:
`voxtral-mini-transcribe-3`, `mistral-medium-latest`, `mistral-large-latest`,
`voxtral-mini-tts-3-0`.)*

---

## 10 — How · identify, then explain
On screen: *How it knows what you're looking at.* Two lanes.
**1 Identify (Mistral Medium, vision):** frozen photo + question + GPS-narrowed shortlist →
strict JSON `{landmarkId, box_2d, point_2d}` (0–1000). It can only pick from our checked
landmark list, and the server rejects anything else.
**2 Explain (Mistral Large):** that landmark's verified fact + recent photos + guide and
language + the chat so far → answer in the guide's voice + 3 follow-up questions. Not on
the list? It names the building from the photo and its own knowledge.
Footer: facts = curated EN/ES landmark file + Mistral Large · follow-ups reuse the
identification, so there's no second vision call.

**Say:** "Two separate jobs. First, a vision model finds the building and the exact spot,
choosing from a list of landmarks we've checked, narrowed by your GPS, and the server
throws out anything not on that list. Then Mistral Large explains it using the verified
fact we hold for that landmark, in your guide's voice. If you point at something we don't
have yet, it still names it from what it sees. And because follow-ups reuse the first
identification, they skip the vision step."

**If asked "where does the information come from?":** `data/landmarks.json` (4 landmarks
today, each with aliases, GPS spots and EN/ES facts) plus Mistral Large's own knowledge.
No live web search yet; that's on the roadmap.
**If asked "how fast is it?":** four calls in a row (Voxtral → Medium → Large → Voxtral).
The vision call runs with reasoning off and a 300-token cap, follow-ups skip it, and the UI
freezes the frame on press so the wait reads as "thinking". We haven't benchmarked
end-to-end latency yet; don't quote a number we haven't measured.

---

## 11 — Proof · built at the hackathon
On screen: full voice loop · 3 guides × 2 languages · GPS-aware grounding · gallery
photos & video · AI follow-ups · map + walk recap · "You" figurine from a face scan ·
offline mock mode · one-container deploy.

**Say:** "All of this works today, end to end. You just saw it."

---

## 12 — Next + close
On screen: Now (City of London pilot: dragon boundary marker, St Paul's, Leadenhall
Market) · Next (curated landmark database, shareable answer cards, more cities and
languages) · Later (group tours, AR walking directions, on-device grounding offline).
*Point. Ask. Listen. See.*

**Say:** "We started with one square mile of London. Next is a curated landmark database,
shareable answer cards and more cities. Point, ask, listen, see. Thank you."
