import { Component, computed, inject } from '@angular/core';
import { Fretboard, FretboardDot } from '../../../core/fretboard/fretboard';
import { Icon } from '../../../core/ui/icon';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { capitalize } from '../../../core/ui/text';
import { degrees, keyName, noteName, placeName, playPositions } from '../deck';
import { PlaybackSession } from '../playback-session';

/**
 * Play it back: hear a phrase whose first note is given, find the rest on the guitar and play
 * it. R plays it again.
 */
@Component({
  selector: 'app-playback-practice-page',
  imports: [Fretboard, Icon, MicStatus, PracticeFrame],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class PracticePage {
  protected readonly session = inject(PlaybackSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  protected readonly phrase = this.session.phrase;
  protected readonly settings = this.session.settings;

  /** "An interval, up", or "A melody in G major pentatonic". */
  protected readonly kind = computed(() => {
    const card = this.card();
    const phrase = this.phrase();
    if (!card || !phrase) {
      return '';
    }
    return card.kind === 'interval'
      ? `An interval, ${card.direction}`
      : `A melody in ${keyName(card, phrase)}`;
  });

  protected readonly first = computed(() => {
    const phrase = this.phrase();
    return phrase ? noteName(phrase.notes[0]) : '';
  });

  /** "string 5, open · then one note". */
  protected readonly where = computed(() => {
    const phrase = this.phrase();
    if (!phrase) {
      return '';
    }
    const rest = phrase.notes.length - 1;
    return `${placeName(phrase.start)} · then ${rest === 1 ? 'one note' : `${rest} notes`}`;
  });

  /** The first note, then a blank for each note to find. */
  protected readonly blanks = computed(() =>
    Array.from({ length: (this.phrase()?.notes.length ?? 1) - 1 }, (_, index) => index),
  );

  protected readonly startDescription = computed(() => {
    const phrase = this.phrase();
    return phrase ? `The first note, ${this.first()}: ${placeName(phrase.start)}.` : '';
  });

  protected readonly startDots = computed((): FretboardDot[] => {
    const phrase = this.phrase();
    return phrase ? [{ ...phrase.start, label: this.first(), kind: 'root' }] : [];
  });

  protected readonly names = computed(() => this.phrase()?.notes.map(noteName) ?? []);

  /** "Major 3rd up" or "G major pentatonic: 1 2 3", above the answer. */
  protected readonly answerTitle = computed(() => {
    const card = this.card();
    const phrase = this.phrase();
    if (!card || !phrase) {
      return '';
    }
    if (card.kind === 'interval') {
      return `${capitalize(card.interval.name)} ${card.direction}`;
    }
    return `${keyName(card, phrase)}: ${degrees(phrase).join(' ')}`;
  });

  protected readonly answerDots = computed((): FretboardDot[] => {
    const phrase = this.phrase();
    if (!phrase) {
      return [];
    }
    return playPositions(phrase).map((position, index) => ({
      ...position,
      label: noteName(phrase.notes[index]),
      kind: index === 0 ? 'root' : 'tone',
    }));
  });

  protected readonly answerDescription = computed(
    () => `One way to play it: ${this.names().join(', then ')}.`,
  );

  /** R plays the phrase again; the practice frame doesn't use it. */
  protected onKeydown(event: KeyboardEvent): void {
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      event.key.toLowerCase() !== 'r' ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      inControl ||
      this.run.view() !== 'running'
    ) {
      return;
    }
    this.session.hear();
    event.preventDefault();
  }
}
