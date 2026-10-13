import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { FretPosition } from '../../core/fretboard/fretboard';
import { STRING_NUMBERS } from '../../core/fretboard/tuning';
import { NATURAL_NOTE_NAMES } from '../../core/music/notes';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import { NoteCard, Pick, allFound, buildDeck, isTarget, settingsProblems, targetsOf } from './deck';
import { NotesSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const NOTES_MODULE = 'notes';

const SETTINGS_KEY = 'notes:settings';
const STATS_KEY = 'notes:stats';

/**
 * The fretboard notes module: "Find F♯ on string 5" or "Find every G". You answer by tapping the
 * fretboard (or playing the note), and the app checks it.
 */
@Service({ autoProvided: false })
export class NotesSession implements Drill {
  private readonly mic = inject(MicListener);

  readonly title = 'Fretboard notes';
  readonly unit = 'note';
  readonly selfCheck = false;

  readonly settings = signal<NotesSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings(), this.deck()));

  readonly run = new PracticeRun<NoteCard>({
    module: NOTES_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onStart: () => {
      if (this.micListens()) {
        void this.mic.start('notes');
      }
    },
    onEnd: () => this.mic.stop(),
    onNext: () => {
      this.picks.set([]);
      this.mic.clearHeard();
    },
  });

  /** Your answers to the current card so far. */
  readonly picks = signal<readonly Pick[]>([]);

  /** Every place that answers the current card. */
  readonly targets = computed(() => {
    const card = this.run.current();
    return card ? targetsOf(card, this.settings()) : [];
  });

  readonly tags = computed(() => {
    const { notes, strings, maxFret, promptKind } = this.settings();
    const naturalsOnly =
      notes.length === NATURAL_NOTE_NAMES.length &&
      notes.every((name) => NATURAL_NOTE_NAMES.includes(name));
    return [
      notes.length === 12 ? 'All notes' : naturalsOnly ? 'Naturals' : plural(notes.length, 'note'),
      strings.length === STRING_NUMBERS.length ? 'All strings' : `Strings ${strings.join(', ')}`,
      `Frets 0–${maxFret}`,
      promptKind === 'string' ? 'One string' : 'Whole neck',
    ];
  });

  constructor() {
    // A played note answers a one-string prompt when its exact pitch is one of the places asked
    // for. The microphone can't tell strings apart, so the same pitch on another string counts.
    effect(() => {
      const note = this.mic.heard().at(-1);
      if (note === undefined) {
        return;
      }
      untracked(() => {
        this.run.touch();
        const target = this.targets().find((place) => place.midi === note);
        if (target && this.run.current()?.string !== null) {
          this.pick(target);
        }
      });
    });
  }

  updateSettings(changes: Partial<NotesSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /**
   * An answer on the fretboard. A one-string prompt is settled by the first pick; a whole-neck
   * prompt once every place is found, and it counts as correct only without wrong picks.
   */
  pick(position: FretPosition): void {
    const card = this.run.current();
    if (!card || this.run.phase() !== 'prompt' || this.run.paused()) {
      return;
    }
    if (this.picks().some((pick) => isTarget([pick.position], position))) {
      return;
    }
    const hit = isTarget(this.targets(), position);
    const picks = [
      ...this.picks(),
      { position: { string: position.string, fret: position.fret }, hit },
    ];
    this.picks.set(picks);
    this.run.touch();
    if (card.string !== null) {
      this.run.resolve(hit);
    } else if (allFound(this.targets(), picks)) {
      this.run.resolve(picks.every((pick) => pick.hit));
    }
  }

  /** Gives up on a whole-neck prompt: the remaining places are shown and it counts as a miss. */
  showMe(): void {
    this.run.resolve(false);
  }

  private micListens(): boolean {
    const { micMode, promptKind } = this.settings();
    return micMode === 'play' && promptKind === 'string';
  }
}

/** Providers for the notes pages: the session, also offered as the `Drill` the shared screens use. */
export function provideNotes(): Provider[] {
  return [NotesSession, { provide: Drill, useExisting: NotesSession }];
}
