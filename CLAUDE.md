# Guitar trainer

Angular 22 app (standalone, zoneless, signals) for practising guitar. It's a set of practice
modules on top of shared code, with no backend: everything is saved in the browser.

## Commands

- `npm start`: dev server on http://localhost:4200
- `npm run test:once`: all tests, single run (Vitest through `ng test`, jsdom). `npm test` watches.
  One file: `npx ng test --watch=false --include src/app/modules/notes/deck.spec.ts`
- `npm run lint`: ESLint, including the template accessibility rules
- `npm run build`: production build; warns above 4 kB of styles per component, fails above 8 kB
- `npm run format`: Prettier

Run `test:once`, `lint` and `build` before committing.

## Layout

- `src/app/core/`: shared by every module
  - `music/`, `fretboard/`: note spelling, intervals, chords, voicings, fret positions (pure TS)
  - `practice/`:
    - `PracticeRun`: the card flow
    - `Drill`: the contract a module provides
    - stats, the session log (`PracticeLog`), storage, `saved-settings.ts`
  - `audio/`: `MicListener` (played notes or a live spectrum), pitch and chord matching
  - `ui/`:
    - `practice-frame/`: session bar, start/pause/summary screens, answer buttons, keys, focus
    - `module-shell.ts`
    - `setup/` and `stats/` building blocks
    - `mic-status.ts`, `icon.ts`, `text.ts`
- `src/app/modules/<name>/`: one practice module each, registered in `modules/registry.ts`.
  `notes/` is the reference implementation. `triads/` shows a self-check module with an answer
  template and mic matching.
- `docs/adding-a-practice-module.md`: how to add a module. Follow it.

## Architecture rules

- Keep music, card and answer logic in plain TypeScript (`deck.ts`, `core/music`,
  `core/fretboard`) with unit tests. Components only wire it to the template.
- Anything a second module could use (an answer control, a stats block, a setup control) goes in
  `core/`, never inside a module.
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
- Keep the app self-contained, since packaging it as a PWA or with Tauri depends on this:
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
- Microphone logic (`note-stream.ts`, `matchers.ts`, `chroma.ts`) is pure: test it with synthetic
  input, not audio.

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
- **Line endings:** on Windows, `prettier --check` can flag files that only have CRLF line endings.
  `.gitattributes` stores LF, so check `git diff` before reformatting anything.
