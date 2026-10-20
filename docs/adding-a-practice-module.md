# Adding a practice module

A **practice module** is one kind of exercise, such as _Triads_, _Fretboard notes_ or
_Identify notes_. Each module
lives in its own folder under `src/app/modules/` and shows up on the home screen.

You write only what makes your exercise different:

- what to ask
- how an answer is given and checked
- which settings it has

Everything else is shared and comes for free:

| You get                                                           | From                              |
| ----------------------------------------------------------------- | --------------------------------- |
| Top bar with practice, stats and setup links                      | `core/ui/module-shell.ts`         |
| Timed sessions: start, pause, idle detection, summary, history    | `core/practice/practice-log.ts`   |
| Card picking that favours what you miss, per-card stats           | `core/practice/practice-run.ts`   |
| Practice screen: session bar, reveal and answer buttons, keyboard | `core/ui/practice-frame/`         |
| Setup controls: chip toggles, segmented choices, start button     | `core/ui/setup/`                  |
| Stats blocks: overview, accuracy grid, weakest cards, history     | `core/ui/stats/`                  |
| A progress chart of your pace, in the session history             | `core/ui/stats/progress-chart.ts` |
| Fretboard diagram you can also answer on (tap or keyboard)        | `core/fretboard/fretboard.ts`     |
| Multiple-choice answers with number and arrow keys                | `core/ui/answer/`                 |
| Microphone: played notes or a live spectrum                       | `core/audio/mic-listener.ts`      |
| Music theory: spelling, intervals, chords, voicings               | `core/music/`                     |

**The quickest start is to copy a module close to yours** and rename things:

- `src/app/modules/identify/` for multiple-choice answers (`scales/` is another example)
- `src/app/modules/notes/` for answering on the fretboard
- `src/app/modules/triads/` for self-check (reveal, then Got it / Missed)

This guide explains the files using `notes` as the example; `identify` has the same shape.

## 1. Choose how answers work

| Style       | How it goes                                                                                        | Example                         | `selfCheck` |
| ----------- | -------------------------------------------------------------------------------------------------- | ------------------------------- | ----------- |
| Self-check  | You play, press **Reveal**, then say **Got it** or **Missed**                                      | Triads                          | `true`      |
| App-checked | You answer in the app (tap the fretboard, pick an option, play into the mic) and the app checks it | Fretboard notes, Identify notes | `false`     |

A self-check module provides an **answer** template, shown on reveal. An app-checked module calls
`run.resolve(correct)` when you answer. The frame then shows "Correct" or "Not quite" and the
**Next** button. A module can mix the two: Triads is self-checked, but the mic can still resolve a
card.

## 2. Files

For a module called `scales`:

```
src/app/modules/scales/
  settings.ts            settings type, defaults, sanitizeSettings()
  deck.ts                card type, buildDeck(), settingsProblems(), answer logic   ← pure TypeScript
  deck.spec.ts           unit tests for deck.ts
  scales-session.ts      the module service: implements Drill, owns a PracticeRun
  scales.routes.ts       shell + the three pages
  setup/setup-page.*     what to practise
  practice/practice-page.*   the question (and the answer, for self-check)
  stats/stats-page.*     accuracy and history
```

Then add one entry to `src/app/modules/registry.ts`.

## 3. Settings (`settings.ts`)

Settings are a plain readonly object with defaults. They're saved in the browser, and saved data can
come from an older version, so rebuild them with the helpers in `core/practice/saved-settings.ts`:

```ts
export interface ScalesSettings {
  readonly scales: readonly string[];
  readonly maxFret: number;
}

export const DEFAULT_SETTINGS: ScalesSettings = { scales: ['major'], maxFret: 12 };

export function sanitizeSettings(saved: unknown): ScalesSettings {
  const raw = savedFields(saved);
  return {
    scales: pickList(raw['scales'], SCALE_IDS, DEFAULT_SETTINGS.scales),
    maxFret: pickOne(raw['maxFret'], [5, 12, 15], DEFAULT_SETTINGS.maxFret),
  };
}
```

## 4. Cards and answers (`deck.ts`)

A **card** is one question. It extends `PracticeCard`, whose `key` identifies it in the stats.

> **Keep keys stable.** Stats are stored by key. If you change the key format, past results stop
> matching their cards. Use readable keys like `"F#|5"`, and write a `cardFromKey()` so the stats
> page can describe them.

```ts
export interface ScaleCard extends PracticeCard {
  readonly key: string; // e.g. "G|major"
  readonly root: SpelledNote;
  readonly scale: Scale;
}

export function buildDeck(settings: ScalesSettings): ScaleCard[] { … }

/** Plain-words reasons the settings leave nothing to practise; empty when ready. */
export function settingsProblems(settings: ScalesSettings, deck: readonly ScaleCard[]): string[] { … }
```

Put every rule that decides whether an answer is right in this file as plain functions, such as
`isTarget()` and `allFound()` in the notes module. They're easy to unit test there and keep the
components thin.

### Cards that vary each time they come up

A card doesn't have to fix every detail of the question. In `modules/intervals/` a card is a
_shape_ ("the ♭3 in minor pentatonic, root on string 6"), and the root changes every time it
comes up, so the stats follow what you're learning and you can't memorise fret numbers. The
session picks the details in `PracticeRun`'s `onNext`, which runs for every card, including the
first, with a pure function you can test with a fixed `random`:

```ts
onNext: () => {
  const card = this.run.current();
  this.question.set(card ? questionFor(card, this.settings().maxFret, Math.random) : null);
},
```

Tests then fix `Math.random` at 0 to know the question, as for any random choice.

## 5. The module service (`scales-session.ts`)

The service holds the settings, the deck and the card flow. It implements `Drill`, the contract the
shared screens read:

```ts
@Service({ autoProvided: false })
export class ScalesSession implements Drill {
  readonly title = 'Scales'; // top bar
  readonly unit = 'scale'; // "12 scales" in counts
  readonly selfCheck = false; // see step 1

  readonly settings = signal(sanitizeSettings(loadJson('scales:settings')));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings(), this.deck()));

  readonly run = new PracticeRun<ScaleCard>({
    module: 'scales', // tags sessions in the shared log
    statsKey: 'scales:stats',
    deck: this.deck,
    problems: this.problems,
    onNext: () => {
      /* reset per-card state */
    },
  });

  readonly tags = computed(() => [/* short reminders shown above the prompt */]);

  updateSettings(changes: Partial<ScalesSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson('scales:settings', this.settings());
  }

  /** Called by the practice page when you answer. */
  answer(choice: string): void {
    this.run.resolve(choice === this.run.current()?.scale.id);
  }
}

export function provideScales(): Provider[] {
  return [ScalesSession, { provide: Drill, useExisting: ScalesSession }];
}
```

`PracticeRun` reference:

| Member                                 | Use                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `current()`, `phase()`                 | The card on screen, and `'prompt'`, `'revealed'` or `'answered'`          |
| `resolve(correct)`                     | App-checked answer: records it and shows the result                       |
| `resolveAndMoveOn()`, `movedOn()`      | A correct answer not worth a look: straight to the next card; confirm it  |
| `timeLimitMs` option, `timedOut()`     | A time limit per card: a miss when it runs out ("Time's up"), with a bar  |
| `reveal()`, `selfCheck(correct)`       | Self-check flow (the frame's buttons call these for you)                  |
| `touch()`                              | Marks activity, for example a played note, so the idle timer doesn't stop |
| `paused()`, `lastCorrect()`, `stats()` | For your templates and checks                                             |
| `onStart` / `onEnd` / `onNext` options | Start and stop the mic, reset per-card state                              |

## 6. Routes and registry

`scales.routes.ts` is the same for every module apart from the names:

```ts
export const SCALES_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideScales(),
    children: [
      { path: '', title: 'Scales · Guitar trainer', loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage) },
      { path: 'practice', title: …, loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage) },
      { path: 'stats', title: …, loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage) },
    ],
  },
];
```

`modules/registry.ts`:

```ts
{
  path: 'scales',
  title: 'Scales',
  description: 'Name the scale from its pattern on the neck.',
  loadRoutes: () => import('./scales/scales.routes').then((m) => m.SCALES_ROUTES),
},
```

## 7. Pages

### Setup

Use the shared controls and end with `<app-setup-start />`, which shows the problems or the card
count and starts the session:

```html
<section class="panel">
  <h2>Scales</h2>
  <app-chip-toggles
    label="Scales"
    [options]="scaleChips"
    [selected]="settings().scales"
    (selectedChange)="update({ scales: $event })"
  />
  <app-segmented-choice
    label="Frets"
    [options]="fretChoices"
    [value]="settings().maxFret"
    (valueChange)="update({ maxFret: $event })"
  />
</section>
<app-setup-start />
```

Give the component `host: { class: 'page' }` for the standard page spacing, and an
`<h1 class="visually-hidden">` that names the page.

### Practice

Wrap your question in `<app-practice-frame>`. The frame shows your `prompt` template while a session
runs. A self-check module also passes an `answer` template, shown after **Reveal**.

```html
<app-practice-frame [prompt]="prompt" />

<ng-template #prompt>
  @if (card(); as card) {
  <h1>Which scale?</h1>
  <app-fretboard [dots]="dots()" [description]="description()" />
  <!-- your answer control; call session.answer(…) -->
  }
</ng-template>
```

Rules the frame relies on:

- Give the question an `<h1>`, inside an `aria-live="polite"` region so a new card is announced.
- If your answer control should get focus for each new card, mark it with `data-autofocus`. The
  fretboard and the choice buttons do this when given `[takesFocus]="true"`. The frame only moves
  focus there for keyboard users: for a mouse or touch user, a focus ring on an answer would look
  like a preselected answer.
- If your control uses keys itself (arrows, Enter, Space), call `event.preventDefault()`. The frame
  then leaves those keys alone.

### Stats

Compose the shared blocks. Only the grid rows and card descriptions are specific to your module:

```html
<app-stats-overview />
<app-session-history />
<section class="panel">
  <h2>Accuracy by scale</h2>
  <app-accuracy-grid [columns]="roots" [rows]="grid()" rowHeader="Scale" />
</section>
<section class="panel">
  <h2>Practise these more</h2>
  <app-weakest-cards [describe]="describeCard" />
</section>
<app-reset-stats />
```

Build grid cells with `accuracyCell(id, totals(stats, (key) => …))`.

## 8. Shared building blocks

| Need                                      | Use                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Show or answer on the neck                | `<app-fretboard [selectable] (picked) [cursorStart] [takesFocus] [highlightString]>`                 |
| Pick one answer from a few or many        | `<app-choice-buttons [options] [checked] [takesFocus] (chosen)>` in `core/ui/answer/`                |
| Note name where any spelling is right     | `pitchClassNames()` ("C♯/D♭"), `commonNoteName()` ("D♭") in `core/music/notes.ts`                    |
| The note at a string and fret             | `pitchClassAt()` in `core/fretboard/placement.ts`                                                    |
| Scales and where to play them             | `SCALE_TYPES` in `core/music/scales.ts`; `scaleInPosition()`, `positionStarts()` in `placement.ts`   |
| Let people choose scales                  | `<app-scale-toggles [selected] (selectedChange)>` in `core/ui/setup/`                                |
| A grid of how fast you answer             | `speedCell()` next to `accuracyCell()` in `core/ui/stats/accuracy-grid.ts`                           |
| Name a scale in a sentence                | `scaleRootName()` ("G♯" minor, "A♭" major), `scaleNameInText()` in `core/music/scales.ts`            |
| Notes shown for context only              | Fretboard dots of kind `'ghost'`: faint rings, labelled like the others                              |
| Interval names                            | `displayInterval()` ("♭3"), `intervalLongName()` ("minor 3rd"), `intervalFromSemitones()`            |
| Where a note or chord tone is on the neck | `findNotePositions()`, `findChordTones()`, `placeVoicing()` in `core/fretboard/placement.ts`         |
| Spell notes, intervals, chords            | `core/music/notes.ts`, `intervals.ts`, `chords.ts`                                                   |
| Listen to the guitar                      | `MicListener.start('notes')`, then `heard()`; `<app-mic-status>`                                     |
| The exact pitch sounding (as the tuner)   | `MicListener.start('pitch')`, `pitch()`; `readPitch()`, `tuneAdvice()` in `core/audio/tuner.ts`      |
| Play notes through the speakers           | `PhrasePlayer.play(notes)`, `playing()` while it sounds, in `core/audio/phrase-player.ts`            |
| Let people choose the input (mic, cable)  | `<app-input-picker>` in the setup's microphone section; listeners open `AudioInputs.deviceToOpen()`  |
| Time strikes, play a metronome            | `RhythmListener` (`strikes()`, `now()`), `Metronome.play()`, `scoreTake()` in `core/audio/timing.ts` |
| Show a rhythm take, chart a value         | `<app-take-strip>`; `<app-trend-chart>` in `core/ui/stats/`                                          |
| Keep a result on screen after a pass      | `PracticeRun` option `advanceAfterCorrect: false`                                                    |
| Show your own result instead of "Correct" | `ownResult = true` on the session (see `modules/changes/`)                                           |
| Words                                     | `plural()`, `percentCorrect()`, `capitalize()` in `core/ui/text.ts`                                  |
| Save something                            | `loadJson()` / `saveJson()` in `core/practice/storage.ts`                                            |

### Multiple choice

`<app-choice-buttons>` lays out the options in even rows. Keys 1–9 pick directly when there are
nine options or fewer, and arrow keys move between options. Pass `checked` once the answer is
known, and the buttons mark the right option and yours, for sighted and screen-reader users
alike:

```html
<app-choice-buttons
  label="Note names"
  [options]="options()"
  [checked]="checked()"
  [takesFocus]="true"
  (chosen)="session.answer($event)"
/>
```

```ts
answer(value: number): void {
  this.picked.set(value); // checked() = { picked, correct } once this is set
  this.run.resolve(value === this.run.current()?.answer);
}
```

`modules/identify/` is the full example, including how to offer the right answer plus random
others (`answerChoices()` in its `deck.ts`).

## 9. Before you commit

- [ ] `deck.spec.ts` covers card building, `settingsProblems`, answer checking and `cardFromKey`.
- [ ] A component spec for the practice page: right answer, wrong answer, keyboard. See
      `modules/notes/practice/practice-page.spec.ts`.
- [ ] The setup page shows a sensible card count, and the problems when nothing is selected.
- [ ] No horizontal scrolling at phone width (375 px).
- [ ] A smoke flow in `e2e/<module>.e2e.ts` (start a session, answer, see the result), and the
      module's pages added to `e2e/layout.e2e.ts`. Run `npm run e2e`.
- [ ] `npm run test:once`, `npm run lint` and `npm run build` pass.
