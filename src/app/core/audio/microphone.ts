/** The open microphone, on its own audio clock: nodes added to `context` share its timing. */
export interface MicrophoneInput {
  readonly context: AudioContext;
  readonly source: MediaStreamAudioSourceNode;
  readonly sampleRate: number;
  /** Calls `listener` if the input stops by itself, as when its cable is unplugged. */
  onEnded(listener: () => void): void;
  close(): void;
}

/** What a listener says when its input stops by itself. */
export const INPUT_ENDED_MESSAGE =
  'The sound input stopped: was it unplugged? Try again to listen to what is connected now.';

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

/** Echo cancellation, noise suppression and auto gain are tuned for speech; they smear notes. */
const RAW_AUDIO = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

/**
 * Opens a sound input with the browser's voice processing turned off: `deviceId` for a chosen one
 * (see `AudioInputs`), null for the default microphone. A chosen input that isn't there any more
 * falls back to the default.
 */
export async function openMicrophone(deviceId: string | null = null): Promise<MicrophoneInput> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneError('The microphone needs a secure page (https or localhost).');
  }
  let stream: MediaStream;
  try {
    stream = await requestAudio(deviceId);
  } catch (error) {
    throw new MicrophoneError(describeAccessError(error));
  }
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
  let context: AudioContext | null = null;
  try {
    context = new AudioContext();
    await context.resume();
    const source = context.createMediaStreamSource(stream);
    const opened = context;
    return {
      context: opened,
      source,
      sampleRate: opened.sampleRate,
      onEnded: (listener) =>
        stream.getAudioTracks().forEach((track) => track.addEventListener('ended', listener)),
      close: () => {
        stopTracks();
        void opened.close();
      },
    };
  } catch (error) {
    // Let the microphone go: the browser would show it as in use until the page closes.
    stopTracks();
    void context?.close();
    throw new MicrophoneError(
      `The sound could not be started${error instanceof Error ? `: ${error.message}` : '.'}`,
    );
  }
}

async function requestAudio(deviceId: string | null): Promise<MediaStream> {
  if (deviceId === null) {
    return navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { ...RAW_AUDIO, deviceId: { exact: deviceId } },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'OverconstrainedError' || name === 'NotFoundError') {
      return navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO });
    }
    throw error;
  }
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
