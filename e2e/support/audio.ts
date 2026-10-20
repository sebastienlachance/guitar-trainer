import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SAMPLE_RATE = 48_000;

/** Where the generated microphone recordings go; recreated before every run. */
export const AUDIO_DIR = 'e2e/.generated';

/** Recordings the fake microphone can play, by name: one note, or the notes of a chord. */
export const TONES = {
  /** F♯3, fret 9 on the A string. */
  fSharp3: 185.0,
  /** E3, fret 7 on the A string. */
  e3: 164.81,
  /** A3, fret 2 on the G string. */
  a3: 220.0,
  /** The open A string 20 cents flat (in tune is 110 Hz). */
  flatA2: 108.74,
  /** Csus4 strummed: C3, F3 and G3 together. */
  cSus4: [130.81, 174.61, 196.0],
} as const;

/** Steady plucks, for rhythm: a plucked A2 every `intervalMs`. */
export const PLUCK_TRAINS = {
  /** One pluck per beat at 80 bpm. 3 s holds exactly 4 beats, so the looping keeps time. */
  plucks80: { frequency: 110, intervalMs: 750, seconds: 3 },
} as const;

export type Recording = keyof typeof TONES | keyof typeof PLUCK_TRAINS;

/** Absolute path of a recording, as Chromium's fake-microphone flag needs. */
export function recordingPath(name: Recording): string {
  return resolve(AUDIO_DIR, `${name}.wav`);
}

/**
 * A steady note, or several sounding together, as a 16-bit mono WAV. A few harmonics make each
 * note closer to a plucked string than a pure sine, which is what the pitch detector is tuned for.
 */
export function writeToneWav(
  path: string,
  frequencies: number | readonly number[],
  seconds = 2,
): void {
  const notes = typeof frequencies === 'number' ? [frequencies] : frequencies;
  const harmonics = [1, 0.5, 0.25, 0.12];
  const sampleCount = Math.round(SAMPLE_RATE * seconds);
  const data = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index++) {
    const time = index / SAMPLE_RATE;
    const sample = notes.reduce(
      (total, frequency) =>
        total +
        harmonics.reduce(
          (sum, level, overtone) =>
            sum + level * Math.sin(2 * Math.PI * frequency * (overtone + 1) * time),
          0,
        ),
      0,
    );
    // Each note's harmonics peak just under 2; scaled so the mix stays at half of full scale.
    data.writeInt16LE(Math.round((sample / (2 * notes.length)) * 0.5 * 32767), index * 2);
  }
  writeFileSync(path, Buffer.concat([wavHeader(data.length), data]));
}

/**
 * Plucks of one string at a steady interval, each decaying until the next restarts the string,
 * starting at the very first sample so a loop of the file keeps the beat.
 */
export function writePlucksWav(
  path: string,
  frequency: number,
  intervalMs: number,
  seconds: number,
): void {
  const sampleCount = Math.round(SAMPLE_RATE * seconds);
  const interval = Math.round((SAMPLE_RATE * intervalMs) / 1000);
  const data = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index++) {
    const time = (index % interval) / SAMPLE_RATE;
    const tone =
      Math.sin(2 * Math.PI * frequency * time) + 0.5 * Math.sin(4 * Math.PI * frequency * time);
    const sample = 0.6 * Math.exp(-time / 0.25) * tone;
    data.writeInt16LE(Math.round(sample * 0.5 * 32767), index * 2);
  }
  writeFileSync(path, Buffer.concat([wavHeader(data.length), data]));
}

function wavHeader(dataBytes: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per frame
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return header;
}
