import { useEffect, useState } from 'react';

import type { PersonaTheme } from '../personas';

interface Props {
  text: string;
  theme: PersonaTheme;
  /** How long the spoken answer lasts; words reveal across it (karaoke). */
  durationMs: number;
  speaking: boolean;
  question?: string;
}

export default function AnswerCard({ text, theme, durationMs, speaking, question }: Props) {
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
  }, [text, durationMs, words.length]);

  return (
    <div className="answer" style={{ fontFamily: theme.font }}>
      <div className="answer__head">
        <span className={`avatar ${speaking ? 'is-speaking' : ''}`}>{theme.avatar}</span>
      </div>
      {question && <div className="answer__q">“{question}”</div>}
      <p className="answer__text">
        {words.map((wd, i) => (
          <span key={i} className={i < shown ? 'w is-on' : 'w'}>
            {wd}{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
