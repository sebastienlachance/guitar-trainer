import { Service, signal } from '@angular/core';
import { PitchDetector } from 'pitchy';
import { chromaFromSpectrum } from './chroma';
import { MicrophoneError, MicrophoneInput, openMicrophone } from './microphone';
import { DEFAULT_NOTE_STREAM_OPTIONS, NoteStream } from './note-stream';

export type ListenMode = 'arpeggio' | 'strum';
export type ListenerStatus = 'off' | 'starting' | 'listening' | 'error';

/** About 85 ms at 48 kHz: several periods of the low E string, short enough to follow a melody. */
const PITCH_WINDOW = 4096;

/** Notes kept for matching; enough for a four-note shape played up and back down. */
const HEARD_LIMIT = 8;

/**
 * Analysis interval. A timer rather than requestAnimationFrame, which stops whenever the window
 * is covered, as it may be while you read a chart or a lesson video in front of it.
 */
const FRAME_MS = 30;

/** Turns the microphone into played notes (arpeggio mode) or a live chroma vector (strum mode). */
@Service()
export class MicListener {
  readonly status = signal<ListenerStatus>('off');
  readonly errorMessage = signal<string | null>(null);
  /** Played notes as MIDI numbers, oldest first. */
  readonly heard = signal<readonly number[]>([]);
  /** Pitch-class energy of what is sounding now, or null during silence. Strum mode only. */
  readonly chroma = signal<readonly number[] | null>(null);

  private input: MicrophoneInput | null = null;
  private frameTimer: ReturnType<typeof setInterval> | undefined;
  private session = 0;

  async start(mode: ListenMode): Promise<void> {
    this.stop();
    const session = ++this.session;
    this.status.set('starting');
    this.errorMessage.set(null);
    try {
      const input = await openMicrophone();
      if (session !== this.session) {
        input.close();
        return;
      }
      this.input = input;
      this.status.set('listening');
      this.listen(input, mode);
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
    clearInterval(this.frameTimer);
    this.input?.close();
    this.input = null;
    this.status.set('off');
    this.heard.set([]);
    this.chroma.set(null);
  }

  /** Forgets earlier notes, so the next prompt starts from a clean slate. */
  clearHeard(): void {
    this.heard.set([]);
  }

  private listen({ analyser, sampleRate }: MicrophoneInput, mode: ListenMode): void {
    const samples = new Float32Array(analyser.fftSize);
    const spectrum = new Float32Array(analyser.frequencyBinCount);
    const detector = PitchDetector.forFloat32Array(PITCH_WINDOW);
    const notes = new NoteStream();

    const onFrame = () => {
      const time = performance.now();
      analyser.getFloatTimeDomainData(samples);
      const window = samples.subarray(samples.length - PITCH_WINDOW);
      const level = rootMeanSquare(window);
      const [frequency, clarity] = detector.findPitch(window, sampleRate);
      const note = notes.push({ frequency, clarity, level, time });
      if (note !== null) {
        this.heard.update((heard) => [...heard, note].slice(-HEARD_LIMIT));
      }
      if (mode === 'strum') {
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
