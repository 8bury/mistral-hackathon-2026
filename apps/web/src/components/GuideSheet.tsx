import type { Language, Persona } from '../api';
import { PERSONAS } from '../personas';
import Figurine from './Figurines';

interface Props {
  persona: Persona;
  language: Language;
  onPick: (p: Persona) => void;
  onLanguage: (l: Language) => void;
  onClose: () => void;
  face: string | null;
  onFace: () => void;
  /** First-launch onboarding variant. */
  welcome?: boolean;
}

export default function GuideSheet({ persona, language, onPick, onLanguage, onClose, welcome, face, onFace }: Props) {
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
        <button className="me-card" onClick={onFace}>
          <span className="me-card__fig"><Figurine id="generic" faceImage={face} size={44} /></span>
          <span className="me-card__body">
            <span className="me-card__name">{language === 'es' ? 'Tu figura' : 'Your figurine'}</span>
            <span className="me-card__tag">
              {language === 'es' ? 'Te marca en el mapa' : 'Marks you on the map'}
            </span>
          </span>
          <span className="me-card__cta">{face ? (language === 'es' ? 'Cambiar' : 'Change') : language === 'es' ? 'Hacer selfie' : 'Take selfie'}</span>
        </button>
        <div className="guides">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              className={`guide ${p.id === persona ? 'is-on' : ''}`}
              data-persona={p.id}
              onClick={() => onPick(p.id)}
            >
              <span className="guide__avatar"><Figurine id={p.id} size={40} /></span>
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
