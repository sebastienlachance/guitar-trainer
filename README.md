# Guitar trainer

Practise guitar until the fretboard is automatic. Each kind of exercise is a **module**:

- **Triads:** the app names a chord, say **Csus4**, optionally with a shape (_1st inversion ·
  strings 2-3-4_). You play it, then reveal the answer or let the microphone check you.
- **Fretboard notes:** "Find **F♯** on string 5" or "Find **every G**". You answer by tapping the
  fretboard or playing the note.
- **Identify notes:** a dot appears on the neck and you name the note, from four choices or all
  twelve.
- **Identify scales:** a scale in one hand position, its root marked, and you name it: major,
  minor, pentatonic, blues or one of the modes.
- **Intervals in a scale:** a scale shape around its root. "Find the ♭3" and you tap it (or play
  it), or a note is marked and you name its interval.

Adding a module is documented in
[docs/adding-a-practice-module.md](docs/adding-a-practice-module.md).

## Use it

Open **https://sebastienlachance.github.io/guitar-trainer/** and install it as an app:

- **Chrome or Edge on a computer:** the install button at the right of the address bar.
- **Android:** the browser menu, then **Install app** (or **Add to Home screen**).
- **iPhone or iPad:** in Safari, **Share**, then **Add to Home Screen**.

Once loaded, it works offline. When a new version is out, a bar offers to reload. The microphone
works in the installed app too; Safari may ask for permission more often than other browsers.
Progress is saved in each browser, so a phone and a computer keep separate stats.

## Features

**Triads**

- **Chord types:** major, minor, dim, aug, sus2, sus4, 6, m6, 7, maj7, m7, m7♭5, dim7, 7sus4
- **Shapes:** close triads on the four three-string sets; four-note chords as drop 2 (four strings) or
  shells (three notes, 5th left out), with every inversion
- **Prompts:** chord only (play it any way), or chord plus a specific inversion and string set
- **Answer:** chord tones with intervals, fretboard diagrams labelled by interval or note, a full-neck
  map and a gallery of shapes
- **Microphone (optional):**
  - _Arpeggio:_ play the notes one at a time; checks the exact shape
  - _Strum (experimental):_ checks the notes but not the shape

**Fretboard notes**

- Any of the 12 notes (or naturals only), on chosen strings, within frets 0–5, 0–12 or 0–15
- **One string:** a single tap answers; a wrong one shows where the note really is
- **Whole neck:** find every place, one tap at a time; **Show me** reveals the rest
- Answer with a tap, the keyboard (arrows to move, Enter to choose), or by playing the note

**Identify notes**

- Any of the 12 notes (or naturals only), on chosen strings, within frets 0–5, 0–12 or 0–15
- Four choices (keys 1 to 4) or all twelve names (arrow keys and Enter)
- A wrong answer shows the right name, on the buttons and on the dot

**Identify scales**

- 12 scales: major, natural, harmonic and melodic minor, major and minor pentatonic, blues, and
  the modes Dorian, Phrygian, Lydian, Mixolydian and Locrian
- Each question shows one position (four frets and a stretch), with the root on the 6th or 5th
  string
- After answering, the dots show their intervals and the scale's formula appears

**Intervals in a scale**

- **Find it:** tap the asked interval anywhere in the position, or play it into the microphone
- **Name it:** one note of the scale is marked; pick its interval (keys 1 to 7)
- The neck shows the whole scale shape as faint rings around the roots, or only the roots
- Any of the 12 scales, with the root on the 6th or 5th string; the root changes every question,
  so you learn the shape, not the frets
- After answering, every note shows its interval, a wrong tap says which interval it was, and the
  formula appears

**Every module**

- **Sessions:** start a timed session and see the clock, the answers and your accuracy as you go.
  The clock counts active time only: it stops after 2 minutes without an answer and while paused.
  Finished sessions appear in a history on the stats page, and a session interrupted by closing the
  tab is still saved.
- **Stats:** accuracy grids and a list of your weakest cards. Cards you miss come up more often.
- Dark theme, works on a phone, no backend: everything is saved in the browser

## Run it

Requires Node 22 or later.

```bash
npm install
npm start
```

Then open http://localhost:4200. The microphone only works on `localhost` or over HTTPS.

| Command                | What it does                     |
| ---------------------- | -------------------------------- |
| `npm start`            | Dev server with live reload      |
| `npm test`             | Unit and component tests (watch) |
| `npm run test:once`    | Tests, single run                |
| `npm run lint`         | ESLint, including accessibility  |
| `npm run format`       | Prettier                         |
| `npm run format:check` | Prettier, check only (CI)        |
| `npm run build`        | Production build in `dist/`      |
| `npm run e2e`          | End-to-end smoke tests           |
| `npm run icons`        | Redraw the app icons and favicon |

Keyboard: **Space** reveals or moves on, **→** got it, **←** missed. On a fretboard you answer on,
arrow keys move the cursor and **Enter** chooses.

## How it's organised

```
src/app/
  core/                   shared by every module
    music/                note spelling, intervals, chords, voicings, scales (pure TypeScript)
    fretboard/            tuning, note and shape positions, the SVG fretboard (also answers taps)
    practice/             card flow (PracticeRun), the Drill contract, stats, session log, storage
    audio/                microphone, pitch detection, chord matching
    ui/                   practice frame, module top bar, setup controls, answer buttons, stats
                          blocks, icons
  modules/
    registry.ts           the modules on the home screen
    notes/                fretboard notes: the smallest complete module, a template for new ones
    triads/               triads, sus, 6th and 7th chords
    identify/             identify notes: multiple choice
    scales/               identify scales: multiple choice over a scale position
    intervals/            intervals in a scale: tap, play or multiple choice in one module
  home/                   home screen
docs/
  adding-a-practice-module.md
e2e/                      Playwright smoke tests
scripts/                  icon generator
.github/workflows/ci.yml  checks every push, deploys main to GitHub Pages
```

Music, scheduling and answer-checking logic is plain TypeScript with unit tests. Angular components
and services are thin layers on top of it.

### End-to-end tests

A small [Playwright](https://playwright.dev) suite in `e2e/` checks only what the component tests,
which run in jsdom, can't:

- phone-width layout
- real clicks on the fretboard
- the microphone, through a fake audio device
- reloads
- the production build
- the service worker: the real build, served under `/guitar-trainer/` as on GitHub Pages, keeps
  working offline

```bash
npx playwright install chromium
```

```bash
npm run e2e
```

The first command is needed once per machine. The suite serves a production build on port 4300,
so it doesn't disturb `npm start`, and the Pages-style build on port 4310. `npm run e2e:report`
opens the last report, with traces of failed tests.

### Add a practice module

Follow [docs/adding-a-practice-module.md](docs/adding-a-practice-module.md). In short: copy
`src/app/modules/notes/`, write your cards and answer logic, and add an entry to
`src/app/modules/registry.ts`. The session timer, stats, setup controls and practice screen come
from `core/`.

### Add a chord type

Add a line to `CHORD_QUALITIES` in `src/app/modules/triads/catalog.ts`. Spelling, shapes, the
fretboard and stats follow from the intervals.

## Microphone notes

- Single notes (triads arpeggio mode, fretboard notes) use the McLeod pitch method
  ([pitchy](https://github.com/ianprime0509/pitchy)). A note counts once it holds steady for about
  100 ms.
- Strum mode folds the spectrum into 12 pitch classes and compares it with the chord. Overtones make
  it less reliable; adjust **Strictness** in setup if it's too picky or too lenient.
- The mic hears pitch, not strings. When a prompt names a string, the same pitch on another string
  also counts.
- The browser's echo cancellation, noise suppression and auto gain are turned off, since they distort
  sustained instrument notes.

## Deployment

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request:

1. format check, lint, unit tests and a production build
2. the end-to-end tests (their report is attached to the run when they fail)
3. on `main` only, once both pass: deploy to GitHub Pages

The home page shows which commit is live ("Build 7eb9fc1"). The app is a progressive web app
(`@angular/service-worker`, `public/manifest.webmanifest`), and its hash URLs (`#/triads`) need no
server rewrites.

The repo's Pages source must be set to **GitHub Actions** (Settings → Pages).

**Later:** Tauri for a native installer (Windows WebView2), with Android and iOS targets. The app
needs no code changes for it.
