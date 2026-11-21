import { useCallback, useEffect, useRef, useState } from 'react';

import { ask, recap, speechToText, textToSpeech } from './api';
import type { AnswerLanguage, AskResponse, Language, Persona, UserLocation } from './api';
import AnswerCard from './components/AnswerCard';
import CameraView, { type CameraHandle, type Frame } from './components/CameraView';
import Controls, { type Phase } from './components/Controls';
import GuideSheet from './components/GuideSheet';
import Compass from './components/Compass';
import FaceCapture from './components/FaceCapture';
import Figurine from './components/Figurines';
import Icon from './components/Icon';
import { useHeading } from './hooks/useHeading';
import MiniMap from './components/MiniMap';
import Overlay from './components/Overlay';
import { personaById } from './personas';
import { cropThumb, type Stop } from './walk';

function newTourId(): string {
  // crypto.randomUUID is undefined over plain HTTP (LAN dev server) — fall back.
  return crypto.randomUUID?.() ?? `tour-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const landmarkName = (id?: string | null) =>
  id ? id.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : null;

/** Decode a gallery image file into a capped JPEG Frame (same shape as a camera snapshot). */
async function fileToFrame(file: File): Promise<Frame | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image'));
      el.src = url;
    });
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Capture the current frame of a playing gallery video. */
function videoToFrame(video: HTMLVideoElement): Frame | null {
  if (!video.videoWidth) return null;
  const maxDim = 1024;
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height };
}

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

export default function App() {
  const cameraRef = useRef<CameraHandle>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameRef = useRef<Frame | null>(null);
  const pressedRef = useRef(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const ownedUrlRef = useRef<string | null>(null);
  const speakTimer = useRef<number>();
  // Latest GPS fix (accuracy in metres). Stays null until a fix arrives or when
  // permission is denied; the app keeps working and simply sends no location.
  const locationRef = useRef<UserLocation | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);

  const [tourId] = useState(newTourId);
  const [persona, setPersona] = useState<Persona>((store.get('vysta.persona') as Persona) ?? 'child');
  const [language, setLanguage] = useState<Language>((store.get('vysta.lang') as Language) ?? 'en');
  // The display language has an English default, but that must not force an
  // English guide answer. `auto` follows the language detected in the user's
  // transcription; picking a language in the guide sheet is an override.
  const [answerLanguage, setAnswerLanguage] = useState<AnswerLanguage>('auto');
  const personaRef = useRef(persona);
  const languageRef = useRef(language);
  const answerLanguageRef = useRef(answerLanguage);
  personaRef.current = persona;
  languageRef.current = language;
  answerLanguageRef.current = answerLanguage;
  const theme = personaById(persona);

  const [welcome, setWelcome] = useState(() => !store.get('vysta.onboarded'));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [frozenFrame, setFrozenFrame] = useState<Frame | null>(null);
  const [flash, setFlash] = useState(0);
  const [speechMs, setSpeechMs] = useState(3000);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [stops, setStops] = useState<Stop[]>([]);
  const [face, setFace] = useState<string | null>(() => store.get('vysta.face'));
  const [faceOpen, setFaceOpen] = useState(false);
  const { heading, needsPermission, requestMotion } = useHeading();

  // Gallery media: an uploaded photo becomes the frozen frame directly; a video
  // plays as the scene and its current frame is captured when the user talks.
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const galleryVideoRef = useRef<HTMLVideoElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);

  // Track the visitor's position while the app runs so /api/ask can ground the
  // answer in nearby landmarks. Non-fatal: any failure leaves locationRef null.
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(accuracy)) {
          locationRef.current = { lat: latitude, lng: longitude, accuracy };
          setLocation(locationRef.current);
        }
      },
      (err) => {
        // Keep the last good fix on transient timeouts/unavailability; drop it only if revoked.
        if (err.code === err.PERMISSION_DENIED) {
          locationRef.current = null;
          setLocation(null);
        }
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => store.set('vysta.persona', persona), [persona]);
  useEffect(() => store.set('vysta.lang', language), [language]);

  const stopAudio = () => {
    playerRef.current?.pause();
    clearTimeout(speakTimer.current);
    setSpeaking(false);
  };
  const discardAudio = () => {
    stopAudio();
    playerRef.current = null;
    if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
    ownedUrlRef.current = null;
  };
  /** No audio (mock / TTS failure): fake the speaking state for the read-along. */
  const fakeSpeak = (ms: number) => {
    setSpeaking(true);
    clearTimeout(speakTimer.current);
    speakTimer.current = window.setTimeout(() => setSpeaking(false), ms);
  };
  const replay = () => {
    setPlayKey((k) => k + 1);
    const player = playerRef.current;
    if (player) {
      player.currentTime = 0;
      player.play().catch(() => {});
    } else {
      fakeSpeak(speechMs);
    }
  };

  const answerQuestion = useCallback(
    async (question: string) => {
      setTranscript(question);
      setPhase('thinking');
      const res = await ask({
        frame: frameRef.current?.dataUrl ?? '',
        question,
        persona: personaRef.current,
        language: answerLanguageRef.current,
        tourId,
        location: locationRef.current,
      });

      let audioUrl = res.audioUrl ?? null;
      let ownsUrl = false;
      if (!audioUrl) {
        try {
          audioUrl = await textToSpeech(res.answerText, personaRef.current, languageRef.current);
          ownsUrl = audioUrl !== null;
        } catch (ttsErr) {
          console.warn('[tts]', ttsErr);
        }
      }

      // Fallback reading pace when there is no audio (mock / TTS failure).
      setSpeechMs(res.answerText.split(/\s+/).length * 320);
      setResult(res);
      const frame = frameRef.current;
      if (frame) {
        void cropThumb(frame, res.box).then((thumb) =>
          setStops((s) => [
            ...s,
            { id: `${Date.now()}`, time: Date.now(), thumb, question, answer: res.answerText, landmarkId: res.landmarkId },
          ]),
        );
      }
      setPhase('answer');
      navigator.vibrate?.([10, 40, 10]);

      if (audioUrl) {
        const player = new Audio(audioUrl);
        playerRef.current = player;
        if (ownsUrl) ownedUrlRef.current = audioUrl;
        player.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(player.duration)) setSpeechMs(player.duration * 1000);
        });
        player.addEventListener('play', () => setSpeaking(true));
        player.addEventListener('pause', () => setSpeaking(false));
        player.addEventListener('ended', () => setSpeaking(false));
        player.play().catch(() => setError('Tap anywhere to enable sound.'));
      } else {
        fakeSpeak(res.answerText.split(/\s+/).length * 320);
      }
    },
    [tourId],
  );

  const handleAudio = useCallback(
    async (audio: Blob) => {
      setPhase('thinking');
      try {
        const question = await speechToText(audio, languageRef.current);
        await answerQuestion(question);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setPhase(frameRef.current ? 'idle' : 'idle');
      }
    },
    [answerQuestion],
  );

  const handleTalkStart = useCallback(() => {
    setError(null);
    discardAudio();
    pressedRef.current = true;

    // Follow-up on the same frozen frame keeps the highlight context; a fresh
    // ask from live view snapshots a new frame (from the gallery video if one
    // is loaded, else from the camera).
    if (!frameRef.current) {
      const frame =
        (mediaKind === 'video' && galleryVideoRef.current
          ? videoToFrame(galleryVideoRef.current)
          : null) ??
        cameraRef.current?.captureFrame() ??
        null;
      if (!frame) {
        pressedRef.current = false;
        setError('Could not capture a frame. Check camera permission or pick a photo.');
        return;
      }
      frameRef.current = frame;
      setFrozenFrame(frame);
      setFlash((n) => n + 1);
    }
    setResult(null);
    setTranscript('');
    setPhase('listening');

    chunksRef.current = [];
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((audioStream) => {
        if (!pressedRef.current) {
          audioStream.getTracks().forEach((t) => t.stop());
          return;
        }
        // Mic level for the ring animation.
        const ac = new AudioContext();
        const an = ac.createAnalyser();
        an.fftSize = 256;
        ac.createMediaStreamSource(audioStream).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        let raf = 0;
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
          raf = requestAnimationFrame(tick);
        };
        tick();

        const recorder = new MediaRecorder(audioStream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          cancelAnimationFrame(raf);
          void ac.close();
          setLevel(0);
          audioStream.getTracks().forEach((t) => t.stop());
          void handleAudio(new Blob(chunksRef.current, { type: recorder.mimeType }));
        };
        recorder.start();
      })
      .catch(() => {
        pressedRef.current = false;
        // No mic (desktop demo): fall through to the mock transcript path.
        void handleAudio(new Blob());
      });
  }, [handleAudio]);

  const handleTalkEnd = useCallback(() => {
    pressedRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, []);

  const handleFollowUp = (q: string) => {
    discardAudio();
    setResult(null);
    answerQuestion(q).catch((e) => {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('idle');
    });
  };

  const backToLive = () => {
    discardAudio();
    frameRef.current = null;
    setFrozenFrame(null);
    setResult(null);
    setTranscript('');
    setMediaUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setMediaKind(null);
    setPhase('idle');
  };

  /** Gallery picker: image → frozen frame; video → plays as the scene. */
  const handlePickMedia = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      setMediaUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setMediaKind(isVideo ? 'video' : 'image');
      discardAudio();
      setResult(null);
      setTranscript('');
      frameRef.current = null;
      setFrozenFrame(null);
      if (!isVideo) {
        try {
          const frame = await fileToFrame(file);
          if (frame) {
            frameRef.current = frame;
            setFrozenFrame(frame);
            setFlash((n) => n + 1);
          }
        } catch {
          setError('That image could not be read.');
        }
      }
      setPhase('idle');
    },
    [],
  );

  return (
    <div className="app" data-persona={persona}>
      <CameraView ref={cameraRef} onError={setError} />
      {mediaKind === 'video' && mediaUrl && !frozenFrame && (
        <video
          ref={galleryVideoRef}
          className="frozen"
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      {frozenFrame && <img className="frozen" src={frozenFrame.dataUrl} alt="Frozen camera frame" />}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          void handlePickMedia(e.target.files?.[0]);
          e.target.value = ''; // allow re-picking the same file
        }}
      />
      {phase === 'idle' && <div className="reticle" />}
      {phase === 'thinking' && <div className="scan" />}
      {flash > 0 && <div key={flash} className="flash" />}

      <Overlay
        box={result?.box ?? null}
        point={result?.point ?? null}
        frameSize={frozenFrame ? { width: frozenFrame.width, height: frozenFrame.height } : null}
        theme={theme}
        label={landmarkName(result?.landmarkId)}
      />


      <header className="topbar">
        <button className="guide-chip" onClick={() => setSheetOpen(true)}>
          <span className="guide-chip__avatar"><Figurine id={theme.id} size={28} /></span>
          <span>{theme.name[language]}</span>
          <span className="guide-chip__lang">{language.toUpperCase()}</span>
          <Icon name="chevron" size={16} />
        </button>
      </header>

      {phase !== 'listening' && phase !== 'thinking' && (
        <MiniMap
          language={language}
          focusId={result?.landmarkId ?? null}
          stops={stops}
          heading={heading}
          face={face}
          location={location}
          onRecap={() =>
            recap(
              tourId,
              stops.map((s) => ({ landmarkId: s.landmarkId, question: s.question, answerText: s.answer })),
              language,
            )
          }
        />
      )}

      {phase !== 'listening' && phase !== 'thinking' && (
        <Compass heading={heading} needsPermission={needsPermission} onEnable={requestMotion} />
      )}

      {faceOpen && (
        <FaceCapture
          mode={face ? 'change' : 'create'}
          onCapture={(img) => {
            setFace(img);
            store.set('vysta.face', img);
            setFaceOpen(false);
          }}
          onClose={() => setFaceOpen(false)}
          onError={(m) => {
            setError(m);
            setFaceOpen(false);
          }}
        />
      )}

      {error && (
        <div className="toast" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <Controls
        phase={phase}
        theme={theme}
        language={language}
        level={level}
        frozen={frozenFrame !== null}
        onTalkStart={handleTalkStart}
        onTalkEnd={handleTalkEnd}
        onBackToLive={backToLive}
        onGallery={() => galleryInputRef.current?.click()}
        answer={
          result && (
            <AnswerCard
              text={result.answerText}
              theme={theme}
              language={language}
              durationMs={speechMs}
              playKey={playKey}
              speaking={speaking}
              question={transcript}
              followUps={theme.followUps[language]}
              onFollowUp={handleFollowUp}
              onReplay={replay}
              onStop={stopAudio}
            />
          )
        }
      />

      {(welcome || sheetOpen) && (
        <GuideSheet
          welcome={welcome}
          persona={persona}
          language={language}
          onPick={setPersona}
          onLanguage={(nextLanguage) => {
            setLanguage(nextLanguage);
            setAnswerLanguage(nextLanguage);
          }}
          face={face}
          onFace={() => setFaceOpen(true)}
          onClose={() => {
            if (welcome) store.set('vysta.onboarded', '1');
            setWelcome(false);
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
