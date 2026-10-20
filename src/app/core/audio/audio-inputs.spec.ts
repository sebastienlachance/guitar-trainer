import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../practice/storage';
import { InputPicker } from '../ui/setup/input-picker';
import { AudioInputs } from './audio-inputs';
import { openMicrophone } from './microphone';

/** What the browser reports: names only once the microphone has been allowed. */
function device(deviceId: string, label: string, kind: MediaDeviceKind = 'audioinput') {
  return { deviceId, label, kind, groupId: '', toJSON: () => ({}) } as MediaDeviceInfo;
}

const ROCKSMITH = device('rocksmith', 'Rocksmith Guitar Adapter Mono');
const LAPTOP = device('laptop', 'Microphone Array (Realtek)');

/** Replaces navigator.mediaDevices; returns the mocks to steer it. */
function fakeMediaDevices(devices: MediaDeviceInfo[]) {
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  const fake = {
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

/** Just enough of an AudioContext for `openMicrophone()`. */
function stubAudioContext(): void {
  vi.stubGlobal(
    'AudioContext',
    class {
      sampleRate = 48_000;
      resume = async () => undefined;
      createMediaStreamSource = () => ({});
      close = async () => undefined;
    },
  );
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
});
