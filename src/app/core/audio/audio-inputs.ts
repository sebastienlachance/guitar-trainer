import { Service, computed, signal } from '@angular/core';
import { loadJson, saveJson } from '../practice/storage';
import { MicrophoneInput, openMicrophone } from './microphone';

/** One sound input the browser offers, such as a microphone or a guitar cable. */
export interface AudioInput {
  readonly id: string;
  readonly label: string;
}

const STORAGE_KEY = 'audio:input';

/** Ids browsers use for "whatever the system default is", already covered by our default. */
const SYSTEM_ALIASES = ['default', 'communications'];

/**
 * The sound inputs you can practise with, and the one you chose: the default microphone, or
 * something like a Rocksmith Real Tone cable. Both the pitch and the rhythm listeners open it.
 */
@Service()
export class AudioInputs {
  /** The inputs found; their names stay hidden until the microphone has been allowed once. */
  readonly inputs = signal<readonly AudioInput[]>([]);
  /** The chosen input's id, or null for the default microphone. */
  readonly chosenId = signal<string | null>(loadChosen());
  /** The chosen input's name when it was chosen, to say which one is missing. */
  readonly chosenLabel = signal<string | null>(loadChosenLabel());

  /** Whether the inputs can be told apart: browsers only give names once access was allowed. */
  readonly named = computed(() => this.inputs().some((input) => input.label !== ''));

  /** The chosen input isn't connected now, so the default microphone is used instead. */
  readonly missing = computed(() => {
    const id = this.chosenId();
    return id !== null && this.named() && !this.inputs().some((input) => input.id === id);
  });

  constructor() {
    const devices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
    if (devices?.enumerateDevices) {
      // Plugging a cable in or out updates the list.
      devices.addEventListener?.('devicechange', () => void this.refresh());
      void this.refresh();
    }
  }

  /** The input to open: the chosen one if it's connected (or not known yet), else the default. */
  deviceToOpen(): string | null {
    return this.missing() ? null : this.chosenId();
  }

  /** Opens the input to listen to. Once it's open, the browser names the inputs: list them. */
  async open(): Promise<MicrophoneInput> {
    const input = await openMicrophone(this.deviceToOpen());
    if (!this.named()) {
      void this.refresh();
    }
    return input;
  }

  choose(input: AudioInput | null): void {
    this.chosenId.set(input?.id ?? null);
    this.chosenLabel.set(input?.label ?? null);
    saveJson(STORAGE_KEY, input ? { id: input.id, label: input.label } : null);
  }

  /** Asks for the microphone once, so the browser reveals the inputs' names, then lists them. */
  async reveal(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // Refused or unavailable: the list stays unnamed, and the default microphone is used.
    }
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.inputs.set(
      devices
        .filter(
          (device) => device.kind === 'audioinput' && !SYSTEM_ALIASES.includes(device.deviceId),
        )
        .map((device) => ({ id: device.deviceId, label: device.label })),
    );
  }
}

function loadSaved(): Record<string, unknown> | null {
  const saved = loadJson(STORAGE_KEY);
  return typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : null;
}

function loadChosen(): string | null {
  const id = loadSaved()?.['id'];
  return typeof id === 'string' && id !== '' ? id : null;
}

function loadChosenLabel(): string | null {
  const label = loadSaved()?.['label'];
  return typeof label === 'string' ? label : null;
}
