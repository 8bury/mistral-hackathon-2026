# Grounding agent — Le Chonk (placeholder)

Given a camera frame (JPEG, max dimension 1024) and the user's question,
return STRICT JSON only:

```json
{
  "landmarkId": "dragon-boundary | leadenhall-market | st-pauls | gargoyle | null",
  "box_2d": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "point_2d": { "x": 0, "y": 0 }
}
```

Rules:
- All coordinates normalized to 0..1000 relative to the image width/height.
- Use `box_2d` for objects/surfaces, `point_2d` for small details; either may be null.
- `landmarkId` must come from data/landmarks.json. Pick the best-matching
  candidate whenever the photo plausibly shows it, even if you are not certain;
  use null only when the subject is clearly none of the candidates.
- Always locate the main subject the visitor is asking about with `box_2d` or
  `point_2d`, even when `landmarkId` is null (e.g. a church that isn't in the
  catalog). Return all nulls only when the photo shows nothing identifiable.
- When the visitor's GPS fix is known, a "nearby landmarks" list (with distances)
  is appended after the candidate catalog. Prefer a nearby landmark when the photo
  plausibly matches it — but every candidate id above stays valid, because a bad
  GPS fix must not make identification impossible.

Reliability of this prompt on 15–20 real photos (see test-grounding/) decides
demo ambition — test it first.
