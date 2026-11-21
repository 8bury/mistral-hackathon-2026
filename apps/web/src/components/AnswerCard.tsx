import { useEffect, useState } from 'react';

import type { Language } from '../api';
import type { PersonaTheme } from '../personas';
import Icon from './Icon';

interface Props {
  text: string;
  theme: PersonaTheme;
  language: Language;
  /** How long the spoken answer lasts; words reveal across it. */
  durationMs: number;
  /** Bumped on replay to restart the word reveal. */
  playKey: number;
  speaking: boolean;
  question?: string;
  followUps: string[];
  onFollowUp: (q: string) => void;
  onReplay: () => void;
  onStop: () => void;
}

export default function AnswerCard(props: Props) {
  const { text, theme, language, durationMs, playKey, speaking, question, followUps } = props;
  const words = text.split(/\s+/);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const step = Math.max(60, durationMs / words.length);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= words.length) clearInterval(id);
    }, step);
    return () => clearInterval(id);
  }, [text, durationMs, words.length, playKey]);

  return (
    <section className="answer" aria-live="polite">
      <header className="answer__head">
        <span className={`avatar ${speaking ? 'is-speaking' : ''}`}>{theme.avatar}</span>
        <div className="answer__meta">
          <span className="answer__who">{theme.name[language]}</span>
          {question && <span className="answer__q">{question}</span>}
        </div>
        <button
          className="icon-btn"
          onClick={speaking ? props.onStop : props.onReplay}
          aria-label={speaking ? 'Stop' : 'Replay'}
        >
          <Icon name={speaking ? 'stop' : 'replay'} />
        </button>
      </header>
      <p className="answer__text">
        {words.map((wd, i) => (
          <span key={i} className={i < shown ? 'w is-on' : 'w'}>
            {wd}{' '}
          </span>
        ))}
      </p>
      <div className="chips">
        {followUps.map((q) => (
          <button key={q} className="chip" onClick={() => props.onFollowUp(q)}>
            {q}
          </button>
        ))}
      </div>
    </section>
  );
}
