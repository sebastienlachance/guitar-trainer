import { Component, computed, inject } from '@angular/core';
import { Metronome } from '../../../core/audio/metronome';
import { RhythmListener } from '../../../core/audio/rhythm-listener';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { TakeStrip } from '../../../core/ui/take-strip';
import { scoreSummary } from '../deck';
import { RhythmSession } from '../rhythm-session';

/**
 * Play along: press Play, listen to a bar of count-in, then strike every subdivision with the
 * metronome. Afterwards each hit shows how early or late it was, and the tempo moves.
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

  protected readonly perBar = computed(() => 4 * (this.card()?.subdivision.perBeat ?? 1));

  protected readonly instruction = computed(() => {
    switch (this.session.stage()) {
      case 'count-in':
        return 'Listen…';
      case 'playing':
        return 'Play!';
      default:
        return this.session.result()
          ? ''
          : 'Press Play, listen to one bar, then strike every subdivision on the beat.';
    }
  });

  protected readonly summary = computed(() => {
    const result = this.session.result();
    return result ? scoreSummary(result.score) : '';
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
