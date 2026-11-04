import { Service, computed, signal } from '@angular/core';
import { loadJson, saveJson } from '../practice/storage';
import { MicrophoneInput, openMicrophone } from './microphone';

/** One sound input the browser offers, such as a microphone or a guitar cable. */
export interface AudioInput {
  readonly id: string;
  readonly label: string;
}

const STORAGE_KEY = 'audio:input';
const BOOST_KEY = 'audio:boost';

/** How much a quiet input can be turned up: each step doubles it. 1 leaves it as it comes in. */
export const BOOSTS: readonly number[] = [1, 2, 4, 8, 16];

/** Where the default microphone's boost is kept: the system default's id, never a chosen one. */
const DEFAULT_BOOST_KEY = 'default';

/** Ids browsers use for "whatever the system default is", already covered by our default. */
const SYSTEM_ALIASES = ['default', 'communications'];

/**
 * The sound inputs you can practise with, and the one you chose: the default microphone, or
 * something like a Rocksmith Real Tone cable. Both the pitch and the rhythm listeners open it,
 * turned up by the boost kept for it.
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

  /** Each input's boost, by id; inputs never boosted are left out. */
  private readonly boosts = signal<Readonly<Record<string, number>>>(loadBoosts());
  private readonly boostKey = computed(() => this.deviceToOpen() ?? DEFAULT_BOOST_KEY);
  /** How much the input to open is turned up. */
  readonly boost = computed(() => this.boosts()[this.boostKey()] ?? 1);
  /** The inputs open now, with whose boost they follow. */
  private readonly opened = new Set<{ readonly key: string; readonly input: MicrophoneInput }>();

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

  /**
   * Opens the input to listen to, turned up by its boost; a change of boost reaches it while it's
   * open. Once it's open, the browser names the inputs: list them.
   */
  async open(): Promise<MicrophoneInput> {
    const deviceId = this.deviceToOpen();
    const input = await openMicrophone(deviceId);
    const opened = { key: deviceId ?? DEFAULT_BOOST_KEY, input };
    // Read after opening, so a boost chosen meanwhile isn't missed.
    input.setBoost(this.boosts()[opened.key] ?? 1);
    this.opened.add(opened);
    if (!this.named()) {
      void this.refresh();
    }
    return {
      ...input,
      close: () => {
        this.opened.delete(opened);
        input.close();
      },
    };
  }

  /** Turns the input to open up by `boost`, and keeps it for that input. */
  setBoost(boost: number): void {
    const key = this.boostKey();
    this.boosts.update((boosts) => ({ ...boosts, [key]: boost }));
    saveJson(BOOST_KEY, this.boosts());
    for (const { key: inputKey, input } of this.opened) {
      if (inputKey === key) {
        input.setBoost(boost);
      }
    }
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

function loadBoosts(): Record<string, number> {
  const saved = loadJson(BOOST_KEY);
  if (typeof saved !== 'object' || saved === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(saved).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && BOOSTS.includes(entry[1]),
    ),
  );
}

function loadChosenLabel(): string | null {
  const label = loadSaved()?.['label'];
  return typeof label === 'string' ? label : null;
}
