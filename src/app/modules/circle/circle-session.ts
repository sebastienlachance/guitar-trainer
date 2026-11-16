import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { FretPosition } from '../../core/fretboard/fretboard';
import { pitchClassAt } from '../../core/fretboard/placement';
import { parseNote, pitchClassOf } from '../../core/music/notes';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { capitalize, plural } from '../../core/ui/text';
import {
  CircleCard,
  KEY_QUESTION_LABELS,
  answersCard,
  buildDeck,
  describeCard,
  neckSpot,
  settingsProblems,
  stepCard,
} from './deck';
import {
  LAPS_KEPT,
  Lap,
  LapRecord,
  isLaps,
  lapDone,
  lapRecord,
  nextLapDirection,
  startLap,
  withAnswer,
} from './laps';
import { CIRCLE_NOTE_NAMES, CircleSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const CIRCLE_MODULE = 'circle';

const SETTINGS_KEY = 'circle:settings';
const STATS_KEY = 'circle:stats';
const LAPS_KEY = 'circle:laps';

function loadLaps(): LapRecord[] {
  const saved = loadJson(LAPS_KEY);
  return isLaps(saved) ? saved : [];
}

/**
 * The circle of fifths module. Next note: a note, and you name the next one round the circle, in
 * fourths (E♭ → A♭) or fifths (E♭ → B♭), a step or a few away, in random order or in laps where
 * each answer is the next question. Keys: key signatures and relative minors. On the neck: a
 * note on the fretboard, and you find the next one round. You tap the answer or, with the
 * microphone on, play it. The app checks it.
 */
@Service({ autoProvided: false })
export class CircleSession implements Drill {
  private readonly mic = inject(MicListener);

  readonly title = 'Circle of fifths';
  readonly unit = 'note';
  readonly selfCheck = false;

  readonly settings = signal<CircleSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));
  readonly micOn = computed(() => this.settings().micMode === 'play');
  readonly lapsOn = computed(
    () => this.settings().exercise === 'next' && this.settings().order === 'laps',
  );

  readonly run = new PracticeRun<CircleCard>({
    module: CIRCLE_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onStart: () => {
      this.lap.set(null);
      this.lastLap.set(null);
      if (this.micOn()) {
        void this.mic.start('notes');
      }
    },
    onEnd: () => this.mic.stop(),
    onNext: () => {
      const card = this.run.current();
      this.spot.set(card?.kind === 'neck' ? neckSpot(card) : null);
      this.picked.set(null);
      this.tapped.set(null);
      this.mic.clearHeard();
    },
    pickNext: (previous) => (this.lapsOn() ? this.nextLapCard(previous) : null),
  });

  /** Your answer to the current card, once given: a note, a minor key's root or a signature. */
  readonly picked = signal<number | null>(null);
  /** On the neck: where the note is shown this time. */
  readonly spot = signal<FretPosition | null>(null);
  /** On the neck: where you tapped. */
  readonly tapped = signal<FretPosition | null>(null);

  /** The lap under way, in laps. */
  readonly lap = signal<Lap | null>(null);
  /** The last lap finished in this session. */
  readonly lastLap = signal<LapRecord | null>(null);
  /** Every lap finished, oldest first. */
  readonly laps = signal<readonly LapRecord[]>(loadLaps());

  /**
   * A wrong note played isn't counted, as the microphone can mishear, so only a wrong tap is a
   * miss. Without one, a 100% says nothing.
   */
  readonly waitsForRightAnswer = this.micOn;

  readonly describeCard = describeCard;

  readonly tags = computed(() => {
    const { exercise, directions, steps, keyQuestions, notes } = this.settings();
    const ways = capitalize(directions.join(' and '));
    const notesTag =
      notes.length === CIRCLE_NOTE_NAMES.length
        ? exercise === 'keys'
          ? 'All keys'
          : 'All notes'
        : plural(notes.length, exercise === 'keys' ? 'key' : 'note');
    switch (exercise) {
      case 'keys':
        return [...keyQuestions.map((kind) => KEY_QUESTION_LABELS[kind]), notesTag];
      case 'neck':
        return ['On the neck', ways, notesTag];
      case 'next':
        if (this.lapsOn()) {
          return ['Laps', ways];
        }
        return steps.length === 1 && steps[0] === 1
          ? [ways, notesTag]
          : [ways, `${steps.join(', ')} steps`, notesTag];
    }
  });

  constructor() {
    effect(() => {
      const note = this.mic.heard().at(-1);
      if (note === undefined) {
        return;
      }
      untracked(() => {
        this.run.touch();
        const card = this.run.current();
        if (card && answersCard(card, note)) {
          this.answer(card.answer);
        }
      });
    });
  }

  updateSettings(changes: Partial<CircleSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Your answer: the note, minor key or signature you tapped, or the note you played. */
  answer(value: number): void {
    const card = this.run.current();
    if (!card || !this.waiting()) {
      return;
    }
    this.picked.set(value);
    this.settle(value === card.answer);
  }

  /** On the neck: a tap on the fretboard. The right note anywhere counts. */
  pick(position: FretPosition): void {
    const card = this.run.current();
    if (card?.kind !== 'neck' || !this.waiting()) {
      return;
    }
    const pitchClass = pitchClassAt(position);
    this.tapped.set({ string: position.string, fret: position.fret });
    this.picked.set(pitchClass);
    this.settle(pitchClass === card.answer);
  }

  private waiting(): boolean {
    return this.run.phase() === 'prompt' && !this.run.paused();
  }

  private settle(correct: boolean): void {
    this.run.resolve(correct);
    const lap = this.lap();
    if (!this.lapsOn() || !lap || lapDone(lap)) {
      return;
    }
    const updated = withAnswer(lap, correct, this.run.responseMs() ?? 0);
    this.lap.set(updated);
    if (lapDone(updated)) {
      const record = lapRecord(updated, Date.now());
      this.lastLap.set(record);
      this.laps.update((laps) => [...laps, record].slice(-LAPS_KEPT));
      saveJson(LAPS_KEY, this.laps());
    }
  }

  /**
   * In laps, the next question starts from the last answer (the right one, after a miss). A new
   * lap starts from one of the chosen notes, each way round in turn when both are chosen.
   */
  private nextLapCard(previous: CircleCard | null): CircleCard {
    const lap = this.lap();
    if (lap && !lapDone(lap) && previous?.kind === 'next') {
      return stepCard('next', lap.direction, previous.answer);
    }
    const { directions, notes } = this.settings();
    const start = pitchClassOf(parseNote(notes[Math.floor(Math.random() * notes.length)]));
    const next = startLap(nextLapDirection(directions, lap?.direction ?? null), start);
    this.lap.set(next);
    return stepCard('next', next.direction, start);
  }
}

/** Providers for the circle pages: the session, also offered as the `Drill` the shared screens use. */
export function provideCircle(): Provider[] {
  return [CircleSession, { provide: Drill, useExisting: CircleSession }];
}
