import { useCallback, useEffect, useRef, useState } from 'react';

import { ask, AskError, MOCK, recap, speechToText, textToSpeech } from './api';
import type { AnswerLanguage, AskResponse, Language, Persona, UserLocation } from './api';
import { analyzeFace, type FaceFeatures } from './faceFeatures';
import AnswerCard from './components/AnswerCard';
import CameraView, { type CameraHandle, type Frame } from './components/CameraView';
import Controls, { type Phase } from './components/Controls';
import GuideSheet from './components/GuideSheet';
import Recap from './components/Recap';
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
  // Last frame the server has for this tour; follow-ups on it omit the image
  // so the server reuses its grounding instead of re-running vision.
  const sentFrameRef = useRef<string | null>(null);
  const pressedRef = useRef(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const ownedUrlRef = useRef<string | null>(null);
  // Which persona the current audio was voiced with — if the user switches
  // character, the answer is re-voiced so the voice always matches.
  const audioPersonaRef = useRef<Persona | null>(null);
  // Refs mirror the latest values so stable callbacks never go stale.
  const resultRef = useRef<AskResponse | null>(null);
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
  resultRef.current = result;
  const [frozenFrame, setFrozenFrame] = useState<Frame | null>(null);
  const [flash, setFlash] = useState(0);
  const [speechMs, setSpeechMs] = useState(3000);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [stops, setStops] = useState<Stop[]>([]);
  const [face, setFace] = useState<string | null>(() => store.get('vysta.face'));
  // Facial features extracted from the face scan; drives the personalized "You" figurine.
  const [faceFeatures, setFaceFeatures] = useState<FaceFeatures | null>(() => {
    try {
      return JSON.parse(store.get('vysta.faceFeatures') ?? 'null') as FaceFeatures | null;
    } catch {
      return null;
    }
  });
  const [faceOpen, setFaceOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const recapCache = useRef<{ key: string; promise: Promise<string> } | null>(null);
  const { heading, needsPermission, requestMotion } = useHeading();

  // A face photo stored before feature analysis existed still gets a
  // generated vector character: decode it once and derive the features.
  useEffect(() => {
    if (!face || faceFeatures) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 256, 256);
      const feats = analyzeFace(ctx.getImageData(0, 0, 256, 256));
      setFaceFeatures(feats);
      store.set('vysta.faceFeatures', JSON.stringify(feats));
    };
    img.src = face;
    return () => {
      cancelled = true;
    };
  }, [face, faceFeatures]);

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
    audioPersonaRef.current = null;
    if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
    ownedUrlRef.current = null;
  };
  /** No audio (mock / TTS failure): fake the speaking state for the read-along. */
  const fakeSpeak = (ms: number) => {
    setSpeaking(true);
    clearTimeout(speakTimer.current);
    speakTimer.current = window.setTimeout(() => setSpeaking(false), ms);
  };
  /** (Re)generate the spoken answer with the given persona's voice and play it. */
  const voiceWith = useCallback(async (text: string, voicePersona: Persona) => {
    if (MOCK) return; // mock mode has no TTS; fakeSpeak covers the read-along UI
    try {
      const url = await textToSpeech(text, voicePersona, answerLanguageRef.current);
      if (!url) return;
      stopAudio();
      const player = new Audio(url);
      playerRef.current = player;
      audioPersonaRef.current = voicePersona;
      if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
      ownedUrlRef.current = url;
      player.addEventListener('play', () => setSpeaking(true));
      player.addEventListener('pause', () => setSpeaking(false));
      player.addEventListener('ended', () => setSpeaking(false));
      await player.play().catch(() => setError('Tap anywhere to enable sound.'));
    } catch (e) {
      console.warn('[tts]', e);
    }
  }, []);
  // Switching the guide character re-voices the current answer, so the voice
  // always matches the selected persona (not just on the next question).
  useEffect(() => {
    const res = resultRef.current;
    if (!res || audioPersonaRef.current === persona) return;
    void voiceWith(res.answerText, persona);
  }, [persona, voiceWith]);
  const replay = () => {
    setPlayKey((k) => k + 1);
    // The stored audio may be in the previous character's voice — re-voice it.
    if (resultRef.current && audioPersonaRef.current !== personaRef.current) {
      void voiceWith(resultRef.current.answerText, personaRef.current);
      return;
    }
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
      const frameUrl = frameRef.current?.dataUrl;
      const isNewFrame = !!frameUrl && frameUrl !== sentFrameRef.current;
      const req = {
        question,
        persona: personaRef.current,
        language: answerLanguageRef.current,
        tourId,
        location: locationRef.current,
      };
      let res: AskResponse;
      try {
        res = await ask({ ...req, frame: isNewFrame ? frameUrl : undefined });
      } catch (e) {
        // Server lost the tour (restart / TTL): resend the photo once.
        if (isNewFrame || !frameUrl || !(e instanceof AskError) || e.code !== 'missing_frame') throw e;
        res = await ask({ ...req, frame: frameUrl });
      }
      sentFrameRef.current = frameUrl ?? sentFrameRef.current;

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

      // The current answer is now voiced for this persona (or has no audio).
      audioPersonaRef.current = personaRef.current;
      if (audioUrl) {
        const player = new Audio(audioUrl);
        playerRef.current = player;
        if (ownsUrl) {
          if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
          ownedUrlRef.current = audioUrl;
        }
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
      // A quick tap or a failed mic yields no audio; /api/stt would 400 on it.
      if (!MOCK && audio.size < 1000) {
        setError(languageRef.current === 'es' ? 'Mantén pulsado el botón mientras hablas.' : 'Hold the button while you speak.');
        setPhase('idle');
        return;
      }
      setPhase('thinking');
      try {
        const question = (await speechToText(audio, languageRef.current)).trim();
        // Silence transcribes to ''; /api/ask would 400 on an empty question.
        if (!question) {
          setError(languageRef.current === 'es' ? 'No te he oído. Mantén pulsado y vuelve a hablar.' : "I didn't catch that. Hold the button and try again.");
          setPhase('idle');
          return;
        }
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
          // Released before the mic opened: nothing was recorded.
          audioStream.getTracks().forEach((t) => t.stop());
          setError(languageRef.current === 'es' ? 'Mantén pulsado el botón mientras hablas.' : 'Hold the button while you speak.');
          setPhase('idle');
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
        if (MOCK) {
          // No mic (desktop demo): fall through to the mock transcript path.
          void handleAudio(new Blob());
          return;
        }
        setError(languageRef.current === 'es' ? 'Micrófono no disponible. Permite el acceso al micrófono.' : 'Microphone unavailable. Allow microphone access for this site.');
        setPhase('idle');
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
          faceFeatures={faceFeatures}
          location={location}
          open={mapOpen}
          onOpen={() => setMapOpen(true)}
          onClose={() => setMapOpen(false)}
          onRecap={() => {
            setMapOpen(false);
            setRecapOpen(true);
          }}
          needsPermission={needsPermission}
          onEnableCompass={requestMotion}
        />
      )}

      {recapOpen && (
        <Recap
          stops={stops}
          theme={theme}
          language={language}
          heading={heading}
          face={face}
          faceFeatures={faceFeatures}
          location={location}
          loadRecap={() => {
            // Reuse the summary while the walk is unchanged (Map ↔ Recap hops shouldn't re-ask the server).
            const key = `${stops.length}:${language}`;
            if (recapCache.current?.key !== key) {
              const promise = recap(
                tourId,
                stops.map((s) => ({ landmarkId: s.landmarkId, question: s.question, answerText: s.answer })),
                language,
              );
              promise.catch(() => {
                if (recapCache.current?.promise === promise) recapCache.current = null;
              });
              recapCache.current = { key, promise };
            }
            return recapCache.current.promise;
          }}
          onOpenMap={() => {
            setRecapOpen(false);
            setMapOpen(true);
          }}
          onClose={() => setRecapOpen(false)}
        />
      )}

      {faceOpen && (
        <FaceCapture
          mode={face ? 'change' : 'create'}
          onCapture={(img, features) => {
            setFace(img);
            store.set('vysta.face', img);
            setFaceFeatures(features);
            store.set('vysta.faceFeatures', JSON.stringify(features));
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
        onMap={() => setMapOpen(true)}
        onRecap={() => setRecapOpen(true)}
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
              followUps={result.followUps?.length ? result.followUps : theme.followUps[language]}
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
          faceFeatures={faceFeatures}
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
