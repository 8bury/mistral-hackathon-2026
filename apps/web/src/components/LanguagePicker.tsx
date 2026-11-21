import { useState } from 'react';

import type { Language } from '../api';

const LANGS: { code: Language; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
];

interface Props {
  language: Language;
  /** Receives the picked language plus the button's viewport centre (for the ripple). */
  onChange: (lang: Language, x: number, y: number) => void;
}

/** Top-right translation/language adjustment: globe chip opening a glass menu. */
export default function LanguagePicker({ language, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === language) ?? LANGS[0];

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(12px + env(safe-area-inset-top))',
        right: 12,
        zIndex: 8,
      }}
    >
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          onChange(language, r.left + r.width / 2, r.top + r.height / 2); // ripple on toggle too
          setOpen((o) => !o);
        }}
        title="Translation / language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '9px 12px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.28)',
          background: 'rgba(10,14,26,0.5)',
          backdropFilter: 'blur(12px) saturate(1.4)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          color: open ? '#ffd166' : '#fff',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 0.5,
          touchAction: 'none',
        }}
      >
        <span style={{ fontSize: 14 }}>🌐</span>
        {current.label}
      </button>
      {open && (
        <>
          {/* tap-away layer */}
          <div
            onPointerDown={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: -1 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: 132,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(16,22,38,0.92)',
              backdropFilter: 'blur(14px) saturate(1.4)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              padding: 5,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  onChange(l.code, r.left + r.width / 2, r.top + r.height / 2);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 9,
                  border: 'none',
                  background: l.code === language ? 'rgba(255,209,102,0.16)' : 'transparent',
                  color: l.code === language ? '#ffd166' : '#fff',
                  fontSize: 12.5,
                  fontWeight: l.code === language ? 800 : 500,
                  textAlign: 'left',
                }}
              >
                {l.name}
                <span style={{ opacity: 0.7, fontSize: 11 }}>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
