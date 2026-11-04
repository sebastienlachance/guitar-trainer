import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../practice/storage';
import { InputPicker } from '../ui/setup/input-picker';
import { AudioInputs } from './audio-inputs';
import { MicrophoneInput, openMicrophone } from './microphone';

/** What the browser reports: names only once the microphone has been allowed. */
function device(deviceId: string, label: string, kind: MediaDeviceKind = 'audioinput') {
  return { deviceId, label, kind, groupId: '', toJSON: () => ({}) } as MediaDeviceInfo;
}

const ROCKSMITH = device('rocksmith', 'Rocksmith Guitar Adapter Mono');
const LAPTOP = device('laptop', 'Microphone Array (Realtek)');
const ROCKSMITH_INPUT = { id: 'rocksmith', label: 'Rocksmith Guitar Adapter Mono' };

/** Replaces navigator.mediaDevices; returns the mocks to steer it, and the stream's track. */
function fakeMediaDevices(devices: MediaDeviceInfo[]) {
  const track = Object.assign(new EventTarget(), { stop: vi.fn() });
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  const fake = {
    track,
    devices,
    enumerateDevices: vi.fn(async () => fake.devices),
    getUserMedia: vi.fn<(constraints: MediaStreamConstraints) => Promise<MediaStream>>(
      async () => stream,
    ),
    addEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, 'mediaDevices', { value: fake, configurable: true });
  return fake;
}

/**
 * Just enough of an AudioContext for `openMicrophone()` and the level check: the input plays a
 * steady sound at `amplitude`, turned up by its boost. Returns the context's `close`.
 */
function stubAudioContext({ resume = async () => undefined, amplitude = 0 } = {}) {
  const close = vi.fn(async () => undefined);
  vi.stubGlobal(
    'AudioContext',
    class {
      sampleRate = 48_000;
      resume = resume;
      close = close;
      boost = { gain: { value: 1 }, connect: (next: unknown) => next };
      createMediaStreamSource = () => ({ connect: (next: unknown) => next });
      createGain = () => this.boost;
      createAnalyser = () => ({
        fftSize: 2048,
        getFloatTimeDomainData: (samples: Float32Array) =>
          samples.fill(amplitude * this.boost.gain.value),
      });
    },
  );
  return close;
}

/** The sound coming out of an open input, as the listeners read it. */
function soundOf(input: MicrophoneInput): number {
  const samples = new Float32Array(1);
  input.context.createAnalyser().getFloatTimeDomainData(samples);
  return samples[0];
}

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AudioInputs', () => {
  async function inputsWith(devices: MediaDeviceInfo[]) {
    const media = fakeMediaDevices(devices);
    const inputs = TestBed.inject(AudioInputs);
    await inputs.refresh();
    return { inputs, media };
  }

  it('lists the inputs by name, without the system aliases or cameras', async () => {
    const { inputs } = await inputsWith([
      device('default', 'Default - Microphone Array (Realtek)'),
      device('communications', 'Communications - Microphone Array (Realtek)'),
      LAPTOP,
      ROCKSMITH,
      device('camera', 'HD Webcam', 'videoinput'),
    ]);

    expect(inputs.inputs().map((input) => input.label)).toEqual([
      'Microphone Array (Realtek)',
      'Rocksmith Guitar Adapter Mono',
    ]);
  });

  it('remembers the chosen input, and opens it', async () => {
    const { inputs } = await inputsWith([LAPTOP, ROCKSMITH]);

    inputs.choose({ id: 'rocksmith', label: 'Rocksmith Guitar Adapter Mono' });

    expect(inputs.deviceToOpen()).toBe('rocksmith');
    expect(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'audio:input')!)).toEqual({
      id: 'rocksmith',
      label: 'Rocksmith Guitar Adapter Mono',
    });
  });

  it('falls back to the default microphone while the chosen input is unplugged', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'audio:input',
      JSON.stringify({ id: 'rocksmith', label: 'Rocksmith Guitar Adapter Mono' }),
    );
    const { inputs, media } = await inputsWith([LAPTOP]);

    expect(inputs.missing()).toBe(true);
    expect(inputs.deviceToOpen()).toBeNull();

    media.devices = [LAPTOP, ROCKSMITH];
    await inputs.refresh();
    expect(inputs.deviceToOpen()).toBe('rocksmith');
  });

  it('asks for the microphone once to reveal the names', async () => {
    const { inputs, media } = await inputsWith([device('laptop', ''), device('rocksmith', '')]);
    expect(inputs.named()).toBe(false);

    media.devices = [LAPTOP, ROCKSMITH];
    await inputs.reveal();

    expect(media.getUserMedia).toHaveBeenCalledOnce();
    expect(inputs.named()).toBe(true);
  });

  it('keeps a boost for each input, and opens each turned up by its own', async () => {
    stubAudioContext({ amplitude: 0.001 });
    const { inputs } = await inputsWith([LAPTOP, ROCKSMITH]);

    inputs.choose(ROCKSMITH_INPUT);
    inputs.setBoost(8);
    inputs.choose(null);
    expect(inputs.boost()).toBe(1);
    expect(soundOf(await inputs.open())).toBeCloseTo(0.001);

    inputs.choose(ROCKSMITH_INPUT);
    expect(soundOf(await inputs.open())).toBeCloseTo(0.008);
    expect(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'audio:boost')!)).toEqual({
      rocksmith: 8,
    });
  });

  it('turns up an input already open when its boost changes', async () => {
    stubAudioContext({ amplitude: 0.001 });
    const { inputs } = await inputsWith([LAPTOP]);
    const input = await inputs.open();

    inputs.setBoost(4);

    expect(soundOf(input)).toBeCloseTo(0.004);
  });

  it('brings back the saved boosts, leaving out ones it does not offer', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'audio:boost',
      JSON.stringify({ rocksmith: 8, laptop: 3 }),
    );
    const { inputs } = await inputsWith([LAPTOP, ROCKSMITH]);

    inputs.choose(ROCKSMITH_INPUT);
    expect(inputs.boost()).toBe(8);
    inputs.choose({ id: 'laptop', label: 'Microphone Array (Realtek)' });
    expect(inputs.boost()).toBe(1);
  });

  it('names the inputs once a listener has opened the microphone', async () => {
    stubAudioContext();
    const { inputs, media } = await inputsWith([device('laptop', ''), device('rocksmith', '')]);

    media.devices = [LAPTOP, ROCKSMITH];
    await inputs.open();

    await vi.waitFor(() => expect(inputs.named()).toBe(true));
  });
});

describe('InputPicker', () => {
  it('offers the default microphone and each input, and remembers the choice', async () => {
    fakeMediaDevices([LAPTOP, ROCKSMITH]);
    const user = userEvent.setup();
    await render(InputPicker);
    await TestBed.inject(AudioInputs).refresh();

    const select = await screen.findByRole('combobox', { name: 'Input' });
    expect(
      [...(select as HTMLSelectElement).options].map((option) => option.textContent?.trim()),
    ).toEqual([
      'Default microphone',
      'Microphone Array (Realtek)',
      'Rocksmith Guitar Adapter Mono',
    ]);

    await user.selectOptions(
      select,
      screen.getByRole('option', { name: 'Rocksmith Guitar Adapter Mono' }),
    );
    expect(TestBed.inject(AudioInputs).chosenId()).toBe('rocksmith');
  });

  it('offers a boost, kept for the input chosen', async () => {
    fakeMediaDevices([LAPTOP, ROCKSMITH]);
    const user = userEvent.setup();
    await render(InputPicker);
    await TestBed.inject(AudioInputs).refresh();
    const select = await screen.findByRole('combobox', { name: 'Input' });

    const option = (name: string) => screen.getByRole('option', { name });

    await user.selectOptions(select, option('Rocksmith Guitar Adapter Mono'));
    await user.click(screen.getByRole('radio', { name: '×8' }));
    await user.selectOptions(select, option('Default microphone'));
    expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked();

    await user.selectOptions(select, option('Rocksmith Guitar Adapter Mono'));
    expect(screen.getByRole('radio', { name: '×8' })).toBeChecked();
  });

  it('checks the level: a quiet input is too quiet until it is boosted', async () => {
    const media = fakeMediaDevices([LAPTOP]);
    stubAudioContext({ amplitude: 0.002 });
    const user = userEvent.setup();
    await render(InputPicker);

    await user.click(screen.getByRole('button', { name: 'Check the level' }));
    expect(await screen.findByText(/Too quiet: pluck a string/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '×4' }));
    expect(await screen.findByText(/Heard: notes from this input/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Stop checking' }));
    expect(media.track.stop).toHaveBeenCalled();
    expect(screen.getByText(/Check the level to see/)).toBeInTheDocument();
  });

  it('says when the chosen input is not connected', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'audio:input',
      JSON.stringify({ id: 'rocksmith', label: 'Rocksmith Guitar Adapter Mono' }),
    );
    fakeMediaDevices([LAPTOP]);
    await render(InputPicker);
    await TestBed.inject(AudioInputs).refresh();

    expect(
      await screen.findByText(/Rocksmith Guitar Adapter Mono isn't connected/),
    ).toBeInTheDocument();
  });
});

describe('openMicrophone', () => {
  it('opens the chosen input, or the default one when it has gone', async () => {
    const media = fakeMediaDevices([LAPTOP]);
    media.getUserMedia.mockImplementationOnce(async () => {
      throw new DOMException('No such device', 'OverconstrainedError');
    });
    stubAudioContext();

    await openMicrophone('rocksmith');

    const [first, second] = media.getUserMedia.mock.calls.map(([constraints]) => constraints.audio);
    expect(first).toMatchObject({ deviceId: { exact: 'rocksmith' }, echoCancellation: false });
    expect(second).not.toHaveProperty('deviceId');
  });

  it('lets the microphone go when the sound cannot start', async () => {
    const media = fakeMediaDevices([LAPTOP]);
    const close = stubAudioContext({
      resume: async () => {
        throw new Error('Audio is blocked');
      },
    });

    await expect(openMicrophone()).rejects.toThrow('The sound could not be started');

    expect(media.track.stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('tells when the input stops by itself, as when its cable is unplugged', async () => {
    const media = fakeMediaDevices([LAPTOP]);
    stubAudioContext();
    const input = await openMicrophone();
    const ended = vi.fn();
    input.onEnded(ended);

    media.track.dispatchEvent(new Event('ended'));

    expect(ended).toHaveBeenCalledOnce();
  });
});
