import { TestBed } from '@angular/core/testing';
import { AudioInputs } from './audio-inputs';
import { MicListener } from './mic-listener';
import { INPUT_ENDED_MESSAGE, MicrophoneInput } from './microphone';

/** A silent input; `end()` stops it as unplugging its cable would. */
function fakeInput() {
  const analyser = {
    fftSize: 16384,
    frequencyBinCount: 8192,
    getFloatTimeDomainData: () => undefined,
    getFloatFrequencyData: () => undefined,
  };
  const context = { createAnalyser: () => analyser } as unknown as AudioContext;
  const ended: (() => void)[] = [];
  const input = {
    context,
    source: { connect: () => undefined } as unknown as MediaStreamAudioSourceNode,
    sampleRate: 48_000,
    onEnded: (listener: () => void) => ended.push(listener),
    close: vi.fn(),
  } satisfies MicrophoneInput;
  return { input, end: () => ended.forEach((listener) => listener()) };
}

/** A listener whose inputs open when the test says so. */
function listenerWithInputs() {
  const opening: ((input: MicrophoneInput) => void)[] = [];
  const inputs = {
    open: vi.fn(() => new Promise<MicrophoneInput>((resolve) => opening.push(resolve))),
  };
  TestBed.configureTestingModule({ providers: [{ provide: AudioInputs, useValue: inputs }] });
  return { listener: TestBed.inject(MicListener), opening };
}

describe('MicListener', () => {
  afterEach(() => TestBed.inject(MicListener).stop());

  it('lets go of an input that opens after it was stopped', async () => {
    const { listener, opening } = listenerWithInputs();
    const { input } = fakeInput();

    const started = listener.start('notes');
    listener.stop();
    opening[0](input);
    await started;

    expect(input.close).toHaveBeenCalled();
    expect(listener.status()).toBe('off');
  });

  it('says so when its input stops by itself, as when a cable is unplugged', async () => {
    const { listener, opening } = listenerWithInputs();
    const { input, end } = fakeInput();
    const started = listener.start('spectrum');
    opening[0](input);
    await started;
    expect(listener.status()).toBe('listening');

    end();

    expect(listener.status()).toBe('error');
    expect(listener.errorMessage()).toBe(INPUT_ENDED_MESSAGE);
    expect(input.close).toHaveBeenCalled();
  });
});
