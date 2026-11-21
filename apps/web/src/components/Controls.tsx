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
  /** Mode row: open the map sheet / the walk recap. */
  onMap: () => void;
  onRecap: () => void;
}

/** Hold to talk, or quick-tap to toggle (easier while aiming the camera). */
export default function Controls(props: Props) {
  const { phase, theme, language, level, frozen, answer } = props;
  const downAt = useRef(0);
  const tapMode = useRef(false);
  const es = language === 'es';
  const busy = phase === 'listening' || phase === 'thinking';

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
    answer: null,
  }[phase];

  return (
    <div className="controls">
      {answer}
      {hint && (
        <div className={`hint-pill hint-pill--${phase}`}>
          <span className="hint-pill__dot" />
          {hint}
        </div>
      )}
      <div className="capsule">
        {frozen && !busy ? (
          <button className="capsule__side" onClick={props.onBackToLive} aria-label={es ? 'Volver a la cámara' : 'Back to camera'}>
            <Icon name="back" size={22} />
          </button>
        ) : (
          <span className="capsule__side is-idle" aria-hidden="true">
            <Icon name="camera" size={22} />
          </span>
        )}
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
        <button
          className="capsule__side"
          onClick={props.onGallery}
          disabled={busy}
          aria-label={es ? 'Abrir galería' : 'Open gallery'}
          title={es ? 'Subir foto o vídeo' : 'Upload photo or video'}
        >
          <Icon name="gallery" size={22} />
        </button>
      </div>
      <nav className={`modes ${busy ? 'is-hidden' : ''}`} aria-label={es ? 'Modos' : 'Modes'}>
        <button onClick={props.onMap}>{es ? 'Mapa' : 'Map'}</button>
        <button className="is-on" aria-current="page">{es ? 'Preguntar' : 'Ask'}</button>
        <button onClick={props.onRecap}>{es ? 'Resumen' : 'Recap'}</button>
      </nav>
    </div>
  );
}
