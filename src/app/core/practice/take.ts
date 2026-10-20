import { Signal, effect, signal, untracked } from '@angular/core';
import { PracticeCard, PracticeRun } from './practice-run';

/** idle: no take; starting: getting ready, as the microphone opens; then the module's stages. */
export type TakeStage<S extends string> = 'idle' | 'starting' | S;

export interface TakeOptions {
  /** The session the takes belong to: a take only runs while it does. */
  readonly run: PracticeRun<PracticeCard>;
  /**
   * True once the microphone a take listens to has stopped, as when its cable is unplugged. Leave
   * it out for takes nothing listens to.
   */
  readonly inputLost?: Signal<boolean>;
  /** Runs whenever a take stops, finished or dropped: silence the metronome there. */
  readonly onStop?: () => void;
}

/**
 * A take in a module you play along with (play along, chord changes, progressions): its stage,
 * and the timers that move it on. A take is dropped when the session pauses or the microphone
 * stops, since its result would mean nothing, and a second Play does nothing while one is under
 * way. Create it as a field of the module service, after its `PracticeRun`.
 */
export class Take<S extends string> {
  readonly stage = signal<TakeStage<S>>('idle');

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private readonly options: TakeOptions) {
    effect(() => {
      const stage = this.stage();
      // While starting, the microphone may still be opening.
      const lost = stage !== 'starting' && options.inputLost?.() === true;
      if (stage !== 'idle' && (options.run.paused() || lost)) {
        untracked(() => this.stop());
      }
    });
  }

  /** Whether a take can start now: a card waits for its answer, and no take is under way. */
  canStart(): boolean {
    const run = this.options.run;
    return run.view() === 'running' && run.phase() === 'prompt' && this.stage() === 'idle';
  }

  /**
   * Gets a take ready with `ready`, such as opening the microphone, in the starting stage.
   * Resolves to what `ready` gave once the take can go ahead, or null when it can't start now,
   * `ready` gave null, or the take was dropped meanwhile.
   */
  async prepare<T>(ready: () => Promise<T | null>): Promise<T | null> {
    if (!this.canStart()) {
      return null;
    }
    this.stage.set('starting');
    const value = await ready();
    if (this.stage() !== 'starting') {
      return null;
    }
    if (value === null) {
      this.stage.set('idle');
    }
    return value;
  }

  /** Runs `action` after `ms`, unless the take stops first. */
  after(ms: number, action: () => void): void {
    this.timers.push(setTimeout(action, Math.max(0, ms)));
  }

  /** Ends the take, finished or dropped: clears its timers and goes back to idle. */
  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.options.onStop?.();
    this.stage.set('idle');
  }
}
