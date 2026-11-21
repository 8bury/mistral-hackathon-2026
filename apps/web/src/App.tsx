import { useCallback, useEffect, useRef, useState } from 'react';

import { ask, speechToText, textToSpeech } from './api';
import type { AskResponse, Language, Persona } from './api';
import AnswerCard from './components/AnswerCard';
import CameraView, { type CameraHandle, type Frame } from './components/CameraView';
import Controls, { type Phase } from './components/Controls';
import GuideSheet from './components/GuideSheet';
import Overlay from './components/Overlay';
import { personaById } from './personas';

function newTourId(): string {
  // crypto.randomUUID is undefined over plain HTTP (LAN dev server) — fall back.
  return crypto.randomUUID?.() ?? `tour-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  const [tourId] = useState(newTourId);
  const [persona, setPersona] = useState<Persona>((store.get('vysta.persona') as Persona) ?? 'child');
  const [language, setLanguage] = useState<Language>((store.get('vysta.lang') as Language) ?? 'en');
  const personaRef = useRef(persona);
  const languageRef = useRef(language);
  personaRef.current = persona;
  languageRef.current = language;
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

  useEffect(() => store.set('vysta.persona', persona), [persona]);
  useEffect(() => store.set('vysta.lang', language), [language]);

  const stopAudio = () => {
    playerRef.current?.pause();
    playerRef.current = null;
    setSpeaking(false);
  };

  const answerQuestion = useCallback(
    async (question: string) => {
      setTranscript(question);
      setPhase('thinking');
      const res = await ask({
        frame: frameRef.current?.dataUrl ?? '',
        question,
        persona: personaRef.current,
        language: languageRef.current,
        tourId,
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
      setPhase('answer');
      navigator.vibrate?.([10, 40, 10]);

      if (audioUrl) {
        const player = new Audio(audioUrl);
        playerRef.current = player;
        player.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(player.duration)) setSpeechMs(player.duration * 1000);
        });
        player.addEventListener('play', () => setSpeaking(true));
        const done = () => {
          setSpeaking(false);
          if (ownsUrl) URL.revokeObjectURL(audioUrl!);
        };
        player.addEventListener('ended', done, { once: true });
        player.addEventListener('error', done, { once: true });
        player.play().catch(() => setError('Tap anywhere to enable sound.'));
      } else {
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), res.answerText.split(/\s+/).length * 320);
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
    stopAudio();
    pressedRef.current = true;

    // Follow-up on the same frozen frame keeps the highlight context; a fresh
    // ask from live view snapshots a new frame.
    if (!frameRef.current) {
      const frame = cameraRef.current?.captureFrame() ?? null;
      if (!frame) {
        pressedRef.current = false;
        setError('Could not capture a camera frame. Check camera permission.');
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
    stopAudio();
    setResult(null);
    answerQuestion(q).catch((e) => {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('idle');
    });
  };

  const backToLive = () => {
    stopAudio();
    frameRef.current = null;
    setFrozenFrame(null);
    setResult(null);
    setTranscript('');
    setPhase('idle');
  };

  return (
    <div className="app" data-persona={persona}>
      <CameraView ref={cameraRef} onError={() => {}} />
      {frozenFrame && <img className="frozen" src={frozenFrame.dataUrl} alt="Frozen camera frame" />}
      {phase === 'idle' && <div className="reticle" />}
      {phase === 'thinking' && <div className="scan" />}
      {flash > 0 && <div key={flash} className="flash" />}

      <Overlay
        box={result?.box ?? null}
        point={result?.point ?? null}
        frameSize={frozenFrame ? { width: frozenFrame.width, height: frozenFrame.height } : null}
        theme={theme}
      >
        {result && (
          <AnswerCard
            text={result.answerText}
            theme={theme}
            durationMs={speechMs}
            speaking={speaking}
            question={transcript}
          />
        )}
      </Overlay>

      {phase === 'listening' && transcript === '' && (
        <div className="listening-bubble">
          <span className="dots"><i /><i /><i /></span>
        </div>
      )}

      <header className="topbar">
        <button className="guide-chip" onClick={() => setSheetOpen(true)}>
          <span>{theme.avatar}</span>
          <span>{theme.name[language]}</span>
          <span className="guide-chip__lang">{language.toUpperCase()}</span>
        </button>
        {frozenFrame && <span className="frozen-tag">{language === 'es' ? 'Congelado' : 'Frozen'}</span>}
      </header>

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
        followUps={theme.followUps[language]}
        onTalkStart={handleTalkStart}
        onTalkEnd={handleTalkEnd}
        onFollowUp={handleFollowUp}
        onBackToLive={backToLive}
      />

      {(welcome || sheetOpen) && (
        <GuideSheet
          welcome={welcome}
          persona={persona}
          language={language}
          onPick={setPersona}
          onLanguage={setLanguage}
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
