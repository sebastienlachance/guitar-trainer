import { DestroyRef, Service, inject, signal } from '@angular/core';
import { AudioInputs } from './audio-inputs';
import { LevelMeter, rootMeanSquare } from './level';
import { INPUT_ENDED_MESSAGE, MicrophoneError, MicrophoneInput } from './microphone';

export type LevelCheckStatus = 'off' | 'starting' | 'checking' | 'error';

/** How often the meter reads the input: a timer, which keeps going while the window is covered. */
const FRAME_MS = 50;

/** The stretch of sound a reading covers: the same as a pitch reading's, so both agree. */
const WINDOW = 4096;

/**
 * Shows how loud the chosen input is, with its boost, so you can see whether the listeners hear
 * it. It opens the input only while you check, and lets it go when its component goes away.
 */
@Service({ autoProvided: false })
export class LevelCheck {
  private readonly inputs = inject(AudioInputs);

  readonly status = signal<LevelCheckStatus>('off');
  readonly errorMessage = signal<string | null>(null);
  /** The level the bar shows, as the root mean square of the samples. */
  readonly level = signal(0);
  /** Whether a note was loud enough for the listeners in the last couple of seconds. */
  readonly heard = signal(false);

  private input: MicrophoneInput | null = null;
  private frameTimer: ReturnType<typeof setInterval> | undefined;
  private session = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  async start(): Promise<void> {
    this.stop();
    const session = ++this.session;
    this.status.set('starting');
    this.errorMessage.set(null);
    try {
      const input = await this.inputs.open();
      if (session !== this.session) {
        input.close();
        return;
      }
      this.input = input;
      this.status.set('checking');
      this.measure(input);
      input.onEnded(() => {
        if (session === this.session) {
          this.stop();
          this.fail(INPUT_ENDED_MESSAGE);
        }
      });
    } catch (error) {
      if (session === this.session) {
        this.fail(
          error instanceof MicrophoneError ? error.message : 'The microphone could not be opened.',
        );
      }
    }
  }

  stop(): void {
    this.session++;
    clearInterval(this.frameTimer);
    this.input?.close();
    this.input = null;
    this.status.set('off');
    this.level.set(0);
    this.heard.set(false);
  }

  private fail(message: string): void {
    this.status.set('error');
    this.errorMessage.set(message);
  }

  private measure(input: MicrophoneInput): void {
    const analyser = input.context.createAnalyser();
    analyser.fftSize = WINDOW;
    input.source.connect(analyser);
    const samples = new Float32Array(WINDOW);
    const meter = new LevelMeter();
    this.frameTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const reading = meter.push(rootMeanSquare(samples), performance.now());
      this.level.set(reading.shown);
      this.heard.set(reading.heard);
    }, FRAME_MS);
  }
}
