import { useEffect, useState } from 'react';

import type { Language, UserLocation } from '../api';
import type { PersonaTheme } from '../personas';
import type { Stop } from '../walk';
import Figurine from './Figurines';
import Icon from './Icon';
import { MapArt, clock, placeName, routeOf, whereAmI } from './MiniMap';

interface Props {
  stops: Stop[];
  theme: PersonaTheme;
  language: Language;
  heading: number;
  face: string | null;
  location: UserLocation | null;
  /** Fetches the guide's written recap (api.recap). */
  loadRecap: () => Promise<string>;
  onOpenMap: () => void;
  onClose: () => void;
}

/** Consecutive stops at the same landmark collapse into one timeline entry. */
function groupStops(stops: Stop[]): Stop[][] {
  const groups: Stop[][] = [];
  for (const s of stops) {
    const last = groups.at(-1);
    if (last && last[0].landmarkId === s.landmarkId) last.push(s);
    else groups.push([s]);
  }
  return groups;
}

export default function Recap({ stops, theme, language, heading, face, location, loadRecap, onOpenMap, onClose }: Props) {
  const es = language === 'es';
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    if (stops.length === 0) return;
    let cancelled = false;
    loadRecap()
      .then((text) => !cancelled && setSummary(text))
      .catch((e) => !cancelled && setSummaryError(e instanceof Error ? e.message : 'Recap failed'));
    return () => {
      cancelled = true;
    };
    // Load once per opening; App caches the result while the stops are unchanged.
  }, []);

  const groups = groupStops(stops);
  const places = new Set(stops.map((s) => s.landmarkId).filter(Boolean)).size;
  const minutes = stops.length > 1 ? Math.max(1, Math.round((stops.at(-1)!.time - stops[0].time) / 60000)) : stops.length ? 1 : 0;
  const route = routeOf(stops);
  const { me } = whereAmI(stops, location);
  const weekday = new Date(stops[0]?.time ?? Date.now()).toLocaleDateString(es ? 'es' : 'en', { weekday: 'long' });
  const title = es ? `Tu paseo con ${theme.name.es}` : `Your walk with ${theme.name.en}`;

  const share = async () => {
    const text = [title, summary ?? '', ...groups.map((g) => `• ${placeName(g[0].landmarkId, es)}: “${g[0].question}”`)]
      .filter(Boolean)
      .join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        flash(es ? 'Copiado' : 'Copied');
      }
    } catch (e) {
      // Dismissing the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) flash(es ? 'No se pudo compartir' : "Couldn't share");
    }
  };
  const flash = (msg: string) => {
    setShareNote(msg);
    window.setTimeout(() => setShareNote(null), 2000);
  };

  return (
    <div className="recap-page">
      <div className="recap-page__nav">
        <button className="icon-btn" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>
          <Icon name="close" />
        </button>
      </div>

      <div className="recap-page__scroll">
        <p className="recap-page__eyebrow">{es ? 'Tu paseo' : 'Your walk'} · {weekday}</p>
        <h1 className="recap-page__title">{title}</h1>

        {stops.length === 0 ? (
          <p className="walk-empty">
            {es ? 'Aún no hay paradas. Pregunta por algo para empezar tu paseo.' : 'No stops yet. Ask about something to start your walk.'}
          </p>
        ) : (
          <>
            <div className="stats">
              <div className="stat"><b>{places}</b><span>{es ? 'Lugares' : 'Landmarks'}</span></div>
              <div className="stat"><b>{stops.length}</b><span>{es ? 'Preguntas' : 'Questions'}</span></div>
              <div className="stat"><b>{minutes}</b><span>{es ? 'Minutos' : 'Minutes'}</span></div>
            </div>

            <div className="recap-map">
              <MapArt focusId={route.at(-1)?.id ?? null} span={420} labels={false} me={me} route={route} heading={heading} face={face} />
              <button className="recap-map__open" onClick={onOpenMap}>
                <Icon name="map" size={16} />
                {es ? 'Abrir mapa' : 'Open map'}
              </button>
            </div>

            <ol className="timeline">
              {groups.map((g) => (
                <li key={g[0].id} className="timeline__item">
                  <img src={g[0].thumb} alt="" />
                  <div>
                    <b>{placeName(g[0].landmarkId, es)}</b>
                    <span className="timeline__meta">
                      {clock(g[0].time)} · {g.length} {es ? (g.length === 1 ? 'pregunta' : 'preguntas') : g.length === 1 ? 'question' : 'questions'}
                    </span>
                    <span className="timeline__q">“{g[0].question}”</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="recap-quote">
              <span className="recap-quote__who">
                <span className="avatar"><Figurine id={theme.id} size={30} /></span>
                {theme.name[language]}
              </span>
              <p>{summaryError ?? summary ?? (es ? 'Escribiendo tu resumen…' : 'Writing your recap…')}</p>
            </div>
          </>
        )}
      </div>

      {stops.length > 0 && (
        <div className="recap-page__cta">
          <button className="primary" onClick={() => void share()}>
            <Icon name="share" size={18} />
            {shareNote ?? (es ? 'Compartir mi paseo' : 'Share my walk')}
          </button>
        </div>
      )}
    </div>
  );
}
