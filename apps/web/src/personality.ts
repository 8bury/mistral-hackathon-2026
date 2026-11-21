import type { FigurineId } from './components/Figurines';

/**
 * Scripts per figure — each one represents the background character of its
 * theme: the Historian (a Plato-like sage), the Architect (a measuring
 * professional), the Child (a wide-eyed explorer) and You (a neutral,
 * first-person guide).
 */

export interface Script {
  /** Shown when the character is selected / brought to centre. */
  greeting: string;
  /** Lines when a space is recognized in the camera view. '{spot}' = name. */
  recognize: Record<string, string[]>;
  /** Little interjections prepended to spoken answers. */
  react: string[];
  /** Rotating idle chatter in the bubble. */
  idle: string[];
}

export const SCRIPTS: Record<FigurineId, Script> = {
  historian: {
    greeting: 'Ah, traveller — I am Plato of the Agora. Ask me of stones older than memory.',
    recognize: {
      'dragon-boundary': [
        'This dragon has guarded the City since medieval times — I knew its grandfather, so to speak.',
        'The dragon with the red cross and shield: heraldic guardian of the City since the 14th century.',
      ],
      'leadenhall-market': [
        'Leadenhall Market, 1881 — Horace Jones raised it before I finished the Republic. Iron and glass, beautifully done.',
        'A Victorian market hall: note the ornate cast-iron roof spanning the street.',
      ],
      'st-pauls': [
        "Wren's dome — I debated geometry in its shadow in my youth. Tallest in London for 300 years.",
        'St Paul’s: rebuilt after the Great Fire of 1666. The Whispering Gallery works by its curved geometry alone.',
      ],
      gargoyle: [
        'A grotesque! The monks carved such faces to frighten away evil — and bad philosophy.',
        'Originally a waterspout; the decorative ones are called grotesques. This one has watched the street for centuries.',
      ],
      default: [
        'Hmm… {spot}. Let me consult my scrolls.',
        'Ah — {spot}. Its story goes back further than you think.',
      ],
    },
    react: ['Fascinating question.', 'Ah, you ask well.', 'Let me recall…', 'By Zeus, good question.'],
    idle: [
      'Tap the camera view to recognize a place — history is written in these streets.',
      'Point me at a stone and I shall tell you its age.',
    ],
  },
  architect: {
    greeting: 'Architect here — I read buildings by their bones. What shall we measure?',
    recognize: {
      'dragon-boundary': [
        'Cast-iron dragon on a granite plinth — note the cantilevered shield bracket and the riveted seams.',
        'Civic heraldry in cast iron: the shield is bolted, not welded. Good maintenance, that.',
      ],
      'leadenhall-market': [
        'Victorian iron-and-glass vault, 1881 — the roof trusses span the whole street. Elegant engineering.',
        'Leadenhall Market: wrought-iron frame, glass infill panels. A textbook 19th-century market hall.',
      ],
      'st-pauls': [
        "Wren's dome: a double shell, 112 metres high. The Whispering Gallery is pure curved geometry.",
        'St Paul’s dome — brick core, stone cladding, timber drum. Wren knew his loads.',
      ],
      gargoyle: [
        'Stone grotesque — actually a functional waterspout. See the channel carved along its back.',
        'Carved limestone gargoyle. The drip edge is worn smooth — it has done its job for centuries.',
      ],
      default: [
        'Interesting massing on {spot}. Let me sketch the section.',
        '{spot} — note the materials and proportions. Well built.',
      ],
    },
    react: ['Good question — structurally speaking.', 'Precisely.', 'Note the proportions:', 'From a load-bearing view:'],
    idle: [
      'Tap the view to scan a building — I will read its structure.',
      'Every facade tells you its materials. Look closely.',
    ],
  },
  child: {
    greeting: 'Hi hi! I’m Pip! Look at all the cool stuff around us!',
    recognize: {
      'dragon-boundary': [
        'WOW a real dragon!! Is it real?? It’s so shiny and guard-y!',
        'The dragon is holding a shield — it’s protecting the whole City!!',
      ],
      'leadenhall-market': [
        'It’s like a giant indoor playground with a glass roof!! Can we go inside??',
        'Leadenhall Market! The ceiling is made of glass — hello up there!',
      ],
      'st-pauls': [
        'The big round church with the huge dome! Can we climb to the top??',
        'St Paul’s! If you whisper on one side, your friend hears it on the other side. Magic!',
      ],
      gargoyle: [
        'Eww, a monster face on the wall! …I think it’s friendly. Hi, monster!',
        'A gargoyle! It’s like a stone guardian. Does it blink?',
      ],
      default: [
        'Ooh, what’s that — {spot}?! Tell me tell me!',
        'Wow, {spot}! Is it old? Is it secret? Tell me everything!',
      ],
    },
    react: ['Wow!', 'Really??', 'Cool!!', 'No way!'],
    idle: [
      'Tap the camera and let’s find something awesome!',
      'I spy with my little eye… something to scan!',
    ],
  },
  generic: {
    greeting: 'That’s you! I’m your guide — ask me anything about this place.',
    recognize: {
      'dragon-boundary': [
        'That’s the City of London dragon boundary marker — it marks where the historic City begins.',
        'Recognized: the dragon boundary marker. Shield and red cross — the City’s coat of arms.',
      ],
      'leadenhall-market': [
        'That’s Leadenhall Market, a Victorian covered market opened in 1881.',
        'Leadenhall Market — Sir Horace Jones’ iron-and-glass hall over Leadenhall Street.',
      ],
      'st-pauls': [
        "That’s St Paul's Cathedral — Wren's dome dominated London's skyline for 300 years.",
        'St Paul’s: rebuilt after the Great Fire of 1666, dome designed by Sir Christopher Wren.',
      ],
      gargoyle: [
        'That’s a stone gargoyle/grotesque — part waterspout, part guardian of the church above.',
        'A Gothic grotesque: decorative, unlike true gargoyles which drain rainwater.',
      ],
      default: [
        'That’s {spot}. Want the story behind it?',
        'Recognized: {spot}. Ask me anything about this spot.',
      ],
    },
    react: ['Good question.', 'Here’s what I know:', 'Noted —', 'Interesting —'],
    idle: [
      'Tap the camera view to recognize what you’re looking at.',
      'Hold the mic and ask me about any landmark you see.',
    ],
  },
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic pick so the same spot/mode always gets the same line. */
export function recognizeLine(mode: FigurineId, spot: { id: string; name: string }): string {
  const bank = SCRIPTS[mode].recognize;
  const arr = bank[spot.id] ?? bank.default;
  const line = arr[hashStr(spot.id + ':' + mode) % arr.length];
  return line.replace(/\{spot\}/g, spot.name);
}

export function reactLine(mode: FigurineId, question: string): string {
  const arr = SCRIPTS[mode].react;
  return arr[hashStr(question + ':' + mode) % arr.length];
}

export function idleLine(mode: FigurineId, tick: number): string {
  const arr = SCRIPTS[mode].idle;
  return arr[tick % arr.length];
}
