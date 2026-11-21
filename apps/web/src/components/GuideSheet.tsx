import type { Language, Persona } from '../api';
import { PERSONAS } from '../personas';

interface Props {
  persona: Persona;
  language: Language;
  onPick: (p: Persona) => void;
  onLanguage: (l: Language) => void;
  onClose: () => void;
  /** First-launch onboarding variant. */
  welcome?: boolean;
}

export default function GuideSheet({ persona, language, onPick, onLanguage, onClose, welcome }: Props) {
  return (
    <div className={welcome ? 'welcome' : 'sheet-backdrop'} onClick={welcome ? undefined : onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {welcome ? (
          <h1>{language === 'es' ? 'Elige a tu guía' : 'Choose your guide'}</h1>
        ) : (
          <div className="sheet__grab" />
        )}
        <div className="langs">
          {(['en', 'es'] as Language[]).map((l) => (
            <button key={l} className={`lang ${l === language ? 'is-on' : ''}`} onClick={() => onLanguage(l)}>
              {l === 'en' ? 'English' : 'Español'}
            </button>
          ))}
        </div>
        <div className="guides">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              className={`guide ${p.id === persona ? 'is-on' : ''}`}
              style={{ ['--accent' as string]: p.accent, fontFamily: p.font }}
              onClick={() => onPick(p.id)}
            >
              <span className="guide__avatar">{p.avatar}</span>
              <span className="guide__name">{p.name[language]}</span>
              <span className="guide__tag">{p.tagline[language]}</span>
              {p.id === persona && <span className="guide__hello">“{p.hello[language]}”</span>}
            </button>
          ))}
        </div>
        <button className="primary" onClick={onClose}>
          {welcome ? (language === 'es' ? 'Abrir cámara' : 'Open camera') : language === 'es' ? 'Listo' : 'Done'}
        </button>
      </div>
    </div>
  );
}
