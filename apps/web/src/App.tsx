import { useCallback, useRef, useState } from 'react';

import { ask, speechToText, textToSpeech } from './api';
import type { AskResponse, Language, Persona } from './api';
import CameraView, { type CameraHandle, type Frame } from './components/CameraView';
import Controls from './components/Controls';
import Overlay from './components/Overlay';

function newTourId(): string {
  // crypto.randomUUID is undefined over plain HTTP (LAN dev server) — fall back.
  return crypto.randomUUID?.() ?? `tour-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const cameraRef = useRef<CameraHandle>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameRef = useRef<Frame | null>(null);
  // True while the TALK button is held; guards the getUserMedia race.
  const pressedRef = useRef(false);

  const [tourId] = useState(newTourId);
  const [persona, setPersona] = useState<Persona>('child');
  const [language, setLanguage] = useState<Language>('en');
  // Refs mirror the latest picker values so stable callbacks never go stale.
  const personaRef = useRef<Persona>(persona);
  const languageRef = useRef<Language>(language);
  personaRef.current = persona;
  languageRef.current = language;

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [frozenFrame, setFrozenFrame] = useState<Frame | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuestion = useCallback(
    async (audio: Blob) => {
      setBusy(true);
      try {
        const question = await speechToText(audio, languageRef.current);
        setTranscript(question);
        const res = await ask({
          frame: frameRef.current?.dataUrl ?? '',
          question,
          persona: personaRef.current,
          language: languageRef.current,
          tourId,
        });
        setResult(res);
        // /api/ask returns audioUrl once wired; until then, speak the answer
        // directly via Voxtral TTS so the voice loop works end-to-end.
        const audioUrl = res.audioUrl ?? (await textToSpeech(res.answerText, personaRef.current, languageRef.current));
        if (audioUrl) {
          const player = new Audio(audioUrl);
          player.play().catch(() => setError('Audio playback was blocked — interact with the page to enable sound.'));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [tourId],
  );

  const handleTalkStart = useCallback(() => {
    setError(null);
    setResult(null);
    pressedRef.current = true;

    // Snapshot on tap: freeze the frame at the moment the question starts.
    const frame = cameraRef.current?.captureFrame() ?? null;
    if (!frame) {
      pressedRef.current = false;
      setError('Could not capture a camera frame — check camera permission.');
      return;
    }
    frameRef.current = frame;
    setFrozenFrame(frame);

    chunksRef.current = [];
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((audioStream) => {
        // Released before the mic stream resolved — do not start recording.
        if (!pressedRef.current) {
          audioStream.getTracks().forEach((t) => t.stop());
          return;
        }
        const recorder = new MediaRecorder(audioStream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          audioStream.getTracks().forEach((t) => t.stop());
          void handleQuestion(new Blob(chunksRef.current, { type: recorder.mimeType }));
        };
        recorder.start();
        setRecording(true);
      })
      .catch(() => {
        pressedRef.current = false;
        setRecording(false);
        setError('Microphone unavailable — grant mic permission over HTTPS.');
      });
  }, [handleQuestion]);

  const handleTalkEnd = useCallback(() => {
    pressedRef.current = false;
    setRecording(false);
    const recorder = recorderRef.current;
    // Guard: on touch devices pointerup and pointerleave can both fire.
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b1020', overflow: 'hidden' }}>
      <CameraView ref={cameraRef} onError={setError} />
      {frozenFrame && (
        <img
          src={frozenFrame.dataUrl}
          alt="Frozen camera frame"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <Overlay
        box={result?.box ?? null}
        point={result?.point ?? null}
        frameSize={frozenFrame ? { width: frozenFrame.width, height: frozenFrame.height } : null}
      />
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(230,57,70,0.9)',
            color: '#fff',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      <Controls
        persona={persona}
        language={language}
        recording={recording}
        busy={busy}
        transcript={transcript}
        answer={result?.answerText ?? ''}
        onPersonaChange={setPersona}
        onLanguageChange={setLanguage}
        onTalkStart={handleTalkStart}
        onTalkEnd={handleTalkEnd}
      />
    </div>
  );
}
