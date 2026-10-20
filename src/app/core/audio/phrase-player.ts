import { Service, signal } from '@angular/core';
import { midiToFrequency } from './note-stream';
import { pluck } from './pluck';

/** Time from one note of a phrase to the next. */
export const NOTE_GAP_S = 0.6;
/** How long each note rings: a little past the next, as a string left to ring would. */
export const NOTE_S = 0.8;
/** Time to schedule the first note. */
const LEAD_S = 0.05;

/**
 * Plays short phrases of plucked notes through the speakers, for ear training. Its own audio
 * context: the microphone's clock doesn't matter here.
 */
@Service()
export class PhrasePlayer {
  /** A phrase is sounding: what the microphone hears now is the speakers, not the guitar. */
  readonly playing = signal(false);

  private context: AudioContext | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private finish: ((completed: boolean) => void) | null = null;
  private endTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Plays MIDI notes one after another. Resolves true once the last one has rung out, or false
   * when stopped first (by `stop()`, or by another phrase).
   */
  play(notes: readonly number[]): Promise<boolean> {
    this.stop();
    // Created on first use, which follows a click or a key: browsers only start audio after one.
    const context = (this.context ??= new AudioContext());
    void context.resume();
    const start = context.currentTime + LEAD_S;
    this.sources = notes.map((midi, index) => {
      const { sampleRate, samples } = pluck(midiToFrequency(midi), NOTE_S);
      const buffer = context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const source = new AudioBufferSourceNode(context, { buffer });
      source.connect(context.destination);
      source.start(start + index * NOTE_GAP_S);
      return source;
    });
    this.playing.set(true);
    const lastsMs = (LEAD_S + (notes.length - 1) * NOTE_GAP_S + NOTE_S) * 1000;
    return new Promise((resolve) => {
      this.finish = resolve;
      this.endTimer = setTimeout(() => this.settle(true), lastsMs);
    });
  }

  stop(): void {
    this.sources.forEach((source) => source.stop());
    this.settle(false);
  }

  private settle(completed: boolean): void {
    clearTimeout(this.endTimer);
    this.sources = [];
    this.playing.set(false);
    this.finish?.(completed);
    this.finish = null;
  }
}
