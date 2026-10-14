/** The open microphone, on its own audio clock: nodes added to `context` share its timing. */
export interface MicrophoneInput {
  readonly context: AudioContext;
  readonly source: MediaStreamAudioSourceNode;
  readonly sampleRate: number;
  close(): void;
}

/**
 * Large enough for ~3 Hz frequency bins, which separates neighbouring semitones down to the low
 * E string in the strum chroma. Pitch detection only reads the most recent part of the buffer.
 */
const FFT_SIZE = 16384;

/** An analyser on the microphone, for pitch detection and the strum chroma. */
export function createAnalyser(input: MicrophoneInput): AnalyserNode {
  const analyser = input.context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  // Smooths only the frequency data, so a strum's chroma settles instead of flickering.
  analyser.smoothingTimeConstant = 0.6;
  input.source.connect(analyser);
  return analyser;
}

/**
 * Opens the microphone with the browser's voice processing turned off: echo cancellation, noise
 * suppression and auto gain are tuned for speech and smear sustained instrument notes.
 */
export async function openMicrophone(): Promise<MicrophoneInput> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneError('The microphone needs a secure page (https or localhost).');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (error) {
    throw new MicrophoneError(describeAccessError(error));
  }
  const context = new AudioContext();
  await context.resume();
  return {
    context,
    source: context.createMediaStreamSource(stream),
    sampleRate: context.sampleRate,
    close: () => {
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}

export class MicrophoneError extends Error {}

function describeAccessError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
      return 'Microphone access was blocked. Allow it in the site settings, then try again.';
    case 'NotFoundError':
      return 'No microphone was found.';
    case 'NotReadableError':
      return 'The microphone is in use by another app.';
    default:
      return `The microphone could not be opened${error instanceof Error ? `: ${error.message}` : '.'}`;
  }
}
