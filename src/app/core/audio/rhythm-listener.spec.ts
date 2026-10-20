import { TestBed } from '@angular/core/testing';
import { AudioInputs } from './audio-inputs';
import { MicrophoneInput } from './microphone';
import { RhythmListener } from './rhythm-listener';

/** An audio node that passes `connect` along, as the real ones chain. */
class FakeNode {
  readonly port = {};
  connect<T>(next: T): T {
    return next;
  }
}

function fakeInput(): MicrophoneInput {
  const context = {
    audioWorklet: { addModule: async () => undefined },
    destination: {},
    currentTime: 0,
    sampleRate: 48_000,
  } as unknown as AudioContext;
  return {
    context,
    source: new FakeNode() as unknown as MediaStreamAudioSourceNode,
    sampleRate: 48_000,
    close: vi.fn(),
  };
}

describe('RhythmListener', () => {
  beforeEach(() => {
    for (const name of ['BiquadFilterNode', 'AudioWorkletNode', 'GainNode']) {
      vi.stubGlobal(name, FakeNode);
    }
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lets a caller that comes while the microphone opens wait until it listens', async () => {
    let opened!: (input: MicrophoneInput) => void;
    const inputs = {
      open: vi.fn(() => new Promise<MicrophoneInput>((resolve) => (opened = resolve))),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AudioInputs, useValue: inputs }] });
    const listener = TestBed.inject(RhythmListener);

    const first = listener.start();
    const second = listener.start();
    opened(fakeInput());
    await second;

    expect(inputs.open).toHaveBeenCalledOnce();
    expect(listener.status()).toBe('listening');
    expect(listener.context).not.toBeNull();
    await first;
  });
});
