import { Component, computed, inject } from '@angular/core';
import { Fretboard, FretboardDot } from '../../../core/fretboard/fretboard';
import { stringLabel } from '../../../core/fretboard/tuning';
import { displayNoteName } from '../../../core/music/notes';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { isTarget, noteNameAt, whereLabel } from '../deck';
import { NotesSession } from '../notes-session';

/**
 * "Find F♯ on string 5": you answer on the fretboard and the app checks it. There's no answer
 * template, so the result and the Next button appear under the fretboard.
 */
@Component({
  selector: 'app-notes-practice-page',
  imports: [PracticeFrame, Fretboard, MicStatus],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(NotesSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  protected readonly settings = this.session.settings;

  protected readonly noteLabel = computed(() => {
    const card = this.card();
    return card ? displayNoteName(card.note) : '';
  });

  protected readonly where = computed(() => {
    const card = this.card();
    return card ? whereLabel(card, this.settings()) : '';
  });

  protected readonly window = computed(() => ({ first: 1, last: this.settings().maxFret }));

  /** The keyboard cursor starts at the nut of the asked string, fresh for every card. */
  protected readonly cursorStart = computed(() => {
    const card = this.card();
    return card ? { string: card.string ?? 3, fret: 0 } : null;
  });

  protected readonly micOn = computed(() => this.settings().micMode === 'play');

  /** With the microphone on, the string a whole-neck prompt is being played on, highlighted. */
  protected readonly stringToPlay = computed(() =>
    this.micOn() && this.run.phase() === 'prompt' ? this.session.stringToPlay() : null,
  );

  protected readonly micHint = computed(() => {
    const string = this.stringToPlay();
    return string === null
      ? 'play the note'
      : `play ${this.noteLabel()} on ${stringLabel(string)}, from the low strings up`;
  });

  /** Your picks, plus every place the note is once the card is settled. */
  protected readonly dots = computed((): FretboardDot[] => {
    const picks = this.session.picks();
    const answered = this.run.phase() === 'answered';
    const picked: FretboardDot[] = picks.map((pick) => ({
      ...pick.position,
      label: noteNameAt(pick.position),
      kind: pick.hit ? 'tone' : 'miss',
    }));
    const missed: FretboardDot[] = answered
      ? this.session
          .targets()
          .filter((target) => !picks.some((pick) => isTarget([target], pick.position)))
          .map((target) => ({ ...target, label: this.noteLabel(), kind: 'root' }))
      : [];
    return [...picked, ...missed];
  });

  /** Whole-neck progress, e.g. "3 of 7 found · 1 miss". */
  protected readonly progress = computed(() => {
    if (this.card()?.string !== null) {
      return '';
    }
    const picks = this.session.picks();
    const found = picks.filter((pick) => pick.hit).length;
    const misses = picks.length - found;
    const total = this.session.targets().length;
    const missText = misses === 1 ? '1 miss' : `${misses} misses`;
    return `${found} of ${total} found` + (misses > 0 ? ` · ${missText}` : '');
  });

  /** After a wrong one-string answer: what you picked and where the note really is. */
  protected readonly correction = computed(() => {
    const card = this.card();
    const wrong = this.session.picks().find((pick) => !pick.hit);
    if (!card || card.string === null || !wrong || this.run.phase() !== 'answered') {
      return '';
    }
    const frets = this.session.targets().map((target) => target.fret);
    const at = frets.length === 1 ? `fret ${frets[0]}` : `frets ${frets.join(' and ')}`;
    return `That's ${noteNameAt(wrong.position)}. ${this.noteLabel()} is at ${at}.`;
  });

  protected readonly description = computed(
    () =>
      `Fretboard, frets 0 to ${this.settings().maxFret}. Find ${this.noteLabel()} ${this.where()}`,
  );
}
