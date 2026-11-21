import { useRef } from 'react';

import type { Language } from '../api';
import type { PersonaTheme } from '../personas';

export type Phase = 'idle' | 'listening' | 'thinking' | 'answer';

interface Props {
  phase: Phase;
  theme: PersonaTheme;
  language: Language;
  level: number; // 0..1 mic level
  followUps: string[];
  onTalkStart: () => void;
  onTalkEnd: () => void;
  onFollowUp: (q: string) => void;
  onBackToLive: () => void;
}

/** Hold to talk, or quick-tap to toggle (easier while aiming the camera). */
export default function Controls(props: Props) {
  const { phase, theme, language, level, followUps } = props;
  const downAt = useRef(0);
  const tapMode = useRef(false);

  const down = () => {
    if (phase === 'thinking') return;
    if (phase === 'listening' && tapMode.current) {
      tapMode.current = false;
      props.onTalkEnd();
      return;
    }
    downAt.current = Date.now();
    navigator.vibrate?.(15);
    props.onTalkStart();
  };
  const up = () => {
    if (phase !== 'listening' || tapMode.current) return;
    if (Date.now() - downAt.current < 280) {
      tapMode.current = true; // quick tap → keep listening until next tap
      return;
    }
    navigator.vibrate?.(10);
    props.onTalkEnd();
  };

  const hint = {
    idle: language === 'es' ? 'Apunta a algo · mantén para preguntar' : 'Point at something · hold to ask',
    listening: tapMode.current
      ? language === 'es' ? 'Escuchando… toca para terminar' : 'Listening… tap to finish'
      : language === 'es' ? 'Escuchando… suelta para enviar' : 'Listening… release to send',
    thinking: theme.thinking[language],
    answer: language === 'es' ? 'Mantén para preguntar otra cosa' : 'Hold to ask a follow-up',
  }[phase];

  return (
    <div className="controls">
      {phase === 'answer' && (
        <div className="chips">
          {followUps.map((q) => (
            <button key={q} className="chip" onClick={() => props.onFollowUp(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="hint" style={{ fontFamily: phase === 'thinking' ? theme.font : undefined }}>
        {hint}
      </div>
      <div className="mic-row">
        <span className="mic-side">
          {phase === 'answer' && (
            <button className="ghost" onClick={props.onBackToLive}>↺ Live</button>
          )}
        </span>
        <button
          className={`mic mic--${phase}`}
          style={{ ['--lvl' as string]: level.toFixed(3) }}
          onPointerDown={down}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Hold to ask"
        >
          <span className="mic__ring" />
          <span className="mic__icon">{phase === 'thinking' ? theme.avatar : '🎙'}</span>
        </button>
        <span className="mic-side" />
      </div>
    </div>
  );
}
