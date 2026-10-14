import { Service, signal } from '@angular/core';
import { AttackTimer } from './attack-timer';
import { ListenerStatus } from './mic-listener';
import { MicrophoneError, MicrophoneInput, openMicrophone } from './microphone';

/** Strikes kept: enough for a take of 4 bars of sixteenths with room to spare. */
const STRIKES_KEPT = 400;

/**
 * Strikes below this frequency are what's timed. A metronome tick (5 kHz, see `Metronome`) from
 * the speakers is filtered out before it can look like one; guitar notes and the thump of a
 * strum stay.
 */
const DETECTION_CUTOFF_HZ = 1500;

/**
 * Times your strikes to the millisecond, on the same audio clock as the metronome: play along
 * with it and the two can be compared directly. Separate from `MicListener`, which hears pitches.
 */
@Service()
export class RhythmListener {
  readonly status = signal<ListenerStatus>('off');
  readonly errorMessage = signal<string | null>(null);
  /** Strike times in seconds on `now()`'s clock, oldest first. */
  readonly strikes = signal<readonly number[]>([]);

  private input: MicrophoneInput | null = null;
  private session = 0;

  /** The audio clock, in seconds: schedule the metronome and read strikes against it. */
  now(): number {
    return this.input?.context.currentTime ?? 0;
  }

  /** The audio context the metronome plays through, once listening. */
  get context(): AudioContext | null {
    return this.input?.context ?? null;
  }

  /** Starts listening, or keeps listening if already started. */
  async start(): Promise<void> {
    if (this.status() === 'listening' || this.status() === 'starting') {
      return;
    }
    const session = ++this.session;
    this.status.set('starting');
    this.errorMessage.set(null);
    try {
      const input = await openMicrophone();
      await this.listen(input);
      if (session !== this.session) {
        input.close();
        return;
      }
      this.input = input;
      this.status.set('listening');
    } catch (error) {
      if (session === this.session) {
        this.status.set('error');
        this.errorMessage.set(
          error instanceof MicrophoneError ? error.message : 'The microphone could not be opened.',
        );
      }
    }
  }

  stop(): void {
    this.session++;
    this.input?.close();
    this.input = null;
    this.status.set('off');
    this.strikes.set([]);
  }

  clearStrikes(): void {
    this.strikes.set([]);
  }

  private async listen(input: MicrophoneInput): Promise<void> {
    const { context, source } = input;
    await context.audioWorklet.addModule('worklets/block-forwarder.js');
    // Two filters for a steep cut: the tick loses about 40 dB, the guitar barely anything.
    const lowPass = [0, 1].map(
      () => new BiquadFilterNode(context, { type: 'lowpass', frequency: DETECTION_CUTOFF_HZ }),
    );
    const forwarder = new AudioWorkletNode(context, 'block-forwarder');
    // A node only runs while connected towards the speakers; this one is silenced on the way.
    const silence = new GainNode(context, { gain: 0 });
    source.connect(lowPass[0]).connect(lowPass[1]).connect(forwarder).connect(silence);
    silence.connect(context.destination);

    const timer = new AttackTimer(context.sampleRate);
    forwarder.port.onmessage = ({
      data,
    }: MessageEvent<{ time: number; samples: Float32Array }>) => {
      const found = timer.push(data.samples, data.time);
      if (found.length > 0) {
        this.strikes.update((strikes) => [...strikes, ...found].slice(-STRIKES_KEPT));
      }
    };
  }
}
