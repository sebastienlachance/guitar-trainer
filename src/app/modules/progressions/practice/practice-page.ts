import { Component, computed, inject } from '@angular/core';
import { Metronome } from '../../../core/audio/metronome';
import { RhythmListener } from '../../../core/audio/rhythm-listener';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { chordsText, outcomeSummary, slotOutcome } from '../deck';
import { ProgressionsSession } from '../progressions-session';

const OUTCOME_WORDS = { 'on-time': 'on time', late: 'late', missed: 'missed' } as const;

/**
 * Progressions: press Play (or Space), listen to a bar, then play the progression twice through,
 * each chord on its first beat. Afterwards each chord shows how it landed, and the tempo moves.
 */
@Component({
  selector: 'app-progressions-practice-page',
  imports: [MicStatus, PracticeFrame],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class PracticePage {
  protected readonly session = inject(ProgressionsSession);
  protected readonly listener = inject(RhythmListener);
  protected readonly beat = inject(Metronome).beat;
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  protected readonly settings = this.session.settings;
  protected readonly counts = [1, 2, 3, 4];

  /** The take's tempo while showing its result: the ladder may already have moved on. */
  protected readonly bpm = computed(() => this.session.result()?.bpm ?? this.session.tempo());

  protected readonly chords = computed(() => {
    const card = this.card();
    return card ? chordsText(card) : '';
  });

  /** "I–V–vi–IV in G · a bar each". */
  protected readonly kind = computed(() => {
    const card = this.card();
    const each = this.settings().beatsPerChord === 4 ? 'a bar each' : '2 beats each';
    return `${card?.name ?? 'Your progression'} · ${each}`;
  });

  /** The chord to play now and the one after it, while the take plays. */
  protected readonly now = computed(() => {
    const slots = this.session.slots();
    const index = this.session.currentSlot();
    return index >= 0 && index < slots.length
      ? { chord: slots[index].chord.name, next: slots[index + 1]?.chord.name ?? null }
      : null;
  });

  /** "First time through", "Second time through". */
  protected readonly pass = computed(() => {
    const length = this.card()?.chords.length ?? 1;
    return Math.max(0, this.session.currentSlot()) < length
      ? 'First time through'
      : 'Second time through';
  });

  /**
   * The chords of the take, a row for each time through, each with how it landed: as it happens
   * during the take, all of them after it.
   */
  protected readonly rows = computed(() => {
    const card = this.card();
    const slots = this.session.slots();
    if (!card || slots.length === 0) {
      return [];
    }
    const result = this.session.result();
    const hits = this.session.hits();
    const beat = 60 / this.bpm();
    const current = this.session.currentSlot();
    const marked = slots.map((slot, index) => {
      const outcome = result
        ? result.outcomes[index]
        : hits[index] !== null
          ? slotOutcome(slot, hits[index], beat)
          : null;
      return {
        name: slot.chord.name,
        outcome,
        words: outcome ? OUTCOME_WORDS[outcome] : index === current ? 'now' : '',
        now: !result && index === current,
      };
    });
    const length = card.chords.length;
    const rows = [
      { label: 'First time through', chords: marked.slice(0, length) },
      { label: 'Second time through', chords: marked.slice(length) },
    ];
    // During the take, only the time through in progress.
    return result ? rows : [rows[Math.max(0, current) < length ? 0 : 1]];
  });

  protected readonly summary = computed(() => {
    const result = this.session.result();
    return result ? outcomeSummary(result.outcomes) : '';
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

  /** The notes of the chord to play now, for the spectrum under the microphone status. */
  protected readonly spectrumFor = computed(() => {
    const index = this.session.currentSlot();
    return this.session.slots()[index]?.chord.pitchClasses ?? null;
  });

  /** Space plays a take; the practice frame doesn't use it while a card waits. */
  protected onKeydown(event: KeyboardEvent): void {
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      event.key !== ' ' ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      inControl ||
      this.run.view() !== 'running' ||
      this.run.phase() !== 'prompt' ||
      this.session.stage() !== 'idle'
    ) {
      return;
    }
    void this.session.play();
    // Also stops Space from clicking the focused Play button a second time.
    event.preventDefault();
  }
}
