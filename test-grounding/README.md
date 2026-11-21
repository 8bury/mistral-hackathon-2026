# Grounding test harness

This decides demo ambition: if Le Chonk can't reliably point at the demo
landmarks on real photos, we cut scope.

## How to use (first 2 hours)

1. Drop 15–20 real photos into `photos/` — dragon boundary markers,
   Leadenhall Market, St Paul's details, gargoyles. Phone photos, various
   angles and lighting.
2. For each photo, write the expected landmark id and rough ground-truth
   box in `cases.json`:

```json
[
  { "file": "photos/dragon-1.jpg", "landmarkId": "dragon-boundary", "question": "what is this dragon?" }
]
```

3. Run the scorer (to be added as `score.ts`):

```bash
npx tsx test-grounding/score.ts
```

It calls the grounding prompt (prompts/grounding.md) per photo and reports
how often the returned box overlaps the landmark and the landmarkId matches.

## Pass bar (suggested)

- landmarkId correct on >= 80% of photos
- box IoU > 0.3 (or point within the object) on >= 70%

If below the bar: tighten the prompt, restrict the landmark set, or demo
with the curated photos only.
