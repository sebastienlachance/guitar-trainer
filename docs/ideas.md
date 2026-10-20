# Ideas

Features worth building, roughly in order of interest, then fixes and polish found in a code
review. Each one names what it would reuse. Move an idea to "Planned" once its plan is agreed, and
remove it once it ships (the README lists what exists).

## Planned

Nothing yet: pick from below.

## Later

- **Drone or backing loop.** A held root note, or a simple two-chord loop, to improvise over with
  the scale shape shown on the neck. Reuses the scale catalog, scale positions and the audio
  scheduling of `Metronome`; the plucked sound from Play it back would help. Open question: synth
  sounds only, or a few recorded loops (they'd have to be cached for offline use).
- **Scales in time.** Play a scale position up and down in eighth notes with the metronome; the
  app checks both the notes and the timing, with a tempo ladder like play along. The most
  ambitious: note detection (`MicListener`) and strike timing (`RhythmListener`) open the
  microphone separately today and would have to share one input and one audio clock.
- **Practice calendar.** A heatmap of the days you practised, and minutes per module, with a
  streak. Built from the session log (`PracticeLog`) the app already keeps; no new data needed.
- **Back up and move progress.** Everything lives in one browser: a phone and a computer keep
  separate stats, and clearing site data loses it all. Export everything under the storage prefix
  to a file, and import it elsewhere (with a check of the format version).
- **Metronome page.** A metronome on its own, like the tuner: tempo, beats per bar, accents, tap
  tempo, and a speed trainer that adds a few bpm every few bars. Reuses `Metronome` and its
  light.
- **Hear the changes.** The app plays a short progression (I–IV–V, I–vi–IV–V, ii–V–I) with
  strummed chords; you name it, or play it back. Play it back with chords: reuses `PhrasePlayer`
  (strummed chords would be plucks of each chord tone, a few milliseconds apart) and strum
  matching.
- **Reading music.** A note on a staff; you play it. Learns to read notation with the note
  detection the app already has; new is drawing the staff and the ledger lines in SVG.
- **Voice leading.** The app shows a triad shape, then names the next chord of a progression; you
  play its closest shape, moving as few fingers as possible. Builds on the triads catalog and
  shapes, with arpeggio matching.
- **Daily warm-up.** A guided 10 to 15 minutes chaining modules with timers: tune, chord changes,
  a few notes, a round of play it back. Goes with the practice calendar.
- **Record and listen back.** Record a take and hear it straight away: the quickest way to notice
  timing and buzzing notes. `MediaRecorder` on the open microphone; recordings kept only for the
  session, or saved in IndexedDB if asked.

## Small follow-ups

- **Play along:**
  - merge Next and Play into one click after a take
  - light the current slot of a strumming pattern as it plays (only the beats light today)
  - set `ownResult` on its session: the frame's "Correct" line under a take's own result says
    little
- **Tuner:**
  - string rows for other tunings (drop D, half a step down)
  - an adjustable reference pitch (A = 432 to 446)
  - a tuning-fork button in each module's top bar (leaving a module ends a running session)
- **Chord changes:** open chord diagrams for the chords of a pair.
- **Play it back:** longer melodies, more scales (minor, modes), and a choice of the start
  position; the plucked sound could also serve the drone idea above.
- **Packaging:** a Tauri build for a native installer or a phone app.
- **Testing:** a WebKit microphone test, if the app gets used on an iPhone.

## Fixes and polish

From a code review on 2026-10-20. The bugs you could hit while playing were fixed then; these are
the rest, most useful first in each group.

### Music and data

- **Root spelling in triads.** Pitch classes 1 and 8 always spell as D♭ and A♭
  (`modules/triads/catalog.ts` uses `COMMON_NOTE_NAMES`), so D♭m reveals D♭ F♭ A♭ and A♭dim
  A♭ C♭ E𝄫, where guitarists read C♯m and G♯dim. A core `chordRootName(pc, quality)` for display
  and spelling; the `"Db|minor"` stats key stays.
- **Mode spelling.** `scaleRootName()` (`core/music/scales.ts`) decides by "has a ♭3", which misses
  modes: F♯ Lydian (parent C♯ major, 7 sharps) instead of G♭ Lydian; E♭ Phrygian or Locrian and
  B♭ Locrian (parents C♭, F♭) instead of D♯ and A♯. Pick the spelling from the parent major key.
  Intervals reaches these roots.
- **Chord changes mixes tap and mic takes.** `counted` is stored but `bestPerMinute` ignores it: an
  easy tap take sets a best the mic never reaches. Filter by it there and in the chart.
- **One damaged entry empties a whole store.** The `is…` checks in `stats-store.ts`,
  `practice-log.ts`, the takes of changes and progressions, and `tempo-ladder.ts` are
  all-or-nothing, and the next save overwrites everything. Check entries one by one and drop only
  the bad ones. `isLevels` also accepts a bpm of 0 or a million: clamp it to the tempo range.
- **Reset stats** turns into "Clear stats" in the same spot: a double tap wipes the stats. Focus
  Cancel and confirm elsewhere; add a component test (it has none). It also only clears
  `StatsStore`, not takes or tempo levels, and changes, play along and progressions don't offer it.
- **Stats keys leave out difficulty.** Notes' `"G|neck"` is one card for 3 strings to fret 5 and
  for 6 strings to fret 15; identify uses one key for 4 and for 12 choices. Speed progress then
  compares unlike tasks.
- **Session history** is the one store without a cap (about 160 bytes a session, years from the
  quota). If capped, keep a rolled-up total for the history totals and the home week summary.
- `chip-toggles.ts` adds picks in click order, so tags read "on strings 5, 1, 3" until a reload
  puts them in catalog order. Emit in the options' order.

### Usability and accessibility

- **Keyboard focus is lost** starting a session from setup: the practice frame's "used the
  keyboard" flag starts false in each instance, so the first answer control isn't focused. Keep
  it in a root service.
- **Live regions created with their text** stay silent in NVDA and JAWS: the verdict
  (`practice-frame.html`), each module's `.question` inside `@if (card())`, `setup-start.ts`,
  `reset-stats.ts`, changes' result; progressions' take result has none. One always-present
  status region in the frame and a small `announce()` service.
- **Scroll position** carries over between pages: add
  `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })`.
- **Updates** are only checked on a cold start, since hash routing never navigates again: call
  `SwUpdate.checkForUpdate()` when the page becomes visible, throttled.
- **Touch targets** under 44 px on phones: the top bar's home link (about 16 px wide at phone
  width), module nav icons (36 px), chips (36 px), segments, Pause and End session.
- **Key hints** (`.kbd`, module `kbd`) measure 3.6 to 3.9:1 on amber buttons, under the 4.5:1 for
  12 px text, and show on phones: drop the opacity on `.btn-primary`, hide under
  `@media (hover: none)`.
- **Space on a focused button:** in the answered phase, Space on Pause or End session runs Next
  (`practice-frame.ts`); progressions' Space handler does the same. Play along has no Space
  shortcut at all. One core key helper for Play (rhythm, progressions), R (playback) and T (bends).
- **Disabled buttons look enabled:** no `.btn:disabled` style.
- **Take modules differ:** pass and fail colours (warning/success, danger/accent, muted/accent),
  the Space shortcut, Reset stats.
- **Wording:** route titles mix "Practice X" (notes, identify, intervals, rhythm, scales, triads)
  and "Practise X"; "No takes were answered"; the manifest and `index.html` descriptions list three
  modules.
- **PWA:** the manifest has no `id` and no `screenshots` for Android's richer install sheet.
- Bends' "that was the target fretted" warning stays up during a later real bend.

### Code health

- **Take modules repeat more than `Take` covers:** `loadLevels`/`loadTakes` and a takes store
  (`TAKES_KEPT`, `isTakes`, append and save) in three modules, the same ladder text in play along
  and progressions, `STRUM_THRESHOLD = 0.8` twice. A `TakeStore<T>` like `StatsStore`, and
  `ladderText()` in `tempo-ladder.ts`.
- **CSS repeated in module pages:** `.question`/`.ask` in all ten practice pages, `.actions`,
  `kbd`, `.warning`, `.beats`, the data table four times; `.heading-row` redeclared in
  `session-history.ts`. Colours outside the variables: `#2b2414`, `#3a2c12`, `#c9c6bf` (add
  `--warning-surface`).
- **Constants with two meanings:** bends' `IN_TUNE_CENTS` (10), `HOLD_MS` and `SETTLE_MS` share
  their names with the tuner's (5, 1000, 1000): rename them (`BEND_TOLERANCE_CENTS`…).
  Frequency to MIDI is written three times, two with 440 instead of `A4_HZ`.
- **Two inputs in progressions:** both listeners open the same device, two streams and two audio
  contexts; iOS may mute the first. One shared input, counted by its users, with one start and
  error path (also wanted by Scales in time).
- **`PhrasePlayer`** ends a phrase on a wall-clock timer and doesn't await `resume()`: on a late
  start, `playing` turns false while the last note still sounds. End on the last source's
  `onended`.
- **Phone performance:** `OnsetDetector.push` makes three arrays a call, 750 calls a second from
  `AttackTimer`: a ring buffer instead. The worklet could transfer its buffer, and
  `chromaFromSpectrum` could work out each bin's pitch class once.
- **"Each" times compare unlike things** in the triads speed grid only: notes and intervals with
  the mic ignore wrong notes too. Move the time/accuracy toggle into core.
- Module imports between modules aren't enforced by lint: a `no-restricted-imports` block per
  module.

### Tests, CI and docs

- **Flaky e2e** ("Failed to fetch dynamically imported module"): most tests run against
  `ng serve`, with 14 workers each pulling 66 lazy chunks from it, and no retries. Serve a built
  app with `e2e/support/serve-build.mjs`, retry once in CI, cap local workers.
- **CI:** cache Playwright's Chromium (`~/.cache/ms-playwright`); type-check and format-check
  `e2e/` (`tsc -p e2e/tsconfig.json`, Prettier on the whole repo); type the e2e seed settings
  with `satisfies Partial<XSettings>`. Remove `@angular/forms` (unused).
- **Weak or missing tests:** the voice-processing flags (only `echoCancellation` is asserted), the
  metronome's light-only mode, `Metronome.play`/`stop`, `estimateLatency` with no strikes,
  phone-width checks for the setup and stats pages of the newer modules and for the home page
  with recent practice, `sanitizeSettings` in intervals, the `saved-settings.ts` helpers.
- **Test helpers:** `fakeMicrophone()` is copied into eight specs (some without `pitch`); the
  rhythm fakes are copied into progressions. Typed fakes in `core/audio/*.testing.ts` and a
  storage seeding helper. A few specs select CSS classes: query `data-` attributes instead.
- **Docs drift:** `src/app/modules/README.md` lists 6 of 10 modules; the guide explains files
  "using notes" but shows scales, and says each module's phone check goes in `layout.e2e.ts`;
  CLAUDE.md cites the triads fake microphone (it has no `pitch`) and puts the microphone fixture
  in `e2e/microphone.e2e.ts` (it's `e2e/support/microphone.ts`); the README's Node version
  ("22 or later") is wrong for Angular 22.2 (`^22.22.3 || ^24.15.0 || >=26`): add `engines`.
