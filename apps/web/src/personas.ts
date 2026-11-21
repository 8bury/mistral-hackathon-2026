import type { Language, Persona } from './api';

export interface PersonaTheme {
  id: Persona;
  name: Record<Language, string>;
  tagline: Record<Language, string>;
  avatar: string;
  accent: string;
  accentInk: string;
  font: string;
  /** Highlight style class applied to the overlay box. */
  frame: 'sticker' | 'drafting' | 'ink';
  thinking: Record<Language, string>;
  hello: Record<Language, string>;
  followUps: Record<Language, string[]>;
}

export const PERSONAS: PersonaTheme[] = [
  {
    id: 'child',
    name: { en: 'Little Soldier', es: 'Soldadito' },
    tagline: { en: 'Playful & full of wonder', es: 'Juguetón y curioso' },
    avatar: '💂',
    accent: '#d62828',
    accentInk: '#ffffff',
    font: '"Fredoka", system-ui, sans-serif',
    frame: 'sticker',
    thinking: { en: 'Ooh, let me look…', es: 'Uy, déjame ver…' },
    hello: { en: "Hi! Point me at something cool!", es: '¡Hola! ¡Apúntame a algo chulo!' },
    followUps: {
      en: ['Why is it holding a shield?', 'Is the dragon real?', 'How old is it?'],
      es: ['¿Por qué tiene un escudo?', '¿El dragón es real?', '¿Cuántos años tiene?'],
    },
  },
  {
    id: 'architect',
    name: { en: 'The Architect', es: 'La Arquitecta' },
    tagline: { en: 'Structure, materials, intent', es: 'Estructura, materiales, intención' },
    avatar: '📐',
    accent: '#ff5a1f',
    accentInk: '#ffffff',
    font: '"IBM Plex Mono", ui-monospace, monospace',
    frame: 'drafting',
    thinking: { en: 'Measuring…', es: 'Midiendo…' },
    hello: { en: 'Show me a façade. I will read it.', es: 'Enséñame una fachada. La leeré.' },
    followUps: {
      en: ['What is it made of?', 'Who designed it?', 'Why this shape?'],
      es: ['¿De qué está hecho?', '¿Quién lo diseñó?', '¿Por qué esta forma?'],
    },
  },
  {
    id: 'historian',
    name: { en: 'The Historian', es: 'El Historiador' },
    tagline: { en: 'Dates, patrons, why it matters', es: 'Fechas, mecenas, por qué importa' },
    avatar: '📜',
    accent: '#8e1b1b',
    accentInk: '#f3e9d2',
    font: '"IM Fell English", Georgia, serif',
    frame: 'ink',
    thinking: { en: 'Consulting the archives…', es: 'Consultando los archivos…' },
    hello: { en: 'Every stone has a story. Shall we?', es: 'Cada piedra tiene una historia. ¿Vamos?' },
    followUps: {
      en: ['When was it placed here?', 'Who paid for it?', 'What did it replace?'],
      es: ['¿Cuándo se colocó?', '¿Quién lo pagó?', '¿Qué reemplazó?'],
    },
  },
  {
    id: 'you',
    name: { en: 'Your Guide', es: 'Tu Guía' },
    tagline: { en: 'You write how it answers', es: 'Tú decides cómo responde' },
    avatar: '✍️',
    accent: '#7c5cff',
    accentInk: '#ffffff',
    font: 'Inter, system-ui, sans-serif',
    frame: 'sticker',
    thinking: { en: 'Thinking it over…', es: 'Pensándolo…' },
    hello: { en: 'Tell me how you like your answers.', es: 'Dime cómo quieres tus respuestas.' },
    followUps: {
      en: ['What is this?', 'Tell me something surprising', 'Why does it matter?'],
      es: ['¿Qué es esto?', 'Cuéntame algo sorprendente', '¿Por qué importa?'],
    },
  },
];

/** Longest style text the 'you' persona sends (the server caps it too). */
export const MAX_CUSTOM_STYLE = 600;

export const personaById = (id: Persona) => PERSONAS.find((p) => p.id === id)!;
