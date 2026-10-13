import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SAMPLE_RATE = 48_000;

/** Where the generated microphone recordings go; recreated before every run. */
export const AUDIO_DIR = 'e2e/.generated';

/** Recordings the fake microphone can play, by name. */
export const TONES = {
  /** F♯3, fret 9 on the A string. */
  fSharp3: 185.0,
  /** E3, fret 7 on the A string. */
  e3: 164.81,
  /** A3, fret 2 on the G string. */
  a3: 220.0,
} as const;

/** Absolute path of a recording, as Chromium's fake-microphone flag needs. */
export function tonePath(tone: keyof typeof TONES): string {
  return resolve(AUDIO_DIR, `${tone}.wav`);
}

/**
 * A steady note as a 16-bit mono WAV. A few harmonics make it closer to a plucked string than a
 * pure sine, which is what the pitch detector is tuned for.
 */
export function writeToneWav(path: string, frequency: number, seconds = 2): void {
  const harmonics = [1, 0.5, 0.25, 0.12];
  const sampleCount = Math.round(SAMPLE_RATE * seconds);
  const data = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index++) {
    const time = index / SAMPLE_RATE;
    const sample = harmonics.reduce(
      (sum, level, overtone) =>
        sum + level * Math.sin(2 * Math.PI * frequency * (overtone + 1) * time),
      0,
    );
    data.writeInt16LE(Math.round((sample / 2) * 0.5 * 32767), index * 2);
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
