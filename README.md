# Guitar trainer

Practise guitar chord shapes until they're automatic. The app names a chord, say **Csus4**, optionally
with a shape (_1st inversion · strings 2-3-4_). You play it, then reveal the answer or let the
microphone check you.

Triads is the first module. The app is built so other guitar concepts (scales, arpeggios, intervals)
can be added as modules alongside it.

## Features

- **Chord types:** major, minor, dim, aug, sus2, sus4, 6, m6, 7, maj7, m7, m7♭5, dim7, 7sus4
- **Shapes:** close triads on the four three-string sets; four-note chords as drop 2 (four strings) or
  shells (three notes, 5th left out), with every inversion
- **Prompts:** chord only (play it any way), or chord plus a specific inversion and string set
- **Answer:** chord tones with intervals, fretboard diagrams labelled by interval or note, a full-neck
  map and a gallery of shapes
- **Microphone (optional):**
  - _Arpeggio:_ play the notes one at a time; checks the exact shape
  - _Strum (experimental):_ checks the notes but not the shape
- **Stats:** accuracy per root and chord type and a list of your weakest cards. Cards you miss come up
  more often.
- Dark theme, works on a phone, no backend: everything is saved in the browser

## Run it

Requires Node 22 or later.

```bash
npm install
npm start
```

Then open http://localhost:4200. The microphone only works on `localhost` or over HTTPS.

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm start`         | Dev server with live reload         |
| `npm test`          | Unit and component tests (watch)    |
| `npm run test:once` | Tests, single run                   |
| `npm run lint`      | ESLint, including accessibility     |
| `npm run format`    | Prettier                            |
| `npm run build`     | Production build in `dist/`         |

Keyboard: **Space** reveals, **→** got it, **←** missed.

## How it's organised

```
src/app/
  core/                 shared by every module
    music/              note spelling, intervals, chords, voicings (pure TypeScript)
    fretboard/          tuning, placing shapes on strings, the SVG fretboard component
    practice/           stats, weighted card picking, local storage
    audio/              microphone, pitch detection, chord matching
    ui/                 icons
  modules/
    registry.ts         list of modules shown on the home screen
    triads/             the triads module: catalog, deck, session, pages
  home/                 home screen
```

Music, scheduling and detection logic is plain TypeScript with unit tests. Angular components and
services are thin layers on top of it.

### Add a chord type

Add a line to `CHORD_QUALITIES` in `src/app/modules/triads/catalog.ts`. Spelling, shapes, the
fretboard and stats follow from the intervals.

### Add a module

1. Create `src/app/modules/<name>/` with a `<name>.routes.ts`.
2. Add an entry to `MODULES` in `src/app/modules/registry.ts`. The route and the home screen card
   come from it.

## Microphone notes

- Arpeggio mode uses the McLeod pitch method ([pitchy](https://github.com/ianprime0509/pitchy)) and
  matches the last notes played against the exact pitches of the shape, up or down.
- Strum mode folds the spectrum into 12 pitch classes and compares it with the chord. Overtones make
  it less reliable; adjust **Strictness** in setup if it's too picky or too lenient.
- The browser's echo cancellation, noise suppression and auto gain are turned off, since they distort
  sustained instrument notes.

## Packaging later

The app is a static site with hash URLs (`#/triads`) and no network dependencies, so it can be
wrapped without code changes:

1. **PWA:** `ng add @angular/pwa` makes it installable and usable offline.
2. **Tauri:** a small native installer (Windows WebView2), with Android and iOS targets.
