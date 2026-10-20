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
- **Play along:** rhythm. Strike every subdivision with the metronome, and see how early or late
  each hit was; the tempo climbs as you get steadier.
- **Chord changes:** two chords, one minute. The microphone counts every clean change, and a chart
  shows the count climbing week after week.

There's also a **tuner**, on the home screen.

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
  - Once the microphone hears the chord, the next one comes straight away, with a line saying
    which chord it heard and how fast
  - _Time limit_ (off, 5 s or 10 s): a chord not heard in time counts as a miss and shows the
    answer
- **Stats:** how fast you play each chord (recent average, green to red) or your accuracy, by
  chord type and root

**Fretboard notes**

- Any of the 12 notes (or naturals only), on chosen strings, within frets 0–5, 0–12 or 0–15
- **One string:** a single tap answers; a wrong one shows where the note really is
- **Whole neck:** find every place, one tap at a time; **Show me** reveals the rest
- Answer with a tap, the keyboard (arrows to move, Enter to choose), or by playing the note. The
  microphone hears a pitch, not a string, so a whole-neck prompt is played string by string from
  the low E up: the neck highlights the string the app is listening for

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

**Play along**

- Quarter notes, eighth notes, triplets or sixteenth notes; 2- or 4-bar takes after a bar of
  count-in
- A tick and a light on each beat, or the light only
- After each take: a strip of every hit (on the line is on the beat, above early, below late), the
  share on time, your average early or late, your spread, and misses
- Each subdivision climbs its own tempo ladder: a passed take (80% on time, at most 10% missed)
  moves it up 4 bpm, two failed takes in a row move it down 4
- **Calibrate first, once per device and input:** strike along with 8 clicks so the app can take
  off the delay of your speakers and microphone. Speakers are fine: the tick is high-pitched and
  filtered out of what the microphone times, and the app warns you if it still gets through
- Stats: each subdivision's tempo now and best, and a chart of tempo or timing take after take

**Chord changes**

- Open chords C, G, D, A, E, Am, Em, Dm and F; every pair of the chords you pick is a card
- Takes of 30 seconds, 1 or 2 minutes after a count of 3, with the chord to play shown large in a
  ring of the time left
- Counted by the microphone (a fresh strum that sounds like the next chord; any shape of it
  counts, so barre chords too) or by a tap per change (**Space**)
- After a take: the changes, how they compare with your best for the pair, the seconds per
  change, and a chart of changes a minute. A take that ties or beats your best counts as a pass,
  so the pairs you aren't speeding up on come up most
- Stats: each pair's best and last changes a minute, and its progress chart

**Tuner**

- The note you play, how many cents it's off (A = 440), and which way to turn the peg of its
  string in standard tuning: "Tune up", "Tune down to A", "In tune"
- Reads any note, so other tunings work too; only the row of strings assumes standard tuning
- Each string gets a tick once it stays within 5 cents for a second
- A steady needle: the middle of the last 7 readings, so a click or a slip of the pick doesn't
  move it; the start of each note is skipped while its attack settles. The last reading stays,
  greyed, for a second after the note fades, so you can read it while turning the peg
- Uses the chosen input, such as a guitar cable

**Every module**

- **Sessions:** start a timed session and see the clock, the answers and your accuracy as you go.
  The clock counts active time only: it stops after 2 minutes without an answer and while paused.
  Finished sessions appear in a history on the stats page, and a session interrupted by closing the
  tab is still saved.
- **Progress:** a chart of your pace session after session (answers per minute, or time per
  answer), and the same in the session history.
- **Stats:** accuracy grids, and "Practise these more": the cards you miss or answer slower than
  usual, with how fast you were at first. Those cards also come up more often.
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
    ui/                   practice frame, top bar, setup controls, answer buttons, stats blocks,
                          icons
  modules/
    registry.ts           the modules on the home screen
    notes/                fretboard notes: the smallest complete module, a template for new ones
    triads/               triads, sus, 6th and 7th chords
    identify/             identify notes: multiple choice
    scales/               identify scales: multiple choice over a scale position
    intervals/            intervals in a scale: tap, play or multiple choice in one module
    rhythm/               play along: a metronome, timed strikes, a tempo ladder
    changes/              chord changes: one-minute changes, counted by the microphone
  home/                   home screen
  tuner/                  the tuner page
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

- **Choose the input** in setup, in every module that listens: the default microphone, or another
  one such as a Rocksmith Real Tone cable, which hears no room noise and nothing from the speakers.
  Browsers only name the inputs once the microphone has been allowed, so setup offers to allow it
  first. The choice holds for every module; while the chosen input is unplugged, the default
  microphone is used. Play along asks you to calibrate again after a change of input.
- Single notes (triads arpeggio mode, fretboard notes) use the McLeod pitch method
  ([pitchy](https://github.com/ianprime0509/pitchy)). A note counts once it holds steady for about
  70 ms; a moment where the pitch blurs or slips an octave doesn't restart it. Striking the string
  again counts the same note again right away; a note left ringing counts once.
- Strum mode folds the spectrum into 12 pitch classes and compares it with the chord. Overtones make
  it less reliable; adjust **Strictness** in setup if it's too picky or too lenient.
- In strum mode, only a strum made after the chord appeared counts: the last chord, still ringing,
  can't answer the next one, even when they share every note (Csus4 and Fsus2).
- The mic hears pitch, not strings. When a prompt names a string, the same pitch on another string
  also counts.
- The browser's echo cancellation, noise suppression and auto gain are turned off, since they distort
  sustained instrument notes.
- Rhythm timing reads the microphone sample by sample on the audio thread (an audio worklet), on the
  same clock as the metronome, and times each strike to within about 3 ms.

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
