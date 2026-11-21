# Gallery button — design variants

Mockups rendered by `make_gallery_button_mockups.py` into `mockups/` (dock strip
with the mic centered, candidate button on the right, matching app tokens:
dark glass, accent `#4cc2ff`, gold `#ffd166`).

| Variant | File | Idea | Trade-off |
|---|---|---|---|
| A — current | `a-pill-current.png` | glass pill, icon + "Gallery" | clear label, but takes horizontal space next to mic |
| B — glass circle | `b-circle-glass.png` | icon-only circle, same size as Camera pill | compact, but icon meaning is less obvious |
| C — accent ring | `c-circle-accent-ring.png` | B with accent ring + accent icon | reads as "secondary action", pops on dark camera |
| D — plus FAB | `d-fab-plus.png` | floating + button above the dock | very thumb-reachable, but floats over the scene |
| E — thumbnail pill | `e-pill-thumb.png` | pill with last-picked media thumbnail | shows context ("what am I uploading?"), needs state |
| F — split sheet | `f-sheet-split.png` | "Upload photo / Upload video" sheet | explicit photo-vs-video choice, one extra tap |

Recommendation: **C** (or E if we track last media) — compact, consistent with
the glass dock, and the accent ring distinguishes it from the Camera pill on
the left. A/B keep the label for first-time users.

## Appllama prompts (paste per variant, 390x844 iOS dark)

> Dark iOS camera app dock, bottom of screen, centered red-blue mic button.
> On the right side: a circular glass button with a photo/gallery icon and a
> thin blue accent ring, dark glassmorphism, SF Pro. 390x844.

> Same dock, but right side is a pill button showing a small rounded photo
> thumbnail + "Gallery" text. 390x844 dark glass.

> Same dock, right side: floating circular "+" button in accent blue above the
> dock, soft shadow. 390x844 dark.

> iOS bottom sheet over a camera screen with two rows: "Upload photo" (image
> icon) and "Upload video" (play icon), dark glass, rounded top corners.
