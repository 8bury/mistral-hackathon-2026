/**
 * Heuristic facial-feature extraction from the 256×256 posterized face
 * capture (see FaceCapture). The result drives the personalized "You"
 * figurine: skin tone, hair colour/style, glasses, facial hair and face
 * shape, so the character embodies the visitor instead of being a generic
 * robot — in the same flat blocky format as the guide figurines.
 *
 * Everything is pixel math on the centered square crop: the face is assumed
 * to fill the middle of the frame (FaceCapture crops to the centered square
 * and the user centers their face in the lens).
 */

export type HairStyle = 'short' | 'flat' | 'curly' | 'bald';
export type GlassesStyle = 'none' | 'round' | 'square';
export type FacialHair = 'none' | 'mustache' | 'beard' | 'goatee';
export type FaceShape = 'round' | 'square' | 'long';

export interface FaceFeatures {
  /** Snapped to a flat cartoon palette so it matches the art style. */
  skinTone: string;
  hairColor: string;
  hairStyle: HairStyle;
  glasses: GlassesStyle;
  facialHair: FacialHair;
  faceShape: FaceShape;
}

/** Flat palettes — nearest match keeps the avatar in the blocky art style. */
const SKIN_PALETTE = ['#f8d8b0', '#f0c39a', '#d9a06b', '#b97e4e', '#8d5a33', '#5f3d22'];
const HAIR_PALETTE = ['#f2c14e', '#c98a3d', '#8a5a2e', '#5a3d24', '#2e2620', '#9aa0a6', '#e8e8e8'];

type RGB = [number, number, number];

const lum = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const nearest = (c: RGB, palette: string[]) =>
  palette.reduce((best, h) => (dist(c, hexToRgb(h)) < dist(c, hexToRgb(best)) ? h : best));

/** Average colour of a fractional rectangle (0..1 coords). Read-only. */
function region(d: Uint8ClampedArray, w: number, h: number, x0: number, y0: number, x1: number, y1: number): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const xa = Math.max(0, Math.floor(x0 * w));
  const xb = Math.min(w, Math.ceil(x1 * w));
  const ya = Math.max(0, Math.floor(y0 * h));
  const yb = Math.min(h, Math.ceil(y1 * h));
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y * w + x) * 4;
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

/**
 * Hair-band stats: average colour of the *darker half* of the band (hair,
 * not the bright wall behind), plus that subset's luminance spread for
 * curl detection. Falls back to the whole band when nothing is darker.
 */
function regionHair(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { avg: RGB; std: number } {
  const xa = Math.max(0, Math.floor(x0 * w));
  const xb = Math.min(w, Math.ceil(x1 * w));
  const ya = Math.max(0, Math.floor(y0 * h));
  const yb = Math.min(h, Math.ceil(y1 * h));
  const px: { c: RGB; l: number }[] = [];
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y * w + x) * 4;
      const c: RGB = [d[i], d[i + 1], d[i + 2]];
      px.push({ c, l: lum(c) });
    }
  }
  if (!px.length) return { avg: [0, 0, 0], std: 0 };
  const meanL = px.reduce((a, p) => a + p.l, 0) / px.length;
  const dark = px.filter((p) => p.l <= meanL);
  const subset = dark.length >= px.length * 0.1 ? dark : px;
  const n = subset.length;
  const avg: RGB = [subset.reduce((a, p) => a + p.c[0], 0) / n, subset.reduce((a, p) => a + p.c[1], 0) / n, subset.reduce((a, p) => a + p.c[2], 0) / n];
  const m = subset.reduce((a, p) => a + p.l, 0) / n;
  const std = Math.sqrt(subset.reduce((a, p) => a + (p.l - m) ** 2, 0) / n);
  return { avg, std };
}

/** Analyze a (posterized) face capture into figurine features. */
export function analyzeFace(img: ImageData): FaceFeatures {
  const { data: d, width: w, height: h } = img;

  // Skin tone: cheek patches either side of the nose, below the eye line.
  const cheekL = region(d, w, h, 0.27, 0.48, 0.4, 0.58);
  const cheekR = region(d, w, h, 0.6, 0.48, 0.73, 0.58);
  const skinRaw: RGB = [(cheekL[0] + cheekR[0]) / 2, (cheekL[1] + cheekR[1]) / 2, (cheekL[2] + cheekR[2]) / 2];
  const skinTone = nearest(skinRaw, SKIN_PALETTE);
  const skinL = lum(skinRaw);

  // Hair: top band of the head. A bald head reads as skin; a bright wall is
  // neither darker nor more saturated than skin, so both read as "no hair".
  const top = regionHair(d, w, h, 0.26, 0.05, 0.74, 0.2);
  const sideL = region(d, w, h, 0.16, 0.24, 0.26, 0.42);
  const sideR = region(d, w, h, 0.74, 0.24, 0.84, 0.42);
  const sides: RGB = [(sideL[0] + sideR[0]) / 2, (sideL[1] + sideR[1]) / 2, (sideL[2] + sideR[2]) / 2];
  const sat = (c: RGB) => Math.max(...c) - Math.min(...c);
  const hairThere =
    dist(top.avg, skinRaw) > 42 && (lum(top.avg) < skinL - 25 || sat(top.avg) > sat(skinRaw) + 40);
  const hairColor = hairThere ? nearest(top.avg, HAIR_PALETTE) : '#9aa0a6';
  let hairStyle: HairStyle = 'short';
  if (!hairThere) hairStyle = 'bald';
  else if (top.std > 26) hairStyle = 'curly'; // textured band = curls
  else if (dist(sides, top.avg) < 40) hairStyle = 'flat'; // sides match the hair = longer cut

  // Glasses: dark band across the eye line compared to the cheeks below it.
  const eye = region(d, w, h, 0.28, 0.37, 0.72, 0.45);
  const lower = region(d, w, h, 0.3, 0.52, 0.7, 0.62);
  let glasses: GlassesStyle = 'none';
  if (lum(lower) - lum(eye) > 16) {
    const lensL = lum(region(d, w, h, 0.32, 0.38, 0.44, 0.44));
    const bridge = lum(region(d, w, h, 0.47, 0.39, 0.53, 0.44));
    const lensR = lum(region(d, w, h, 0.56, 0.38, 0.68, 0.44));
    // Two separated dark lenses with a lighter bridge => round; continuous dark bar => square.
    glasses = lensL < bridge - 10 && lensR < bridge - 10 ? 'round' : 'square';
  }

  // Facial hair: chin/jaw and upper-lip zones vs skin brightness.
  const chin = region(d, w, h, 0.34, 0.72, 0.66, 0.86);
  const lip = region(d, w, h, 0.4, 0.6, 0.6, 0.68);
  const chinDark = skinL - lum(chin) > 14;
  const lipDark = skinL - lum(lip) > 12;
  const facialHair: FacialHair = chinDark && lipDark ? 'beard' : chinDark ? 'goatee' : lipDark ? 'mustache' : 'none';

  // Face shape: aspect of the skin-coloured blob in the central column.
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let found = false;
  for (let y = Math.floor(h * 0.05); y < h * 0.95; y += 2) {
    for (let x = Math.floor(w * 0.18); x < w * 0.82; x += 2) {
      const i = (y * w + x) * 4;
      if (dist([d[i], d[i + 1], d[i + 2]], skinRaw) < 55) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  let faceShape: FaceShape = 'square';
  if (found) {
    const ratio = (maxX - minX) / Math.max(1, maxY - minY);
    faceShape = ratio > 0.94 ? 'round' : ratio < 0.8 ? 'long' : 'square';
  }

  return { skinTone, hairColor, hairStyle, glasses, facialHair, faceShape };
}
