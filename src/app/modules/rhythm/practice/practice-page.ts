import { Component, computed, inject } from '@angular/core';
import { Metronome } from '../../../core/audio/metronome';
import { RhythmListener } from '../../../core/audio/rhythm-listener';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { TakeStrip } from '../../../core/ui/take-strip';
import { cardName, scoreSummary, struckSlots } from '../deck';
import { RhythmSession } from '../rhythm-session';

/**
 * Play along: press Play, listen to a bar of count-in, then strike every subdivision with the
 * metronome, or a strumming pattern's strokes. Afterwards each hit shows how early or late it was,
 * and the tempo moves.
 */
@Component({
  selector: 'app-rhythm-practice-page',
  imports: [PracticeFrame, TakeStrip],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(RhythmSession);
  protected readonly listener = inject(RhythmListener);
  protected readonly beat = inject(Metronome).beat;
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  protected readonly counts = [1, 2, 3, 4];

  /** The take's tempo while showing its result: the ladder may already have moved on. */
  protected readonly bpm = computed(() => this.session.result()?.bpm ?? this.session.tempo());

  protected readonly name = computed(() => {
    const card = this.card();
    return card ? cardName(card) : '';
  });

  protected readonly perBar = computed(() => 4 * (this.card()?.subdivision.perBeat ?? 1));

  /** A pattern's slots, struck or rest, for the take strip; null for a subdivision. */
  protected readonly slots = computed(() => {
    const card = this.card();
    return card?.pattern ? struckSlots(card) : null;
  });

  /** How a bar of the pattern is counted, slot by slot: "1", "&", "2"… */
  protected readonly slotCounts = computed(
    () => this.card()?.subdivision.counting.split(' ') ?? [],
  );

  /** A pattern's strokes slot by slot, with a dot for each rest. */
  protected readonly strokes = computed(() =>
    [...(this.card()?.pattern?.strokes ?? '')].map((stroke) => (stroke === '.' ? '·' : stroke)),
  );

  /** The pattern for screen readers: "down, rest, down, up…". */
  protected readonly strokeWords = computed(() =>
    this.strokes()
      .map((stroke) => (stroke === 'D' ? 'down' : stroke === 'U' ? 'up' : 'rest'))
      .join(', '),
  );

  protected readonly instruction = computed(() => {
    switch (this.session.stage()) {
      case 'count-in':
        return 'Listen…';
      case 'playing':
        return 'Play!';
      default:
        return this.session.result()
          ? ''
          : this.card()?.pattern
            ? 'Press Play, listen to one bar, then strum the pattern: strokes on time, rests left alone.'
            : 'Press Play, listen to one bar, then strike every subdivision on the beat.';
    }
  });

  protected readonly summary = computed(() => {
    const result = this.session.result();
    return result ? scoreSummary(result.score, this.card()?.pattern !== null) : '';
  });

  protected readonly ladder = computed(() => {
    const result = this.session.result();
    if (!result) {
      return '';
    }
    if (result.passed) {
      return `Passed. Next time: ${result.nextBpm} bpm.`;
    }
    return result.nextBpm < result.bpm
      ? `Not yet. Next time: ${result.nextBpm} bpm, a little slower.`
      : `Not yet. Try again at ${result.bpm} bpm.`;
  });
}
