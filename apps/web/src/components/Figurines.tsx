import { useId } from 'react';

import type { FaceFeatures } from '../faceFeatures';

/**
 * Crossy Road-style figurines for the four guide modes.
 * Chunky voxel proportions: big blocky head, stubby limbs, flat colours,
 * dark outline, ground shadow, subtle right-side shading for a 3D-block feel.
 */

export type FigurineId = 'historian' | 'architect' | 'child' | 'generic';

export const FIGURINE_LABELS: Record<FigurineId, string> = {
  historian: 'Historian',
  architect: 'Architect',
  child: 'Child',
  generic: 'You',
};

interface Props {
  id: FigurineId;
  /** Front-camera snapshot used as the face of the "generic" (You) figurine. */
  faceImage?: string | null;
  /** Analyzed facial features — when present, "You" is drawn as a custom
   *  character embodying them (skin, hair, glasses, facial hair, face shape). */
  features?: FaceFeatures | null;
  size?: number;
}

const OUTLINE = '#20242e';
const SKIN = '#f0c39a';
const SKIN_LIGHT = '#f6d3ab';
const GLASSES = '#2b2f38';

/** Darken a #rrggbb colour by factor f (voxel shade strips, hood lining). */
function shadeHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default function Figurine({ id, faceImage, features, size = 44 }: Props) {
  return (
    <svg
      width={size}
      height={size * 1.0625}
      viewBox="0 0 64 68"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))' }}
      aria-hidden
    >
      {id === 'historian' && <Historian />}
      {id === 'architect' && <Architect />}
      {id === 'child' && <Child />}
      {id === 'generic' && <Generic faceImage={faceImage ?? null} features={features ?? null} />}
    </svg>
  );
}

function Shadow({ rx = 16 }: { rx?: number }) {
  return <ellipse cx="32" cy="65" rx={rx} ry="3" fill="rgba(0,0,0,0.28)" />;
}

/** Right-side shade strip to fake a voxel edge on a blocky part. */
function Shade({ x, y, w, h, rx = 3 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill="rgba(0,0,0,0.10)" stroke="none" />;
}

/** Plato statue: laurel wreath, toga draped over one shoulder, big white beard, round glasses, scroll. */
function Historian() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <Shadow rx={17} />
      {/* toga robe */}
      <path d="M14 64 L19 36 H45 L50 64 Z" fill="#ece4d3" />
      {/* diagonal drape over the left shoulder (classic statue fold) */}
      <path d="M20 36 L45 64 L37 64 L15 41 Z" fill="#f8f4ea" />
      <line x1="14" y1="60" x2="50" y2="60" stroke="#d8cfba" />
      <line x1="27" y1="44" x2="25" y2="60" stroke="#d8cfba" />
      <line x1="39" y1="48" x2="41" y2="60" stroke="#d8cfba" />
      {/* stubby arms */}
      <rect x="11" y="42" width="9" height="6" rx="3" fill={SKIN} />
      <rect x="44" y="42" width="9" height="6" rx="3" fill={SKIN} />
      {/* scroll in right hand */}
      <rect x="50" y="34" width="7" height="17" rx="3.5" fill="#d9b98a" />
      <ellipse cx="53.5" cy="34" rx="3.5" ry="1.8" fill="#e8cf9f" />
      {/* head */}
      <rect x="20" y="12" width="24" height="24" rx="4" fill={SKIN} />
      <Shade x={40} y={12} w={4} h={24} rx={2} />
      {/* white hair: top block + side locks */}
      <rect x="17" y="4" width="30" height="10" rx="3" fill="#f6f6f6" />
      <rect x="17" y="12" width="4" height="10" rx="2" fill="#f6f6f6" />
      <rect x="43" y="12" width="4" height="10" rx="2" fill="#f6f6f6" />
      {/* laurel wreath over the hair */}
      <path d="M18.5 13 Q32 4 45.5 13" fill="none" stroke="#4a7c3a" strokeWidth="2.6" />
      <g fill="#5d9948" strokeWidth="1.4">
        <ellipse cx="21" cy="11.6" rx="2.6" ry="1.6" transform="rotate(-24 21 11.6)" />
        <ellipse cx="26.5" cy="9" rx="2.6" ry="1.6" transform="rotate(-12 26.5 9)" />
        <ellipse cx="32" cy="8.2" rx="2.6" ry="1.6" />
        <ellipse cx="37.5" cy="9" rx="2.6" ry="1.6" transform="rotate(12 37.5 9)" />
        <ellipse cx="43" cy="11.6" rx="2.6" ry="1.6" transform="rotate(24 43 11.6)" />
      </g>
      {/* round glasses */}
      <g fill="rgba(255,255,255,0.18)" stroke={GLASSES} strokeWidth="2.2">
        <circle cx="27" cy="20" r="5" />
        <circle cx="37" cy="20" r="5" />
      </g>
      <line x1="31.6" y1="19.4" x2="32.4" y2="19.4" stroke={GLASSES} strokeWidth="2.2" />
      <line x1="22" y1="20" x2="20" y2="19" stroke={GLASSES} strokeWidth="2.2" />
      <line x1="42" y1="20" x2="44" y2="19" stroke={GLASSES} strokeWidth="2.2" />
      {/* eyes inside the lenses */}
      <circle cx="27" cy="20" r="1.6" fill="#20242e" stroke="none" />
      <circle cx="37" cy="20" r="1.6" fill="#20242e" stroke="none" />
      {/* the big beard — spills below the chin onto the toga */}
      <path d="M23 26 H41 V33 Q41 43 32 43 Q23 43 23 33 Z" fill="#f6f6f6" />
      <line x1="29" y1="28" x2="29" y2="39" stroke="#dcdcdc" />
      <line x1="35" y1="28" x2="35" y2="39" stroke="#dcdcdc" />
    </g>
  );
}

/** Architect: flat-top hair, chunky square glasses, pencil behind the ear, unfolded map with route. */
function Architect() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <Shadow rx={15} />
      {/* legs + shoes */}
      <rect x="24" y="56" width="7" height="7" fill="#2c3e50" />
      <rect x="33" y="56" width="7" height="7" fill="#2c3e50" />
      <rect x="22.5" y="61.5" width="9.5" height="4" rx="2" fill="#20242e" />
      <rect x="31.5" y="61.5" width="9.5" height="4" rx="2" fill="#20242e" />
      {/* shirt + overalls */}
      <rect x="20" y="38" width="24" height="9" rx="2" fill="#e8edf3" />
      <rect x="22" y="46" width="20" height="12" fill="#3a6ea5" />
      <line x1="26" y1="38" x2="26" y2="46" stroke="#b9c4d0" />
      <line x1="38" y1="38" x2="38" y2="46" stroke="#b9c4d0" />
      <line x1="32" y1="46" x2="32" y2="58" stroke="#2c567f" />
      {/* stubby arms */}
      <rect x="13" y="40" width="8" height="13" rx="3" fill="#e8edf3" />
      <rect x="43" y="40" width="8" height="6" rx="3" fill="#e8edf3" />
      <circle cx="47" cy="48" r="3" fill={SKIN} />
      {/* unfolded map in the left hand, with a route + X */}
      <g transform="rotate(-6 12 54)">
        <rect x="3" y="47" width="17" height="13" rx="1" fill="#f7f3e8" />
        <line x1="8.7" y1="47" x2="8.7" y2="60" stroke="#d5cfbd" />
        <line x1="14.3" y1="47" x2="14.3" y2="60" stroke="#d5cfbd" />
        <path d="M5 57 Q 9 50 13 54 T 18 50" fill="none" stroke="#e63946" strokeWidth="1.5" />
        <line x1="16.6" y1="48.6" x2="19.4" y2="51.4" stroke="#e63946" strokeWidth="1.5" />
        <line x1="19.4" y1="48.6" x2="16.6" y2="51.4" stroke="#e63946" strokeWidth="1.5" />
      </g>
      {/* pencil tucked behind the right ear */}
      <g transform="rotate(16 46 17)">
        <rect x="44" y="9" width="4.4" height="13" fill="#f2c14e" />
        <path d="M44 22 L46.2 26.5 L48.4 22 Z" fill="#e8b98a" />
        <rect x="44" y="6.5" width="4.4" height="3" fill="#e63946" />
      </g>
      {/* head */}
      <rect x="20" y="12" width="24" height="24" rx="4" fill={SKIN} />
      <Shade x={40} y={12} w={4} h={24} rx={2} />
      {/* flat-top hair */}
      <rect x="19" y="5" width="26" height="9" rx="2" fill="#6b4a2f" />
      <rect x="19" y="13" width="4" height="6" fill="#6b4a2f" />
      {/* chunky square glasses */}
      <g fill="rgba(255,255,255,0.18)" stroke={GLASSES} strokeWidth="2.2">
        <rect x="23" y="17.5" width="8" height="7.5" rx="1" />
        <rect x="33.5" y="17.5" width="8" height="7.5" rx="1" />
      </g>
      <line x1="31" y1="21" x2="33.5" y2="21" stroke={GLASSES} strokeWidth="2.2" />
      <line x1="23" y1="21" x2="20" y2="20" stroke={GLASSES} strokeWidth="2.2" />
      <line x1="41.5" y1="21" x2="44" y2="20" stroke={GLASSES} strokeWidth="2.2" />
      <circle cx="27" cy="21.2" r="1.5" fill="#20242e" stroke="none" />
      <circle cx="37.5" cy="21.2" r="1.5" fill="#20242e" stroke="none" />
      <path d="M28 30.5 Q 32 33 36 30.5" fill="none" stroke="#20242e" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

/** Child: single big blonde curl, monocle with chain, bright shirt, rosy cheek. */
function Child() {
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <Shadow rx={12} />
      {/* legs + shoes */}
      <rect x="25" y="58" width="5" height="5" fill={SKIN_LIGHT} />
      <rect x="34" y="58" width="5" height="5" fill={SKIN_LIGHT} />
      <rect x="23.5" y="61.5" width="7.5" height="4" rx="2" fill="#e63946" />
      <rect x="32.5" y="61.5" width="7.5" height="4" rx="2" fill="#e63946" />
      {/* shorts + shirt + stubby arms */}
      <rect x="23" y="50" width="18" height="9" fill="#4a90d9" />
      <rect x="22" y="38" width="20" height="13" rx="3" fill="#ffd166" />
      <rect x="16" y="40" width="7" height="10" rx="3" fill="#ffd166" />
      <rect x="41" y="40" width="7" height="10" rx="3" fill="#ffd166" />
      {/* head */}
      <rect x="22" y="18" width="20" height="20" rx="4" fill={SKIN_LIGHT} />
      <Shade x={38} y={18} w={4} h={20} rx={2} />
      {/* the one big curly blonde hair: a loop-de-loop */}
      <path
        d="M32 18 C 24 18 23 7 31 7 C 38 7 39 14 33 15 C 29.5 15.6 28.5 12.5 31 11.5"
        fill="none"
        stroke="#f2c14e"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* eyes + smile + cheek */}
      <circle cx="28" cy="26" r="1.7" fill="#20242e" stroke="none" />
      <circle cx="26" cy="30" r="1.7" fill="rgba(240,110,110,0.55)" stroke="none" />
      <path d="M28.5 31.5 Q 32 34 35.5 31.5" fill="none" stroke="#20242e" strokeWidth="1.6" strokeLinecap="round" />
      {/* old-English monocle over the right eye, with chain */}
      <circle cx="37" cy="26" r="5.6" fill="rgba(255,255,255,0.32)" stroke="#8a8f9a" strokeWidth="1.8" />
      <circle cx="37" cy="26" r="1.6" fill="#20242e" stroke="none" />
      <path d="M37 31.6 Q 40.5 38 36 44" fill="none" stroke="#8a8f9a" strokeWidth="1.3" />
      <circle cx="36" cy="44.6" r="1.1" fill="none" stroke="#8a8f9a" strokeWidth="1.2" />
    </g>
  );
}

/**
 * Generic "You": hoodie avatar. When the face scan was analyzed, the
 * figurine is personified from those features — skin tone, hair colour and
 * style, glasses, facial hair and face shape — drawn in the same blocky
 * character format as the guide figurines. Without features it falls back
 * to the raw snapshot (or a default face) in the face window.
 */
function Generic({ faceImage, features }: { faceImage: string | null; features: FaceFeatures | null }) {
  const clipId = useId();
  const skin = features?.skinTone ?? SKIN;
  const hair = features?.hairColor ?? '#9aa0a6';
  const iris = features?.eyeColor ?? '#2e2620';
  const cloth = features?.shirtColor ?? '#5f6b7a';
  const clothDark = shadeHex(cloth, 0.78);
  const clothLine = shadeHex(cloth, 0.62);
  // Head geometry follows the detected face shape; legacy photo mode keeps
  // the original fixed head.
  const head = !features
    ? { x: 20, y: 12, w: 24, h: 24, rx: 4 }
    : features.faceShape === 'long'
      ? { x: 20, y: 10, w: 24, h: 26, rx: 4 }
      : features.faceShape === 'round'
        ? { x: 20, y: 12, w: 24, h: 24, rx: 7 }
        : { x: 20, y: 12, w: 24, h: 24, rx: 3 };
  const eyeY = head.y + 10.5;
  const mouthY = head.y + 18;
  const chinY = head.y + head.h + 2; // beard spills a little below the chin, like the Historian
  return (
    <g stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round">
      <Shadow rx={15} />
      {/* legs + shoes */}
      <rect x="24" y="56" width="7" height="7" fill="#3d4652" />
      <rect x="33" y="56" width="7" height="7" fill="#3d4652" />
      <rect x="22.5" y="61.5" width="9.5" height="4" rx="2" fill="#20242e" />
      <rect x="31.5" y="61.5" width="9.5" height="4" rx="2" fill="#20242e" />
      {/* hood behind head, with a yellow rim to characterise "You";
          the cloth colour comes from the scanned shirt */}
      <path d="M18 40 Q17 26 32 26 Q47 26 46 40 L 44 40 Q45 30 32 30 Q19 30 20 40 Z" fill={features ? clothDark : '#525d6b'} />
      <path d="M20 40 Q19 30 32 30 Q45 30 44 40" fill="none" stroke="#ffd166" strokeWidth="1.6" opacity="0.9" />
      {/* hoodie body + arms in the scanned shirt colour */}
      <rect x="20" y="38" width="24" height="20" rx="3" fill={features ? cloth : '#5f6b7a'} />
      <rect x="14" y="40" width="7" height="11" rx="3" fill={features ? cloth : '#5f6b7a'} />
      <rect x="43" y="40" width="7" height="11" rx="3" fill={features ? cloth : '#5f6b7a'} />
      <line x1="32" y1="38" x2="32" y2="58" stroke={features ? clothLine : '#48525f'} />
      <path d="M26 52 H38" stroke={features ? clothLine : '#48525f'} fill="none" />
      {/* head */}
      <rect x={head.x} y={head.y} width={head.w} height={head.h} rx={head.rx} fill={features ? skin : '#d8d8de'} />
      <Shade x={head.x + head.w - 4} y={head.y} w={4} h={head.h} rx={2} />
      {features ? (
        <>
          {/* facial hair, drawn before the mouth so the smile stays readable */}
          {features.facialHair !== 'none' && (
            <g stroke="none" fill={hair}>
              {(features.facialHair === 'beard' || features.facialHair === 'goatee') && (
                <path
                  d={`M${head.x + 4} ${head.y + 14} H${head.x + head.w - 4} V${chinY - 4} Q${head.x + head.w - 4} ${chinY} 32 ${chinY} Q${head.x + 4} ${chinY} ${head.x + 4} ${chinY - 4} Z`}
                />
              )}
              {features.facialHair === 'beard' && <ellipse cx="32" cy={chinY - 3} rx="7" ry="3.2" />}
              {features.facialHair === 'goatee' && <ellipse cx="32" cy={chinY - 2} rx="3.2" ry="3.6" />}
              {/* every style keeps the mustache stroke */}
              <path d={`M27 ${mouthY - 2.6} Q32 ${mouthY + 0.6} 37 ${mouthY - 2.6} Q32 ${mouthY - 1} 27 ${mouthY - 2.6} Z`} />
            </g>
          )}
          {/* eyes (scanned iris colour + pupil) + brows (scanned thickness) */}
          {[28, 36].map((cx) => (
            <g key={cx} stroke="none">
              <circle cx={cx} cy={eyeY} r="1.9" fill={iris} />
              <circle cx={cx} cy={eyeY} r="0.9" fill="#20242e" />
            </g>
          ))}
          <line x1="25.5" y1={eyeY - 3.6} x2="30" y2={eyeY - 4} strokeWidth={features.browStyle === 'thick' ? 2.6 : 1.2} strokeLinecap="round" />
          <line x1="34" y1={eyeY - 4} x2="38.5" y2={eyeY - 3.6} strokeWidth={features.browStyle === 'thick' ? 2.6 : 1.2} strokeLinecap="round" />
          {/* mouth width from the scan (light ink over a beard) */}
          <path
            d={
              features.mouthWidth === 'wide'
                ? `M26.5 ${mouthY} Q32 ${mouthY + 3} 37.5 ${mouthY}`
                : features.mouthWidth === 'narrow'
                  ? `M29.5 ${mouthY} Q32 ${mouthY + 2.2} 34.5 ${mouthY}`
                  : `M28.5 ${mouthY} Q32 ${mouthY + 2.6} 35.5 ${mouthY}`
            }
            fill="none"
            stroke={features.facialHair === 'beard' ? '#f6f6f6' : '#20242e'}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* glasses */}
          {features.glasses === 'round' && (
            <g fill="rgba(255,255,255,0.18)" stroke={GLASSES} strokeWidth="2.2">
              <circle cx="28" cy={eyeY} r="5" />
              <circle cx="36" cy={eyeY} r="5" />
              <line x1="31" y1={eyeY - 0.6} x2="33" y2={eyeY - 0.6} />
              <line x1="23" y1={eyeY} x2="20.5" y2={eyeY - 1} />
              <line x1="41" y1={eyeY} x2="43.5" y2={eyeY - 1} />
            </g>
          )}
          {features.glasses === 'square' && (
            <g fill="rgba(255,255,255,0.18)" stroke={GLASSES} strokeWidth="2.2">
              <rect x="23.5" y={eyeY - 3.8} width="8" height="7.5" rx="1" />
              <rect x="32.5" y={eyeY - 3.8} width="8" height="7.5" rx="1" />
              <line x1="31.5" y1={eyeY} x2="32.5" y2={eyeY} />
              <line x1="23.5" y1={eyeY} x2="20.5" y2={eyeY - 1} />
              <line x1="40.5" y1={eyeY} x2="43.5" y2={eyeY - 1} />
            </g>
          )}
          {/* hair, in the detected colour + style */}
          {features.hairStyle === 'short' && (
            <g fill={hair} strokeWidth="1.6">
              <rect x="19" y={head.y - 6} width="26" height="8" rx="3" />
              <rect x="19" y={head.y + 1} width="3.4" height="5" rx="1.4" />
              <rect x="41.6" y={head.y + 1} width="3.4" height="5" rx="1.4" />
            </g>
          )}
          {features.hairStyle === 'flat' && (
            <g fill={hair} strokeWidth="1.6">
              <rect x="19" y={head.y - 7} width="26" height="9" rx="2" />
              <rect x="19" y={head.y + 1} width="4" height="7" />
              <rect x="41" y={head.y + 1} width="4" height="7" />
            </g>
          )}
          {features.hairStyle === 'curly' && (
            <g fill={hair} strokeWidth="1.6">
              <circle cx="24" cy={head.y - 2} r="4.2" />
              <circle cx="28.5" cy={head.y - 4} r="4.4" />
              <circle cx="33" cy={head.y - 4.6} r="4.4" />
              <circle cx="37.5" cy={head.y - 4} r="4.4" />
              <circle cx="41" cy={head.y - 2} r="4.2" />
              <rect x="20" y={head.y - 3} width="24" height="5" rx="2" />
            </g>
          )}
          {/* bald: no hair drawn */}
        </>
      ) : (
        <>
          {/* legacy: the captured photo embodied into the face window —
              posterized + pixelated, so it renders as a flat cartoon face */}
          <clipPath id={clipId}>
            <rect x="21.5" y="13.5" width="21" height="21" rx="3" />
          </clipPath>
          {faceImage ? (
            <g clipPath={`url(#${clipId})`}>
              <image
                href={faceImage}
                x="21.5"
                y="13.5"
                width="21"
                height="21"
                preserveAspectRatio="xMidYMid slice"
                style={{ imageRendering: 'pixelated' }}
              />
              <rect x="38.5" y="13.5" width="4" height="21" fill="rgba(0,0,0,0.10)" />
            </g>
          ) : (
            <g clipPath={`url(#${clipId})`} stroke="none">
              <rect x="21.5" y="13.5" width="21" height="21" fill={SKIN} />
              <circle cx="28" cy="22.5" r="1.7" fill="#20242e" />
              <circle cx="36" cy="22.5" r="1.7" fill="#20242e" />
              <path d="M28.5 28 Q 32 30.5 35.5 28" fill="none" stroke="#20242e" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          )}
          {/* same blocky outline as every other figurine face */}
          <rect x="21.5" y="13.5" width="21" height="21" rx="3" fill="none" stroke={OUTLINE} strokeWidth="1.8" />
          {/* hair cap */}
          <rect x="19" y="7" width="26" height="8" rx="3" fill="#9aa0a6" />
        </>
      )}
      {/* head outline, same blocky stroke as the other figurines */}
      {features && <rect x={head.x} y={head.y} width={head.w} height={head.h} rx={head.rx} fill="none" stroke={OUTLINE} strokeWidth="1.8" />}
    </g>
  );
}
