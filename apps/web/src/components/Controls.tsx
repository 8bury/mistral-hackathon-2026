import { useRef, type ReactNode } from 'react';

import type { Language } from '../api';
import type { PersonaTheme } from '../personas';
import Icon from './Icon';

export type Phase = 'idle' | 'listening' | 'thinking' | 'answer';

interface Props {
  phase: Phase;
  theme: PersonaTheme;
  language: Language;
  level: number; // 0..1 mic level
  frozen: boolean;
  /** Answer panel, shown above the mic. */
  answer?: ReactNode;
  onTalkStart: () => void;
  onTalkEnd: () => void;
  onBackToLive: () => void;
  /** Open the phone gallery picker (image or video). */
  onGallery: () => void;
}

/** Hold to talk, or quick-tap to toggle (easier while aiming the camera). */
export default function Controls(props: Props) {
  const { phase, theme, language, level, frozen, answer } = props;
  const downAt = useRef(0);
  const tapMode = useRef(false);
  const es = language === 'es';

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
    idle: es ? 'Mantén para preguntar por lo que ves' : 'Hold to ask about what you see',
    listening: tapMode.current
      ? es ? 'Escuchando. Toca para terminar' : 'Listening. Tap to finish'
      : es ? 'Escuchando. Suelta para enviar' : 'Listening. Release to send',
    thinking: theme.thinking[language],
    answer: es ? 'Mantén para preguntar otra cosa' : 'Hold to ask a follow-up',
  }[phase];

  return (
    <div className="controls">
      {answer}
      <div className="dock">
        <span className="dock__side">
          {frozen && phase !== 'listening' && phase !== 'thinking' && (
            <button className="pill-btn" onClick={props.onBackToLive}>
              <Icon name="back" size={18} />
              {es ? 'Cámara' : 'Camera'}
            </button>
          )}
        </span>
        <button
          className={`mic mic--${phase}`}
          style={{ ['--lvl' as string]: level.toFixed(3) }}
          onPointerDown={down}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={es ? 'Mantén para preguntar' : 'Hold to ask'}
          disabled={phase === 'thinking'}
        >
          <span className="mic__ring" />
          {phase === 'thinking' ? <span className="spinner" /> : <Icon name="mic" size={30} />}
        </button>
        <span className="dock__side" style={{ justifyContent: 'flex-end' }}>
          {phase !== 'listening' && phase !== 'thinking' && (
            <button
              className="icon-btn"
              onClick={props.onGallery}
              aria-label={es ? 'Abrir galería' : 'Open gallery'}
              title={es ? 'Subir foto o vídeo' : 'Upload photo or video'}
            >
              <Icon name="gallery" size={20} />
            </button>
          )}
        </span>
      </div>
      <div className="hint">{hint}</div>
    </div>
  );
}
