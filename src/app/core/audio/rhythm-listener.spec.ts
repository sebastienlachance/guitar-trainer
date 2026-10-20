import { TestBed } from '@angular/core/testing';
import { AudioInputs } from './audio-inputs';
import { INPUT_ENDED_MESSAGE, MicrophoneInput } from './microphone';
import { RhythmListener } from './rhythm-listener';

/** An audio node that passes `connect` along, as the real ones chain. */
class FakeNode {
  readonly port = {};
  connect<T>(next: T): T {
    return next;
  }
}

/** An input; `end()` stops it as unplugging its cable would. */
function fakeInput(addModule = async () => undefined) {
  const context = {
    audioWorklet: { addModule },
    destination: {},
    currentTime: 0,
    sampleRate: 48_000,
  } as unknown as AudioContext;
  const ended: (() => void)[] = [];
  const input = {
    context,
    source: new FakeNode() as unknown as MediaStreamAudioSourceNode,
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
  return { listener: TestBed.inject(RhythmListener), inputs, opening };
}

describe('RhythmListener', () => {
  beforeEach(() => {
    for (const name of ['BiquadFilterNode', 'AudioWorkletNode', 'GainNode']) {
      vi.stubGlobal(name, FakeNode);
    }
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lets a caller that comes while the microphone opens wait until it listens', async () => {
    const { listener, inputs, opening } = listenerWithInputs();

    const first = listener.start();
    const second = listener.start();
    opening[0](fakeInput().input);
    await second;

    expect(inputs.open).toHaveBeenCalledOnce();
    expect(listener.status()).toBe('listening');
    expect(listener.context).not.toBeNull();
    await first;
  });

  it('starts afresh after a stop while the microphone opened', async () => {
    const { listener, inputs, opening } = listenerWithInputs();
    const stale = fakeInput().input;

    const first = listener.start();
    listener.stop();
    const second = listener.start();
    opening[0](stale);
    opening[1](fakeInput().input);
    await Promise.all([first, second]);

    expect(inputs.open).toHaveBeenCalledTimes(2);
    expect(stale.close).toHaveBeenCalled();
    expect(listener.status()).toBe('listening');
  });

  it('lets the microphone go when strike timing cannot start', async () => {
    const { listener, opening } = listenerWithInputs();
    const { input } = fakeInput(async () => {
      throw new Error('No AudioWorklet');
    });

    const started = listener.start();
    opening[0](input);
    await started;

    expect(input.close).toHaveBeenCalled();
    expect(listener.status()).toBe('error');
    expect(listener.errorMessage()).toBe('Strike timing could not be started in this browser.');
  });

  it('says so when its input stops by itself, as when a cable is unplugged', async () => {
    const { listener, opening } = listenerWithInputs();
    const { input, end } = fakeInput();
    const started = listener.start();
    opening[0](input);
    await started;

    end();

    expect(listener.status()).toBe('error');
    expect(listener.errorMessage()).toBe(INPUT_ENDED_MESSAGE);
    expect(input.close).toHaveBeenCalled();
  });
});
