import { Service, inject, signal } from '@angular/core';
import { PitchDetector } from 'pitchy';
import { chromaFromSpectrum } from './chroma';
import { AudioInputs } from './audio-inputs';
import {
  INPUT_ENDED_MESSAGE,
  MicrophoneError,
  MicrophoneInput,
  createAnalyser,
} from './microphone';
import { DEFAULT_NOTE_STREAM_OPTIONS, NoteStream } from './note-stream';
import { OnsetDetector } from './onsets';
import { PitchSmoother, TunerPitch } from './tuner';

/**
 * notes: played notes one at a time; spectrum: a live chroma vector of everything sounding;
 * pitch: the exact frequency sounding, for the tuner.
 */
export type ListenMode = 'notes' | 'spectrum' | 'pitch';
export type ListenerStatus = 'off' | 'starting' | 'listening' | 'error';

/** Whether a listener is off or failed, rather than listening or still opening. */
export function hasStopped(status: ListenerStatus): boolean {
  return status === 'off' || status === 'error';
}

/** About 85 ms at 48 kHz: several periods of the low E string, short enough to follow a melody. */
const PITCH_WINDOW = 4096;

/** Notes kept for matching; enough for a four-note shape played up and back down. */
const HEARD_LIMIT = 8;

/**
 * Analysis interval. A timer rather than requestAnimationFrame, which stops whenever the window
 * is covered, as it may be while you read a chart or a lesson video in front of it.
 */
const FRAME_MS = 30;

/** Turns the microphone into played notes, plus a live chroma vector in spectrum mode. */
@Service()
export class MicListener {
  private readonly inputs = inject(AudioInputs);

  readonly status = signal<ListenerStatus>('off');
  readonly errorMessage = signal<string | null>(null);
  /** Played notes as MIDI numbers, oldest first. */
  readonly heard = signal<readonly number[]>([]);
  /** Pitch-class energy of what is sounding now, or null during silence. Spectrum mode only. */
  readonly chroma = signal<readonly number[] | null>(null);
  /**
   * How many attacks (strums, or picks) have been heard, in spectrum and pitch modes. It only goes
   * up: compare with a count taken earlier to know whether you struck since, which a ringing
   * chord or a bend doesn't.
   */
  readonly strums = signal(0);
  /** The steadied pitch sounding now, or the last one while it fades. Pitch mode only. */
  readonly pitch = signal<TunerPitch | null>(null);

  private input: MicrophoneInput | null = null;
  private mode: ListenMode = 'notes';
  private frameTimer: ReturnType<typeof setInterval> | undefined;
  private session = 0;

  async start(mode: ListenMode): Promise<void> {
    this.stop();
    this.mode = mode;
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
      this.status.set('listening');
      this.listen(input, mode);
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

  /** Tries again after an error, in the same mode. */
  retry(): Promise<void> {
    return this.start(this.mode);
  }

  stop(): void {
    this.session++;
    clearInterval(this.frameTimer);
    this.input?.close();
    this.input = null;
    this.status.set('off');
    this.heard.set([]);
    this.chroma.set(null);
    this.pitch.set(null);
  }

  /** Forgets earlier notes, so the next prompt starts from a clean slate. */
  clearHeard(): void {
    this.heard.set([]);
  }

  private fail(message: string): void {
    this.status.set('error');
    this.errorMessage.set(message);
  }

  private listen(input: MicrophoneInput, mode: ListenMode): void {
    const analyser = createAnalyser(input);
    const sampleRate = input.sampleRate;
    const samples = new Float32Array(analyser.fftSize);
    const spectrum = new Float32Array(analyser.frequencyBinCount);
    const detector = PitchDetector.forFloat32Array(PITCH_WINDOW);
    const notes = new NoteStream();
    const onsets = new OnsetDetector();
    const smoother = new PitchSmoother();

    const onFrame = () => {
      const time = performance.now();
      analyser.getFloatTimeDomainData(samples);
      const window = samples.subarray(samples.length - PITCH_WINDOW);
      const level = rootMeanSquare(window);
      const [frequency, clarity] = detector.findPitch(window, sampleRate);
      const attack = onsets.push({ level, time });
      if (attack && mode !== 'notes') {
        this.strums.update((count) => count + 1);
      }
      if (mode === 'pitch') {
        if (attack) {
          smoother.restart();
        }
        this.pitch.set(smoother.push({ frequency, clarity, level, time }));
        return;
      }
      if (attack) {
        notes.rearm();
      }
      const note = notes.push({ frequency, clarity, level, time });
      if (note !== null) {
        this.heard.update((heard) => [...heard, note].slice(-HEARD_LIMIT));
      }
      if (mode === 'spectrum') {
        analyser.getFloatFrequencyData(spectrum);
        const sounding = level >= DEFAULT_NOTE_STREAM_OPTIONS.minLevel;
        this.chroma.set(sounding ? chromaFromSpectrum(spectrum, sampleRate) : null);
      }
    };
    this.frameTimer = setInterval(onFrame, FRAME_MS);
  }
}

function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) {
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
}
