import type { Language, Persona } from '../api';

interface Props {
  persona: Persona;
  language: Language;
  recording: boolean;
  busy: boolean;
  transcript: string;
  answer: string;
  onPersonaChange: (p: Persona) => void;
  onLanguageChange: (l: Language) => void;
  onTalkStart: () => void;
  onTalkEnd: () => void;
}

const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'child', label: 'Child' },
  { id: 'architect', label: 'Architect' },
  { id: 'historian', label: 'Historian' },
];

export default function Controls(props: Props) {
  const {
    persona,
    language,
    recording,
    busy,
    transcript,
    answer,
    onPersonaChange,
    onLanguageChange,
    onTalkStart,
    onTalkEnd,
  } = props;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '12px 16px calc(16px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPersonaChange(p.id)}
            style={chipStyle(persona === p.id)}
          >
            {p.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {(['en', 'es'] as Language[]).map((l) => (
          <button key={l} onClick={() => onLanguageChange(l)} style={chipStyle(language === l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {transcript && <div style={{ fontSize: 13, opacity: 0.85 }}>“{transcript}”</div>}
      {answer && <div style={{ fontSize: 15, lineHeight: 1.4 }}>{answer}</div>}

      <button
        onPointerDown={onTalkStart}
        onPointerUp={onTalkEnd}
        onPointerLeave={onTalkEnd}
        disabled={busy}
        style={{
          alignSelf: 'center',
          width: 84,
          height: 84,
          borderRadius: '50%',
          border: '4px solid #fff',
          background: recording ? '#e63946' : 'rgba(255,255,255,0.25)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          touchAction: 'none',
        }}
      >
        {busy ? '…' : recording ? '●' : 'TALK'}
      </button>
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.5)',
    background: active ? '#ffd166' : 'rgba(0,0,0,0.35)',
    color: active ? '#000' : '#fff',
    fontSize: 13,
    fontWeight: active ? 700 : 400,
  };
}
