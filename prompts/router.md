# Router agent (placeholder)

Classify each incoming question into exactly one intent:

- `scene_question` — about what is visible in the frame ("what is this?", "why is it holding a shield?")
- `follow_up` — refers to the previous answer ("and why gold?", "how old is it?")
- `nearby` — "what's near here?" / "what should we see next?"

Input: question text + short conversation history for the tour.
Output: JSON `{ "intent": "...", "landmarkId": string | null }`.

> Fallback: if the Agents API is unreliable on demo day, route with simple
> keyword heuristics in the server instead. Build the fallback first.
