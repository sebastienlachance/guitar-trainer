import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AudioInputs } from '../core/audio/audio-inputs';
import { MicListener } from '../core/audio/mic-listener';
import {
  A4_HZ,
  IN_TUNE_CENTS,
  TunedStrings,
  openNote,
  readPitch,
  tuneAdvice,
} from '../core/audio/tuner';
import { STRING_NAMES, STRING_NUMBERS } from '../core/fretboard/tuning';
import { commonNoteName } from '../core/music/notes';
import { Icon } from '../core/ui/icon';
import { keepScreenAwake } from '../core/ui/keep-awake';
import { MicStatus } from '../core/ui/mic-status';
import { InputPicker } from '../core/ui/setup/input-picker';
import { TopBar } from '../core/ui/top-bar';
import { plural } from '../core/ui/text';

/** Strings in the order they're named when tuning: from the low E to the high E. */
const LOW_TO_HIGH = [...STRING_NUMBERS].reverse();

/** Marks on the scale, in cents. */
const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

/**
 * A guitar tuner: the note you play, how many cents it's off, and which way to turn the peg of
 * the string it belongs to in standard tuning. Each string gets a tick once it stays in tune.
 */
@Component({
  selector: 'app-tuner-page',
  imports: [Icon, InputPicker, MicStatus, TopBar],
  templateUrl: './tuner-page.html',
  styleUrl: './tuner-page.css',
})
export class TunerPage {
  private readonly mic = inject(MicListener);
  private readonly inputs = inject(AudioInputs);

  protected readonly referenceHz = A4_HZ;
  protected readonly ticks = TICKS;

  protected readonly pitch = this.mic.pitch;
  protected readonly reading = computed(() => {
    const pitch = this.pitch();
    if (!pitch) {
      return null;
    }
    const { midi, cents } = readPitch(pitch.frequency);
    return {
      note: commonNoteName(midi),
      octave: Math.floor(midi / 12) - 1,
      hz: pitch.frequency.toFixed(1),
      cents,
      centsText: describeCents(cents),
      onNote: Math.abs(cents) <= IN_TUNE_CENTS,
    };
  });

  protected readonly advice = computed(() => {
    const pitch = this.pitch();
    return pitch ? tuneAdvice(pitch.frequency) : null;
  });

  /** "Tune up", "Tune down to A", "In tune", or why there's no advice. */
  protected readonly action = computed(() => {
    const pitch = this.pitch();
    const advice = this.advice();
    if (!pitch) {
      return null;
    }
    if (!advice) {
      return { text: 'Not an open string', direction: null };
    }
    if (advice.direction === 'in-tune') {
      return { text: 'In tune', direction: advice.direction };
    }
    const target = openNote(advice.string);
    const verb = advice.direction === 'up' ? 'Tune up' : 'Tune down';
    const onTarget = readPitch(pitch.frequency).midi === target;
    return {
      text: onTarget ? verb : `${verb} to ${commonNoteName(target)}`,
      direction: advice.direction,
    };
  });

  /** Read out by screen readers: only when the note or the advice changes. */
  protected readonly announcement = computed(() => {
    const reading = this.reading();
    const action = this.action();
    return reading && action ? `${reading.note}${reading.octave}, ${action.text}` : '';
  });

  protected readonly tuned = signal<ReadonlySet<number>>(new Set());

  protected readonly strings = computed(() => {
    const advice = this.pitch()?.fading ? null : this.advice();
    return LOW_TO_HIGH.map((string) => ({
      number: string,
      name: STRING_NAMES[string - 1],
      nearest: advice?.string === string,
      tuned: this.tuned().has(string),
    }));
  });

  constructor() {
    keepScreenAwake(signal(true));

    // Listens from the start, and again on the new input when you choose another one.
    effect(() => {
      this.inputs.deviceToOpen();
      untracked(() => void this.mic.start('pitch'));
    });

    const tracker = new TunedStrings();
    effect(() => {
      const pitch = this.pitch();
      const advice = pitch && !pitch.fading ? this.advice() : null;
      const done = tracker.push(advice, pitch?.time ?? 0);
      if (done !== null) {
        this.tuned.update((tuned) => new Set(tuned).add(done));
      }
    });

    inject(DestroyRef).onDestroy(() => this.mic.stop());
  }
}

/** "−12 cents", "+1 cent", "0 cents": with a true minus sign. */
function describeCents(cents: number): string {
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? '−' : rounded > 0 ? '+' : '';
  return sign + plural(Math.abs(rounded), 'cent');
}
