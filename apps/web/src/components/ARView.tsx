import { useCallback, useEffect, useRef, useState } from 'react';

import { ask, speechToText, type Language, type Persona } from '../api';
import { SCRIPTS, idleLine, reactLine, recognizeLine } from '../personality';
import AddHallmark from './AddHallmark';
import CameraView, { type CameraHandle, type Frame } from './CameraView';
import Compass from './Compass';
import FaceCapture from './FaceCapture';
import Figurine, { FIGURINE_LABELS, type FigurineId } from './Figurines';
import LanguagePicker from './LanguagePicker';
import MapThumb, { type Hotspot, type HotspotKind } from './MapThumb';
import ModeSlider from './ModeSlider';
import RippleLayer, { type Ripple, type RippleKind } from './RippleLayer';
import { useHeading } from '../hooks/useHeading';

interface Spot {
  id: string;
  name: string;
  note?: string;
}

interface Hallmark {
  id: string;
  name: string;
  note: string;
}

/** Built-in recognition targets (names mirror data/landmarks.json). */
const SPOTS: Spot[] = [
  { id: 'dragon-boundary', name: 'City of London dragon boundary marker' },
  { id: 'leadenhall-market', name: 'Leadenhall Market' },
  { id: 'st-pauls', name: "St Paul's Cathedral" },
  { id: 'gargoyle', name: 'Gothic gargoyle / grotesque' },
];

/** Tourist hotspots on the mini map (normalized 0..1, kept off the Thames). */
const TOURIST_HOTSPOTS: Hotspot[] = [
  { id: SPOTS[0].id, x: 0.3, y: 0.4, kind: 'tourist', label: SPOTS[0].name },
  { id: SPOTS[1].id, x: 0.62, y: 0.26, kind: 'tourist', label: SPOTS[1].name },
  { id: SPOTS[2].id, x: 0.8, y: 0.52, kind: 'tourist', label: SPOTS[2].name },
  { id: SPOTS[3].id, x: 0.46, y: 0.6, kind: 'tourist', label: SPOTS[3].name },
];

/** Spots where the other guide figurines "stand" on the mini map. */
const GUIDE_HOTSPOTS: Hotspot[] = [
  { id: 'guide-historian', x: 0.16, y: 0.24, kind: 'guide', label: 'Historian post' },
  { id: 'guide-architect', x: 0.86, y: 0.3, kind: 'guide', label: 'Architect post' },
  { id: 'guide-child', x: 0.56, y: 0.44, kind: 'guide', label: 'Child post' },
  { id: 'guide-you', x: 0.22, y: 0.56, kind: 'guide', label: 'You post' },
];

/** Slots where user-added hallmarks get starred on the map. */
const HALLMARK_SLOTS: { x: number; y: number }[] = [
  { x: 0.5, y: 0.34 },
  { x: 0.38, y: 0.28 },
  { x: 0.64, y: 0.4 },
  { x: 0.34, y: 0.46 },
  { x: 0.58, y: 0.56 },
  { x: 0.72, y: 0.36 },
  { x: 0.44, y: 0.52 },
  { x: 0.68, y: 0.6 },
];

const MODE_ORDER: FigurineId[] = ['historian', 'architect', 'child', 'generic'];

/** Per-character voices for the spoken answers (pitch/rate of speech synthesis). */
const VOICE: Record<FigurineId, { pitch: number; rate: number }> = {
  historian: { pitch: 0.5, rate: 0.78 }, // deep, slow, gravitas
  architect: { pitch: 0.95, rate: 0.97 }, // measured, precise
  child: { pitch: 1.8, rate: 1.18 }, // high, quick, excited
  generic: { pitch: 1.05, rate: 1.0 }, // neutral "you"
};



type Phase = 'idle' | 'focusing' | 'scanning' | 'done';

interface Result {
  spot: Spot;
  x: number;
  y: number;
}

const STYLES = `
@keyframes vysta-reticle-spin { to { transform: rotate(360deg); } }
@keyframes vysta-reticle-pulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.12); opacity: 0.55; }
}
.vysta-reticle { transform-box: fill-box; transform-origin: center; }
.vysta-reticle-scanning .vysta-reticle-spin { animation: vysta-reticle-spin 2.6s linear infinite; }
.vysta-reticle-scanning .vysta-reticle-pulse { animation: vysta-reticle-pulse 1s ease-in-out infinite; }
@keyframes vysta-focus-in {
  from { transform: scale(1.22); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.vysta-focus-box { animation: vysta-focus-in 0.38s cubic-bezier(0.3, 0.7, 0.4, 1) forwards; }
@keyframes vysta-scan-sweep {
  0%   { top: 0%; opacity: 0; }
  12%  { opacity: 0.8; }
  88%  { opacity: 0.8; }
  100% { top: 100%; opacity: 0; }
}
.vysta-scan-line { animation: vysta-scan-sweep 1.4s linear infinite; }
@keyframes vysta-talk-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(230,57,70,0.4); }
  100%     { box-shadow: 0 0 0 10px rgba(230,57,70,0); }
}
.vysta-talk-recording { animation: vysta-talk-pulse 1.3s ease-out infinite; }
@keyframes vysta-enlarge {
  0%   { transform: scale(0.3); opacity: 0; }
  55%  { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.vysta-enlarge { animation: vysta-enlarge 0.55s cubic-bezier(0.25, 0.9, 0.35, 1) both; }
@keyframes vysta-speak {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.045); }
}
.vysta-speak { animation: vysta-speak 0.9s ease-in-out infinite; transform-origin: 50% 90%; }
@keyframes vysta-wave {
  0%, 100% { transform: scaleY(0.3); }
  50%      { transform: scaleY(1); }
}
.vysta-wave { animation: vysta-wave 0.9s ease-in-out infinite; transform-origin: bottom; }
@keyframes vysta-reticle-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.07); }
}
.vysta-reticle-breathe { animation: vysta-reticle-breathe 3.4s ease-in-out infinite; }
@keyframes vysta-edge-glow {
  0%, 100% {
    box-shadow: 0 0 0 1.5px rgba(255,255,255,0.85), 0 0 14px rgba(255,255,255,0.35), inset 0 0 14px rgba(255,255,255,0.08);
  }
  50% {
    box-shadow: 0 0 0 2.5px rgba(255,255,255,0.95), 0 0 32px rgba(255,255,255,0.7), inset 0 0 24px rgba(255,255,255,0.16);
  }
}
.vysta-edge-glow { animation: vysta-edge-glow 2.4s ease-in-out infinite; }
@keyframes vysta-spotlight-in { from { opacity: 0; } to { opacity: 1; } }
.vysta-spotlight { animation: vysta-spotlight-in 0.6s ease-out both; }
@keyframes vysta-sheet-in {
  from { transform: translateY(26px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.vysta-sheet { animation: vysta-sheet-in 0.38s cubic-bezier(0.25, 0.8, 0.35, 1) both; }
`;

/** Static demo backdrop shown when no camera is available (desktop preview). */
function Backdrop() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        background: 'linear-gradient(#26355f 0%, #4a5a8a 42%, #c97b4a 72%, #2e2620 100%)',
      }}
    >
      <svg
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '46%' }}
      >
        <g fill="#1b2233">
          <rect x="0" y="18" width="10" height="24" />
          <rect x="12" y="10" width="8" height="32" />
          <rect x="22" y="22" width="12" height="20" />
          <rect x="36" y="14" width="9" height="28" />
          <path d="M47 42 L47 26 Q52 12 57 26 L57 42 Z" />
          <rect x="53.6" y="8" width="2.8" height="8" />
          <rect x="62" y="20" width="11" height="22" />
          <rect x="75" y="12" width="8" height="30" />
          <rect x="85" y="24" width="15" height="18" />
        </g>
        <g fill="#ffd166" opacity="0.85">
          <rect x="14" y="14" width="1.6" height="2" />
          <rect x="17" y="20" width="1.6" height="2" />
          <rect x="38" y="18" width="1.6" height="2" />
          <rect x="49" y="28" width="1.6" height="2" />
          <rect x="64" y="24" width="1.6" height="2" />
          <rect x="77" y="16" width="1.6" height="2" />
          <rect x="88" y="28" width="1.6" height="2" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Tight, organic centre reticle: a broken ring of four rounded arcs plus a
 * centre dot. Spins and pulses while scanning.
 */
function Crosshair({ scanning }: { scanning: boolean }) {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      className={scanning ? 'vysta-reticle vysta-reticle-scanning' : 'vysta-reticle'}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5, // stays above the recognition spotlight
        pointerEvents: 'none',
      }}
    >
      <g className="vysta-reticle-breathe">
        <g className="vysta-reticle-pulse">
          <g className="vysta-reticle-spin">
            <circle
              cx="19"
              cy="19"
              r="8.5"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="9 4.3"
            />
          </g>
        </g>
      </g>
      <circle cx="19" cy="19" r="1.8" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

/** Yellow focus brackets shown where the user tapped to focus. */
function FocusBox({ x, y, visible }: { x: number; y: number; visible: boolean }) {
  const s = 60;
  const c = 17;
  const corner = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: c,
    height: c,
    border: '3px solid #ffd166',
    filter: 'drop-shadow(0 0 6px rgba(255,209,102,0.8))',
    ...extra,
  });
  return (
    <div
      className="vysta-focus-box"
      style={{
        position: 'absolute',
        left: x - s / 2,
        top: y - s / 2,
        width: s,
        height: s,
        zIndex: 4,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s',
      }}
    >
      <span style={corner({ left: 0, top: 0, borderRight: 'none', borderBottom: 'none', borderRadius: '7px 0 0 0' })} />
      <span style={corner({ right: 0, top: 0, borderLeft: 'none', borderBottom: 'none', borderRadius: '0 7px 0 0' })} />
      <span style={corner({ left: 0, bottom: 0, borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 7px' })} />
      <span style={corner({ right: 0, bottom: 0, borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 7px 0' })} />
    </div>
  );
}

/** Screen rect for the identified hallmark (shared by spotlight + box). */
function computeResultRect(result: Result) {
  const width = 200;
  const height = 150;
  const left = Math.min(Math.max(result.x - width / 2, 8), window.innerWidth - width - 8);
  const top = Math.min(Math.max(result.y - height / 2, 120), window.innerHeight - height - 190);
  return { left, top, width, height };
}

/**
 * Identified hallmark: the surroundings are shadowed (spotlight), the region's
 * edges are emboldened white with a soft pulsing glow, and the label chip stays
 * yellow. Anchored at the focus point.
 */
function ResultBox({ result }: { result: Result }) {
  const rect = computeResultRect(result);
  const c = 18;
  const corner = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: c,
    height: c,
    border: '4px solid #ffffff',
    filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.95))',
    ...extra,
  });
  return (
    <>
      {/* shadow the surroundings, keep the identified area clear */}
      <div
        className="vysta-spotlight"
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          zIndex: 3,
          pointerEvents: 'none',
          boxShadow: '0 0 0 200vmax rgba(3,5,10,0.55)',
        }}
      />
      {/* emboldened, white-glowing edges on the identified hallmark */}
      <div
        className="vysta-edge-glow"
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          zIndex: 4,
          pointerEvents: 'none',
          borderRadius: 12,
          border: '2px solid rgba(255,255,255,0.92)',
        }}
      >
        <span style={corner({ left: -3, top: -3, borderRight: 'none', borderBottom: 'none', borderRadius: '10px 0 0 0' })} />
        <span style={corner({ right: -3, top: -3, borderLeft: 'none', borderBottom: 'none', borderRadius: '0 10px 0 0' })} />
        <span style={corner({ left: -3, bottom: -3, borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 10px' })} />
        <span style={corner({ right: -3, bottom: -3, borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 10px 0' })} />
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: 0,
            maxWidth: window.innerWidth - 24,
            background: 'rgba(10,14,26,0.78)',
            border: '1px solid rgba(255,209,102,0.6)',
            backdropFilter: 'blur(6px)',
            color: '#ffd166',
            fontSize: 12,
            fontWeight: 800,
            padding: '5px 10px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 0 14px rgba(255,209,102,0.35)',
          }}
        >
          ◎ {result.spot.name}
        </div>
      </div>
    </>
  );
}

const glassBtn: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'rgba(10,14,26,0.5)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
};

export default function ARView() {
  const { heading, needsPermission, requestMotion } = useHeading();

  const [mode, setMode] = useState<FigurineId>('historian');
  const [language, setLanguage] = useState<Language>('en');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const [hallmarkOpen, setHallmarkOpen] = useState(false);
  const [hallmarks, setHallmarks] = useState<Hallmark[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // voice / prompt ask state
  const cameraRef = useRef<CameraHandle>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameRef = useRef<Frame | null>(null);
  const pressedRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  // bottom character of choice: press it to enlarge to the centre and talk louder
  const [enlarged, setEnlarged] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // rotates the character's idle chatter
  const [idleTick, setIdleTick] = useState(0);
  // hotspot currently selected on the mini map
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // detail sheet opened by a minimap selection
  const [card, setCard] = useState<{ spot: Spot; kind: HotspotKind } | null>(null);

  const timersRef = useRef<number[]>([]);
  const spotIndexRef = useRef(0);
  const noticeTimerRef = useRef<number | null>(null);
  const tourIdRef = useRef(`tour-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  // Refs mirror latest mode/language so stable callbacks never go stale.
  const modeRef = useRef<Persona>(mode);
  const languageRef = useRef<Language>(language);
  modeRef.current = mode;
  languageRef.current = language;

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Slowly rotate idle lines in the bubble.
  useEffect(() => {
    const iv = window.setInterval(() => setIdleTick((t) => t + 1), 8000);
    return () => window.clearInterval(iv);
  }, []);

  // While enlarged, the character talks the answer out loud (full volume).
  useEffect(() => {
    if (!enlarged || !answer) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(answer);
    u.volume = 1;
    const v = VOICE[modeRef.current];
    u.pitch = v.pitch;
    u.rate = v.rate;
    u.lang = ({ en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' } as const)[language] ?? 'en-US';
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    return () => {
      synth.cancel();
      setSpeaking(false);
    };
  }, [enlarged, answer, language]);

  const addRipple = useCallback((x: number, y: number, kind: RippleKind) => {
    const id = ++rippleIdRef.current;
    setRipples((rs) => [...rs, { id, x, y, kind }]);
    window.setTimeout(() => {
      setRipples((rs) => rs.filter((r) => r.id !== id));
    }, 1500);
  }, []);

  const center = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  /** All scannable spots: built-in landmarks + user hallmarks. */
  const scanSpots: Spot[] = [
    ...SPOTS,
    ...hallmarks.map((h) => ({ id: h.id, name: h.name, note: h.note })),
  ];

  /** Shared ask flow for voice and typed prompts. */
  const runAsk = useCallback(
    async (q: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await ask({
          frame: frameRef.current?.dataUrl ?? '',
          question: q,
          persona: modeRef.current,
          language: languageRef.current,
          tourId: tourIdRef.current,
        });
        setAnswer(res.answerText);
        // Land the grounding box on the live view (objectFit: cover math).
        const f = frameRef.current;
        if (res.box && f) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          const scale = Math.max(w / f.width, h / f.height);
          const dispW = f.width * scale;
          const dispH = f.height * scale;
          const offX = (w - dispW) / 2;
          const offY = (h - dispH) / 2;
          const sx = offX + ((res.box.x + res.box.width / 2) / 1000) * dispW;
          const sy = offY + ((res.box.y + res.box.height / 2) / 1000) * dispH;
          const spot =
            scanSpots.find((s) => s.id === res.landmarkId) ?? { id: 'ask', name: 'Recognized spot' };
          setResult({ spot, x: sx, y: sy });
          setPhase('done');
          setFocus(null);
          addRipple(sx, sy, 'result');
          const c = center();
          addRipple(c.x, c.y, 'result');
        } else {
          const c = center();
          addRipple(c.x, c.y, 'result');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [addRipple, scanSpots],
  );

  /** Push-to-talk: hold to record, release to ask. */
  const handleTalkStart = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      setError(null);
      pressedRef.current = true;
      const r = e.currentTarget.getBoundingClientRect();
      addRipple(r.left + r.width / 2, r.top + r.height / 2, 'tap');

      // Snapshot the frame at the moment the question starts.
      frameRef.current = cameraRef.current?.captureFrame() ?? null;

      chunksRef.current = [];
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((audioStream) => {
          if (!pressedRef.current) {
            audioStream.getTracks().forEach((t) => t.stop());
            return;
          }
          const recorder = new MediaRecorder(audioStream);
          recorderRef.current = recorder;
          recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0) chunksRef.current.push(ev.data);
          };
          recorder.onstop = () => {
            audioStream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            void (async () => {
              try {
                const q = await speechToText(blob);
                setQuestion(q);
                await runAsk(q);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Speech-to-text failed');
              }
            })();
          };
          recorder.start();
          setRecording(true);
        })
        .catch(() => {
          pressedRef.current = false;
          setRecording(false);
          setError('Microphone unavailable — grant mic permission over HTTPS.');
        });
    },
    [addRipple, runAsk],
  );

  const handleTalkEnd = useCallback(() => {
    pressedRef.current = false;
    setRecording(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, []);

  const submitPrompt = useCallback(() => {
    const q = promptText.trim();
    if (!q || busy) return;
    setPromptText('');
    setPromptOpen(false);
    setQuestion(q);
    frameRef.current = cameraRef.current?.captureFrame() ?? frameRef.current;
    void runAsk(q);
  }, [promptText, busy, runAsk]);

  /** Tap on the camera = focus + recognize the space at that point. */
  const handleTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const x = e.clientX;
      const y = e.clientY;
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];

      setResult(null);
      setAnswer('');
      setSelectedId(null);
      setCard(null);
      setFocus({ x, y });
      setPhase('focusing');
      addRipple(x, y, 'tap');

      const c = center();
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('scanning');
          addRipple(c.x, c.y, 'scan');
        }, 650),
        window.setTimeout(() => {
          const spot = scanSpots[spotIndexRef.current++ % scanSpots.length];
          setResult({ spot, x, y });
          setPhase('done');
          addRipple(x, y, 'result');
          addRipple(c.x, c.y, 'result');
        }, 1900),
      );
    },
    [addRipple, scanSpots],
  );

  const handleModeChange = useCallback(
    (id: FigurineId, x: number, y: number) => {
      setMode(id);
      addRipple(x, y, 'tap');
      // "You" is editable: first selection scans the face to create the figurine.
      if (id === 'generic' && !faceImage) {
        setFaceOpen(true);
        showNotice('Scan your face to create your “You” figurine — tap 📷 anytime to change it.');
      } else {
        showNotice(SCRIPTS[id].greeting);
      }
    },
    [addRipple, faceImage, showNotice],
  );

  const handleFaceEdit = useCallback(
    (x: number, y: number) => {
      addRipple(x, y, 'tap');
      setMode('generic');
      setFaceOpen(true);
    },
    [addRipple],
  );

  const handleLanguage = useCallback(
    (lang: Language, x: number, y: number) => {
      setLanguage(lang);
      addRipple(x, y, 'tap');
    },
    [addRipple],
  );

  const handleMapTap = useCallback(
    (x: number, y: number) => addRipple(x, y, 'tap'),
    [addRipple],
  );

  /** Selecting a minimap hotspot "recognizes" it in the camera view. */
  const handleHotspotSelect = useCallback(
    (h: Hotspot, x: number, y: number) => {
      setSelectedId(h.id);
      addRipple(x, y, 'result');
      const spot = scanSpots.find((s) => s.id === h.id) ?? { id: h.id, name: h.label };
      const c = center();
      setResult({ spot, x: c.x, y: c.y - 40 });
      setPhase('done');
      setFocus(null);
      setAnswer('');
      setCard({ spot, kind: h.kind }); // …and opens its detail sheet
      const c2 = center();
      addRipple(c2.x, c2.y, 'result');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addRipple, scanSpots],
  );

  const handleFaceCaptured = useCallback(
    (dataUrl: string) => {
      setFaceImage(dataUrl);
      setFaceOpen(false);
      const c = center();
      addRipple(c.x, c.y, 'result');
      showNotice('Your “You” figurine is ready — tap 📷 on it to change the face.');
    },
    [addRipple, showNotice],
  );

  const handleHallmarkSave = useCallback(
    (name: string, note: string) => {
      const id = `hallmark-${Date.now()}`;
      setHallmarks((hs) => [...hs, { id, name, note }]);
      setHallmarkOpen(false);
      const c = center();
      addRipple(c.x, c.y, 'result');
      setSelectedId(id);
      setCard({ spot: { id, name, note }, kind: 'custom' });
      showNotice(`★ “${name}” added — scannable in the view and starred on the map.`);
    },
    [addRipple, showNotice],
  );

  const hotspots: Hotspot[] = [
    ...GUIDE_HOTSPOTS,
    ...TOURIST_HOTSPOTS,
    ...hallmarks.map((h, i) => ({
      id: h.id,
      x: HALLMARK_SLOTS[i % HALLMARK_SLOTS.length].x,
      y: HALLMARK_SLOTS[i % HALLMARK_SLOTS.length].y,
      kind: 'custom' as const,
      label: h.name,
    })),
  ];

  const scanning = phase === 'focusing' || phase === 'scanning';
  const bubble = notice
    ? notice
    : recording
      ? 'Listening…'
      : busy
        ? 'Thinking…'
        : answer
          ? `${reactLine(mode, question)} ${answer}`
          : phase === 'scanning'
            ? 'Recognizing space…'
            : result
              ? recognizeLine(mode, result.spot)
              : idleLine(mode, idleTick);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none' }}>
      <style>{STYLES}</style>

      <Backdrop />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <CameraView ref={cameraRef} onError={setError} />
      </div>

      {/* legibility scrims */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 120, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(rgba(5,8,18,0.55), transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: 210, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(transparent, rgba(5,8,18,0.65))',
        }}
      />

      {/* tap-to-focus layer (below all UI widgets) */}
      <div
        onPointerDown={handleTap}
        style={{ position: 'absolute', inset: 0, zIndex: 2, touchAction: 'none' }}
      >
        {scanning && (
          <div
            className="vysta-scan-line"
            style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <Crosshair scanning={phase === 'scanning'} />

      {focus && <FocusBox x={focus.x} y={focus.y} visible={phase !== 'done'} />}
      {result && phase === 'done' && <ResultBox result={result} />}

      {/* top-left: + key to add your own hallmark */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          addRipple(r.left + r.width / 2, r.top + r.height / 2, 'tap');
          setHallmarkOpen(true);
        }}
        title="Add your own hallmark of the city"
        style={{
          ...glassBtn,
          position: 'absolute',
          top: 'calc(12px + env(safe-area-inset-top))',
          left: 12,
          zIndex: 8,
          width: 42,
          height: 42,
          borderRadius: '50%',
          color: '#ffd166',
          fontSize: 26,
          fontWeight: 300,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        +
      </button>

      {/* top-right: translation / language adjustment */}
      <LanguagePicker language={language} onChange={handleLanguage} />

      {/* character selection at the top as a sliding scale */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(10px + env(safe-area-inset-top))',
          left: 0,
          right: 0,
          zIndex: 7,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 64px',
          pointerEvents: 'none',
        }}
      >
        <ModeSlider
          modes={MODE_ORDER}
          value={mode}
          faceImage={faceImage}
          onChange={handleModeChange}
          onFaceEdit={handleFaceEdit}
        />
      </div>

      {/* bottom-centre: prompt input (when open) or speech bubble (hidden while the detail sheet is open) */}
      {!card && (promptOpen ? (
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 118,
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            zIndex: 6,
            display: 'flex',
            gap: 7,
          }}
        >
          <input
            autoFocus
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPrompt();
            }}
            placeholder={`Ask ${FIGURINE_LABELS[mode].toLowerCase()} in ${language.toUpperCase()}…`}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'rgba(10,14,26,0.6)',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(12px) saturate(1.4)',
              color: '#fff',
              borderRadius: 999,
              padding: '10px 14px',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              addRipple(r.left + r.width / 2, r.top + r.height / 2, 'tap');
              submitPrompt();
            }}
            disabled={!promptText.trim() || busy}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '50%',
              border: 'none',
              background: promptText.trim() ? '#ffd166' : 'rgba(255,209,102,0.3)',
              color: '#0b1020',
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            ➤
          </button>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 118,
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            zIndex: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(10,14,26,0.55)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px) saturate(1.4)',
            color: '#fff',
            borderRadius: 16,
            padding: '7px 11px',
            fontSize: 12,
            lineHeight: 1.35,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 2 }}>
            <Figurine id={mode} faceImage={faceImage} size={24} />
          </span>
          <span>
            {question && answer ? (
              <>
                <span style={{ opacity: 0.65, fontSize: 11 }}>“{question}” </span>
                {bubble}
              </>
            ) : (
              bubble
            )}
          </span>
        </div>
      ))}

      {/* detail sheet opened by a minimap selection */}
      {card && (
        <div
          className="vysta-sheet"
          style={{
            position: 'absolute',
            left: 90,
            right: 118,
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            zIndex: 8,
            background: 'rgba(14,19,34,0.78)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(16px) saturate(1.4)',
            borderRadius: 20,
            padding: '13px 15px',
            color: '#fff',
            boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                padding: '3px 9px',
                borderRadius: 999,
                background:
                  card.kind === 'tourist' ? '#e63946' : card.kind === 'guide' ? '#3a86ff' : '#ffd166',
                color: card.kind === 'tourist' ? '#fff' : '#0b1020',
              }}
            >
              {card.kind === 'tourist' ? 'Landmark' : card.kind === 'guide' ? 'Guide post' : 'Your hallmark'}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                setCard(null);
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: '#fff',
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25, marginBottom: 5 }}>
            ◎ {card.spot.name}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.45, opacity: 0.92, marginBottom: 10 }}>
            <span style={{ color: '#ffd166', fontWeight: 700 }}>{FIGURINE_LABELS[mode]}: </span>
            {recognizeLine(mode, card.spot)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                addRipple(r.left + r.width / 2, r.top + r.height / 2, 'tap');
                setPromptOpen(true);
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 999,
                border: 'none',
                background: '#ffd166',
                color: '#0b1020',
                fontSize: 13,
                fontWeight: 800,
                boxShadow: '0 0 16px rgba(255,209,102,0.4)',
              }}
            >
              🎙️ Ask {FIGURINE_LABELS[mode]} about this
            </button>
          </div>
        </div>
      )}

      {/* bottom-centre controls: prompt toggle + push-to-talk */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'calc(14px + env(safe-area-inset-bottom))',
          zIndex: 6,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* bottom character of choice — mirrors the top slider; press to enlarge to centre */}
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            addRipple(r.left + r.width / 2, r.top + r.height / 2, 'tap');
            setEnlarged(true);
          }}
          title={`${FIGURINE_LABELS[mode]} — press to bring to centre`}
          style={{
            ...glassBtn,
            width: 56,
            height: 56,
            borderRadius: '50%',
            padding: 4,
            border: '1px solid rgba(255,209,102,0.55)',
            boxShadow: '0 0 0 1px rgba(255,209,102,0.25), 0 0 18px rgba(255,209,102,0.3)',
            touchAction: 'none',
          }}
        >
          <Figurine id={mode} faceImage={faceImage} size={44} />
        </button>
        {/* mic stays dead-centre: equal 56px flank buttons, 12px gaps, 68px mic */}
        <button
          onPointerDown={handleTalkStart}
          onPointerUp={handleTalkEnd}
          onPointerLeave={handleTalkEnd}
          disabled={busy}
          className={recording ? 'vysta-talk-recording' : undefined}
          title="Hold to talk"
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.9)',
            background: recording ? '#e63946' : 'rgba(10,14,26,0.55)',
            backdropFilter: 'blur(12px) saturate(1.4)',
            color: '#fff',
            fontSize: 24,
            touchAction: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {busy ? '…' : recording ? '●' : '🎙️'}
        </button>
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            addRipple(r.left + r.width / 2, r.top + r.height / 2, 'tap');
            setPromptOpen((o) => !o);
          }}
          title="Type a prompt instead"
          style={{
            ...glassBtn,
            width: 56,
            height: 56,
            borderRadius: '50%',
            color: promptOpen ? '#ffd166' : '#fff',
            fontSize: 15,
            fontWeight: 800,
            touchAction: 'none',
          }}
        >
          Aa
        </button>
      </div>

      {/* enlarged character stage: chosen figurine at centre, talks out loud on push-to-talk */}
      {enlarged && (
        <div
          onPointerDown={() => setEnlarged(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 5 }}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: '50%',
              top: '42%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              maxWidth: '86vw',
            }}
          >
            <div style={{ position: 'relative' }}>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setEnlarged(false);
                }}
                title="Back to camera"
                style={{
                  ...glassBtn,
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  zIndex: 2,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  color: '#fff',
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
              <div
                className={`vysta-enlarge ${speaking ? 'vysta-speak' : ''}`}
                style={{
                  borderRadius: '50%',
                  padding: 18,
                  background:
                    'radial-gradient(circle, rgba(255,209,102,0.22), rgba(255,209,102,0.05) 58%, transparent 72%)',
                }}
              >
                <Figurine id={mode} faceImage={faceImage} size={150} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  ...glassBtn,
                  borderRadius: 999,
                  padding: '5px 12px',
                  color: '#ffd166',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {FIGURINE_LABELS[mode]} · {language.toUpperCase()}
              </span>
              {speaking && (
                <span style={{ display: 'inline-flex', gap: 2.5, alignItems: 'flex-end', height: 14 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="vysta-wave"
                      style={{
                        width: 3,
                        height: '100%',
                        borderRadius: 2,
                        background: '#ffd166',
                        animationDelay: `${i * 0.16}s`,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
            {(answer || question || busy || recording) && (
              <div
                style={{
                  background: 'rgba(10,14,26,0.62)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(12px) saturate(1.4)',
                  color: '#fff',
                  borderRadius: 18,
                  padding: '12px 16px',
                  fontSize: 15,
                  lineHeight: 1.45,
                  maxWidth: 320,
                  textAlign: 'center',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
              >
                {question && (
                  <div style={{ opacity: 0.65, fontSize: 12, marginBottom: 4 }}>“{question}”</div>
                )}
                {recording
                  ? 'Listening…'
                  : busy
                    ? 'Thinking…'
                    : answer || `${SCRIPTS[mode].greeting} Hold 🎙️ to talk to me.`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* corners: compass + mini map with hotspots */}
      <Compass heading={heading} needsPermission={needsPermission} onEnable={requestMotion} />
      <MapThumb
        heading={heading}
        hotspots={hotspots}
        selectedId={selectedId}
        onSelect={handleHotspotSelect}
        onTap={handleMapTap}
      />

      {error && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(96px + env(safe-area-inset-top))',
            left: 12,
            right: 12,
            zIndex: 9,
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(230,57,70,0.85)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {faceOpen && (
        <FaceCapture
          mode={faceImage ? 'change' : 'create'}
          onCapture={handleFaceCaptured}
          onClose={() => setFaceOpen(false)}
          onError={setError}
        />
      )}
      {hallmarkOpen && (
        <AddHallmark onSave={handleHallmarkSave} onClose={() => setHallmarkOpen(false)} />
      )}

      <RippleLayer ripples={ripples} />
    </div>
  );
}
