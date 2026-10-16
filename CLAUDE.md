# Guitar trainer

Angular 22 app (standalone, zoneless, signals) for practising guitar. It's a set of practice
modules on top of shared code, with no backend: everything is saved in the browser.

## Commands

- `npm start`: dev server on http://localhost:4200
- `npm run test:once`: all tests, single run (Vitest through `ng test`, jsdom). `npm test` watches.
  One file: `npx ng test --watch=false --include src/app/modules/notes/deck.spec.ts`
- `npm run lint`: ESLint, including the template accessibility rules
- `npm run build`: production build; warns above 4 kB of styles per component, fails above 8 kB
- `npm run format`: Prettier (`format:check` only checks, as CI does)
- `npm run e2e`: Playwright smoke tests in `e2e/` (first time on a machine: `npx playwright install chromium`)
- `npm run icons`: redraws the app icons and favicon from the pick glyph (`scripts/generate-icons.mjs`)

Before committing, run `format`, `test:once`, `lint` and `build`. Also run `e2e` when layout,
routing, storage, focus or the microphone changed.

## Workflow with the owner

- Propose a plan (and a mockup for anything visual) before building a feature; small fixes can go
  ahead. Ask when a choice is the owner's to make.
- Commit and push only when asked ("commit it", "commit and push"): one commit per feature on
  `main`, message in plain words, no ticket keys.
- **A push to `main` deploys** once CI passes. Follow the run read-only with
  `gh run list -R sebastienlachance/guitar-trainer` / `gh run watch <id> -R …` (the repo is
  public; `gh` itself is signed in to another account, so never push or write with it).
- Push with plain `git push origin main`. The remote URL carries the username
  (`https://sebastienlachance@github.com/...`), which picks the right GitHub account: the machine's
  default credential is a different (work) account. Keep the username in the URL.
- Commits use this repo's local identity: name Sebastien Lachance, email
  `359003+sebastienlachance@users.noreply.github.com`. Check `git config user.email` before
  committing; the global identity is a work address that must never appear in this public repo.
- Before calling a test done, make it fail once: break the code it covers, run it, restore.

## Layout

- `src/app/core/`: shared by every module
  - `music/`, `fretboard/`: note spelling, intervals, chords, voicings, the scale catalog
    (`SCALE_TYPES`), fret positions and scale positions (pure TS)
  - `practice/`:
    - `PracticeRun`: the card flow
    - `Drill`: the contract a module provides
    - stats, the session log (`PracticeLog`), storage, `saved-settings.ts`
  - `audio/`: `MicListener` (played notes or a live spectrum, plus a strum count), pitch and chord
    matching, `OnsetDetector` (string strikes: counts strums, and lets a re-picked note count again)
  - `audio/` for rhythm: `RhythmListener` (strike times on the audio clock, through
    `public/worklets/block-forwarder.js` and `AttackTimer`), `Metronome`, `timing.ts` (grid,
    scoring, calibration, leak check)
  - `ui/`:
    - `practice-frame/`: session bar, start/pause/summary screens, answer buttons, keys, focus, the
      time-limit bar
    - `module-shell.ts`
    - `setup/`, `stats/` (including the progress chart) and `answer/` (multiple-choice buttons)
      building blocks
    - `mic-status.ts`, `icon.ts`, `text.ts`, `update-banner.ts` (offers a reload for a new version),
      `take-strip.ts` (a rhythm take, hit by hit)
  - `build-info.ts`: the deployed commit, set at build time through `define`
- `src/app/modules/<name>/`: one practice module each, registered in `modules/registry.ts`.
  `notes/` is the reference implementation. `identify/` and `scales/` show multiple choice.
  `triads/` shows a self-check module with an answer template and mic matching. `intervals/` mixes
  tap, mic and multiple-choice questions in one module, and gives a card a new root each time it
  comes up (picked in `onNext`). `rhythm/` plays along with a metronome; it keeps extra storage
  (`rhythm:levels`, `rhythm:takes`) next to its stats.
- `docs/adding-a-practice-module.md`: how to add a module. Follow it.
- `e2e/`: Playwright smoke tests. `support/` holds the helpers, the one-card decks, the
  generator for the fake microphone's recordings and the static server for the Pages-style build.
- PWA: `ngsw-config.json`, `public/manifest.webmanifest`, `public/icons/`.
- `.github/workflows/ci.yml`: checks every push; deploys `main` to GitHub Pages.

## Architecture rules

- Keep music, card and answer logic in plain TypeScript (`deck.ts`, `core/music`,
  `core/fretboard`) with unit tests. Components only wire it to the template.
- Anything a second module could use (an answer control, a stats block, a setup control) goes in
  `core/`, never inside a module.
  Lint enforces one direction: nothing in `core/` may import from `modules/`. Modules must not
  import from each other either; that one isn't enforced.
- A module service:
  - is `@Service({ autoProvided: false })`, implements `Drill` and owns a `PracticeRun`
  - is provided per route by `provide<Name>()`: `[Session, { provide: Drill, useExisting: Session }]`
  - must not become a root singleton: the shared screens find the module by injecting `Drill`
    from the route
- App-wide singletons (`PracticeLog`, `MicListener`) are `@Service()`.
- Settings are plain readonly objects:
  - rebuilt from storage with `core/practice/saved-settings.ts`
  - changed through the service's `updateSettings()`
  - shown in setup pages with `<app-chip-toggles>` and `<app-segmented-choice>` bound to the
    settings signal. No Angular forms.
- Storage:
  - go through `loadJson()` / `saveJson()` only
  - keys are `<module>:settings` and `<module>:stats`, under the `guitar-trainer:v1:` prefix
  - stats are keyed by card key: never change a module's key format without migrating saved data
- Keep the app self-contained, since the PWA's offline cache and a later Tauri build depend on it:
  - hash routing (`withHashLocation()`)
  - no CDN or network assets
  - no backend

## Angular 22 conventions (newer than most examples)

- Standalone and OnPush are the defaults: don't write `standalone: true` or `changeDetection`.
- Use `input()`, `output()`, `model()`, `computed()`, `linkedSignal()` and `inject()`. Host
  bindings go in `host: {}`, not `@HostBinding` / `@HostListener`.
- Use `@if` / `@for` / `@switch`, and `[class.x]` / `[style.x]` instead of `ngClass` / `ngStyle`.
  Import only the directives a template uses.
- Use `@Service()`, not `@Injectable({ providedIn: 'root' })`.
- The app is zoneless: the view only updates when a signal it reads changes.

## UI

- Dark theme:
  - Colours only through the CSS variables in `src/styles.css` (`--accent`, `--tone`, `--danger`…).
  - Shared classes live there: `.page`, `.panel`, `.btn`, `.chip`, `.tag`, `.hint`, `.visually-hidden`.
  - Page components use `host: { class: 'page' }`.
- Accessibility:
  - one `<h1>` per page (visually hidden if needed)
  - the question sits in an `aria-live="polite"` region
  - WCAG AA contrast
  - icon-only buttons get an `aria-label`
- Phone width: everything must work at 375 px with no horizontal page scroll. Wide content (full
  fretboards, grids) scrolls inside its own container.

## Testing

- Specs sit next to the code (`*.spec.ts`), with Vitest globals (`describe`, `it`, `vi`) and the
  jest-dom matchers from `src/test-setup.ts`.
- Test behaviour through the DOM:
  - use `@testing-library/angular` and `user-event`, querying by role and accessible name
  - render module pages with their providers:
    `render(PracticePage, { providers: [...provideNotes(), provideRouter([])] })`
  - to seed settings, write them to localStorage under `STORAGE_PREFIX` before rendering
- Outside a component, create injected classes with `TestBed.runInInjectionContext`. Control time
  with `vi.useFakeTimers()` and `vi.setSystemTime()`. When a test switches to fake timers part-way,
  reset them in `afterEach`, so a failure can't leak them into the next test.
- Effects (in services and `PracticeRun`) run during change detection: after setting a signal by
  hand in a test, call `TestBed.tick()` before checking the result.
- The microphone in component tests: provide `{ provide: MicListener, useValue: fake }`, where the
  fake has `status`, `errorMessage`, `heard`, `chroma` and `strums` signals plus `start`, `retry`,
  `stop` and `clearHeard` mocks; set `heard` (MIDI numbers) or `chroma` and `strums` to "play".
  See `modules/triads/practice/practice-page.spec.ts`.
- Prefer one-card decks set through settings. When settings can't narrow the deck to one card
  (like identify scales), fix `Math.random` at 0 so the deck's first card comes up:
  `vi.spyOn(Math, 'random').mockReturnValue(0)` in component tests, `pickFirstCard()` in e2e.
- Microphone logic (`note-stream.ts`, `matchers.ts`, `chroma.ts`, `attack-timer.ts`, `timing.ts`)
  is pure: test it with synthetic input, not audio.
- Test-only helpers shared by several specs go in `*.testing.ts` files (like
  `modules/rhythm/rhythm.testing.ts`): the app build leaves them out, the spec build takes them in.
- End-to-end tests (`e2e/*.e2e.ts`) are only for what jsdom can't check:
  - real layout and phone width
  - real clicks on the fretboard
  - the microphone, through a fake audio device
  - reloads and saved data
  - the production build
  - the service worker (`pwa.e2e.ts`, against the real build served under `/guitar-trainer/`;
    every other test blocks service workers)

  Everything else is a component test. Keep the suite small. Seed one-card decks with
  `seedSettings()` so prompts are known (and other saved data with `seedStorage()`), and use the shared helpers in `e2e/support/` (for
  example `correctResult()`), so a test expecting something and one expecting its absence can't
  drift apart. Wait for the content to appear before measuring layout.

- Playwright matches accessible names as substrings: `{ name: 'E' }` also finds "D♯/E♭". Use
  `exact: true` for short names. Testing Library matches whole names by default.

## Pitfalls

- **Whitespace:** Angular removes whitespace-only text between elements, so
  `<span>F♯</span> <span>on string 5</span>` renders as "F♯on string 5". Put `{{ ' ' }}` between
  them.
- **Covered windows:** browsers pause `requestAnimationFrame` while the window is covered.
  Anything that must keep running, like mic analysis, uses a timer.
- **Microphone:** `getUserMedia` needs https or localhost. Keep echo cancellation, noise
  suppression and auto gain off (`core/audio/microphone.ts`); they distort instrument notes.
- **Fretboard cursor:** pass `cursorStart` as a new object for each question, or the keyboard
  cursor stays where the last answer was.
- **Keys in module controls:** a control that handles keys itself must call `preventDefault()`, so
  the practice frame ignores them.
- **Focus on answers:** the practice frame moves focus to a `data-autofocus` answer control only
  after keyboard use, so mouse users never see an answer that looks preselected. Keyboard tests
  must therefore start the session from the keyboard (`startSessionWithKeyboard()` in e2e, or
  pressing Enter on the focused Start session button in component tests).
- **Playwright launch options:** `test.use({ launchOptions })` is only allowed at file level. To
  vary them per test (like the fake-microphone recording), launch a browser in a fixture, as
  `e2e/microphone.e2e.ts` does.
- **Service worker:** it only runs in production builds. `ng serve` produces files whose hashes
  don't match the worker's manifest, so the worker gives up there: test it against a real build
  (`PAGES_URL` in `e2e/support/servers.ts`). The Claude desktop browser pane can't register
  service workers at all; use Playwright.
- **Base path:** the app is served from `/guitar-trainer/`. Reference files with relative URLs (no
  leading `/`), and keep `start_url` and `scope` in the manifest at `./`. In Git Bash, prefix a
  hand-run `ng build --base-href /guitar-trainer/` with `MSYS_NO_PATHCONV=1`, or the path is
  rewritten into a Windows path.
- **Stale unit tests:** Vitest 5 caches transformed modules on disk (`node_modules/.vitest-cache`)
  by default. Angular builds each spec in memory with the code it imports, and that cache only
  notices changes to the spec file, so a test could pass against an old copy of the code under
  test. `vitest-base.config.mts` (loaded through `runnerConfig` in `angular.json`) turns it off;
  keep it off. If a result ever looks stale, delete that folder.
- **The Claude desktop browser pane:** turning the microphone on there pops up a permission
  prompt on the owner's screen, and service workers don't work in it. Check mic and PWA flows in
  Playwright (fake microphone flags, as in `e2e/microphone.e2e.ts`); for a look at the screen,
  write a throwaway spec that saves `page.screenshot()` outside the repo, then delete it.
- **Rhythm timing:**
  - The metronome and the strike timing must use the **same audio context**: compare times on
    `RhythmListener.now()`, never `Date.now()` or `performance.now()`.
  - The worklet is plain JavaScript in `public/worklets/` (loaded by URL, cached by the service
    worker through `ngsw-config.json`); keep its logic in TypeScript, in `AttackTimer`.
  - The fake microphone's recording starts at a random moment relative to the metronome: e2e tests
    can check steadiness (spread) but not being on time. Calibration averages offsets as positions
    within the beat, so a constant offset near half a beat doesn't split in two.
- **One-off crashes:** a build or test run occasionally dies with a V8 "Fatal error … unreachable
  code" or a Vitest worker crash. Run it again before investigating.
- **Line endings:** on Windows, `prettier --check` can also flag files whose only difference is CRLF
  line endings; `.gitattributes` stores LF, so `git diff` shows nothing for those. Running
  `npm run format` fixes both kinds.

## Decisions

- **No Nx:** one app, builds of about 2 s, and boundaries covered by one lint rule. Revisit with a
  second app (such as a Tauri shell), shared libraries, or slow CI.
- **End-to-end tests run in Chromium only.** Add a WebKit mic test if the app is used on an
  iPhone, where Safari handles audio differently.
- **Deployment:** every push to `main` that passes all checks deploys to GitHub Pages
  (https://sebastienlachance.github.io/guitar-trainer/). There are no version tags; the home page
  shows the deployed commit. Tauri can come later for a native installer or phone app.
- **Progress is speed.** With the microphone, a wrong chord isn't recognised rather than counted
  wrong, so accuracy stays at 100%. Stats therefore keep each card's first and latest correct
  times (`earlyMs`, `recentMs`) and each session's total response time, and the scheduler adds
  _slowness_ to the miss rate: how much slower than your own median a card is, capped at +1.
  Relative, so no per-module thresholds. Unseen cards weigh 2 so the deck still gets covered.
- **Stored data only grows backwards-compatibly:** new fields are optional, the `is…` checks
  accept data without them, and code falls back (a card's average stands in for its first times).
  Never change a stored shape in a way that makes older saved data fail its check.
- **CI runs on `ubuntu-24.04`, not `ubuntu-latest`,** so a new Ubuntu release can't break
  `playwright install --with-deps` without warning. Move to a newer image on purpose, in its own
  commit, once Playwright supports it.

## Where things stand (2026-10-16)

- **Modules:** triads, fretboard notes, identify notes, identify scales, intervals in a scale,
  play along (rhythm). Live
  at https://sebastienlachance.github.io/guitar-trainer/ as an installable PWA.
- **Recently added:**
  - stats measure progress by speed (progress chart, speed grid, slow cards come up more)
  - an optional time limit in triads with the mic
  - mic successes in triads move straight to the next chord (strums must be fresh)
  - whole-neck notes prompts can be played into the mic, string by string
  - play along: a metronome and strike timing to about 3 ms (through the fake mic), calibration,
    a tempo ladder per subdivision; not yet tried by the owner with a real guitar and speakers
- **Tested by the owner:** triads in strum mode, on a computer. Not yet confirmed on a real guitar:
  single-note detection (fretboard notes, intervals, triads arpeggio), phones, iPhone Safari.
  On a real guitar (2026-10-16), triads missed D at the 12th fret of the 4th string: nothing was
  heard. `NoteStream` was loosened in response (a 45 ms grace for an unclear frame or an octave
  slip, clarity 0.85, 70 ms steady, level 0.006); not yet rechecked by the owner.
- **No task in progress.** Ideas mentioned but not requested: more modules, Tauri packaging.
