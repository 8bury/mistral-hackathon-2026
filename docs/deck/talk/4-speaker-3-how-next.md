# Speaker 3: How + Proof + Next (slides 9–12, ~80 s)

You explain how it works, prove it's real, and close the pitch. You also take the technical Q&A.
**Order:** Speaker 1 → Speaker 2 → Demo → **Speaker 3**.

---

## Slide 9 · All Mistral, end to end
"Everything you just saw runs on Mistral, in four steps.
**Voxtral** turns your speech into text.
**Mistral Medium**, with vision, finds what you're pointing at.
**Mistral Large** writes the answer in your guide's style.
And **Voxtral** speaks it.
It all runs as a single container."

## Slide 10 · Identify, then explain
"There are two separate jobs here.
First, *identify*: the vision model looks at the frozen photo and picks from a list of landmarks we've checked, narrowed by your GPS. It returns which landmark and where it is in the picture, and the server rejects anything not on our list.
Then, *explain*: Mistral Large takes the verified fact we hold for that landmark and tells it in your guide's voice. If you point at something we don't have yet, it still names it from what it sees.
And follow-up questions reuse the first identification, so they skip the vision step."

## Slide 11 · Proof
"All of this works today, end to end: the voice loop, three guides plus your own **You** guide, English and Spanish, GPS-aware recognition, gallery photos and video, AI follow-ups, a live map and walk recap, a personal figurine from a face scan, and an offline mode so the demo never depends on Wi-Fi."

## Slide 12 · Next + close
"We started with one square mile of London.
Next comes a bigger curated landmark database, shareable answer cards, and more cities and languages.
**Point. Ask. Listen. See.** We're Vysta. Thank you!"

---

## Q&A you own (technical)
- **"How does it identify the building?"**
  - Mistral Medium (vision) gets the frozen photo, the question and a GPS-narrowed shortlist.
  - It returns strict JSON: a landmark id, a box and a point, on a 0–1000 scale.
  - It can only choose from our checked list, and the server rejects anything else.
- **"Where does the information come from?"**
  - `data/landmarks.json`: 4 landmarks today, each with aliases, GPS spots and English/Spanish facts.
  - Mistral Large's own knowledge covers anything not on the list.
  - No live web search yet; it's on the roadmap.
- **"How fast is it?"**
  - It's four Mistral calls in a row.
  - The vision step runs with reasoning off and a short output limit, follow-ups skip it, and the frame freezes the moment you press, so the wait feels like thinking.
  - **We haven't measured end-to-end speed, so don't quote a number.**
  - Faster later: stream the answer and start speaking from the first sentence, and cache answers per landmark.
- **"Is it all Mistral?"** "Yes. Voxtral to listen and speak, Mistral Medium to see, Mistral Large to explain. No other AI provider."
- **"How does the You guide work?"** The visitor writes a short style note (up to 600 characters). It's passed to Mistral Large as style guidance only, so it can't override the facts, the length or the follow-up rules.

---

## Slide 13 · Try it yourself (after "Thank you")
Advance to the QR slide and **leave it up for the whole Q&A**.
"It's live right now: scan the code and allow the camera and mic.
There's no landmark in this room, so tap the **gallery button** and pick a photo of one: London or anywhere. Then hold the mic and ask.
Happy to take questions."
