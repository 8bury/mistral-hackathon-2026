import { useState } from 'react';

interface Props {
  onSave: (name: string, note: string) => void;
  onClose: () => void;
}

/**
 * "+" key (top-left): add your own hallmark of the city. Saved hallmarks become
 * scannable spots in the camera view and a yellow star on the mini map.
 */
export default function AddHallmark({ onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, note.trim());
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 22,
        background: 'rgba(5,8,18,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onPointerDown={onClose}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          borderRadius: 20,
          background: 'rgba(16,22,38,0.92)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
          padding: 18,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.2 }}>Add your hallmark</div>
        <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
          Name a spot you love in the city. It becomes a scannable spot in the camera view and a ★
          on the mini map.
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="e.g. My favourite coffee corner"
          maxLength={48}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 12,
            padding: '10px 12px',
            color: '#fff',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="One-line note (optional)"
          maxLength={80}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 12,
            padding: '10px 12px',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            style={{
              padding: '9px 18px',
              borderRadius: 999,
              border: 'none',
              background: name.trim() ? '#ffd166' : 'rgba(255,209,102,0.35)',
              color: '#0b1020',
              fontSize: 13,
              fontWeight: 800,
              boxShadow: name.trim() ? '0 0 18px rgba(255,209,102,0.45)' : 'none',
            }}
          >
            Add ★
          </button>
        </div>
      </div>
    </div>
  );
}
