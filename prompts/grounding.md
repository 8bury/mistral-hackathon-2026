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
- `landmarkId` must come from data/landmarks.json when the object matches.
- If nothing in the frame matches, return all nulls and let the guide agent say so.

Reliability of this prompt on 15–20 real photos (see test-grounding/) decides
demo ambition — test it first.
