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

## Layout

- `src/app/core/`: shared by every module
  - `music/`, `fretboard/`: note spelling, intervals, chords, voicings, the scale catalog
    (`SCALE_TYPES`), fret positions and scale positions (pure TS)
  - `practice/`:
    - `PracticeRun`: the card flow
    - `Drill`: the contract a module provides
    - stats, the session log (`PracticeLog`), storage, `saved-settings.ts`
  - `audio/`: `MicListener` (played notes or a live spectrum), pitch and chord matching
  - `ui/`:
    - `practice-frame/`: session bar, start/pause/summary screens, answer buttons, keys, focus
    - `module-shell.ts`
    - `setup/`, `stats/` and `answer/` (multiple-choice buttons) building blocks
    - `mic-status.ts`, `icon.ts`, `text.ts`, `update-banner.ts` (offers a reload for a new version)
  - `build-info.ts`: the deployed commit, set at build time through `define`
- `src/app/modules/<name>/`: one practice module each, registered in `modules/registry.ts`.
  `notes/` is the reference implementation. `identify/` and `scales/` show multiple choice.
  `triads/` shows a self-check module with an answer template and mic matching. `intervals/` mixes
  tap, mic and multiple-choice questions in one module, and gives a card a new root each time it
  comes up (picked in `onNext`).
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
  with `vi.useFakeTimers()` and `vi.setSystemTime()`.
- Prefer one-card decks set through settings. When settings can't narrow the deck to one card
  (like identify scales), fix `Math.random` at 0 so the deck's first card comes up:
  `vi.spyOn(Math, 'random').mockReturnValue(0)` in component tests, `pickFirstCard()` in e2e.
- Microphone logic (`note-stream.ts`, `matchers.ts`, `chroma.ts`) is pure: test it with synthetic
  input, not audio.
- End-to-end tests (`e2e/*.e2e.ts`) are only for what jsdom can't check:
  - real layout and phone width
  - real clicks on the fretboard
  - the microphone, through a fake audio device
  - reloads and saved data
  - the production build
  - the service worker (`pwa.e2e.ts`, against the real build served under `/guitar-trainer/`;
    every other test blocks service workers)

  Everything else is a component test. Keep the suite small. Seed one-card decks with
  `seedSettings()` so prompts are known, and use the shared helpers in `e2e/support/` (for
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
  test. `vitest-base.config.ts` (loaded through `runnerConfig` in `angular.json`) turns it off;
  keep it off. If a result ever looks stale, delete that folder.
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
- **CI runs on `ubuntu-24.04`, not `ubuntu-latest`,** so a new Ubuntu release can't break
  `playwright install --with-deps` without warning. Move to a newer image on purpose, in its own
  commit, once Playwright supports it.
