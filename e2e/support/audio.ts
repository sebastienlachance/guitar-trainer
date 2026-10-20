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

/**
 * Chords, or single notes, struck in turn: each rings until the next. For chord changes, and for
 * a phrase to play back.
 */
export const SEQUENCES = {
  /** An open C (C3 E3 G3 C4 E4), then an open G (G2 B2 D3 G3 B3 G4), a second apart. */
  changesCG: {
    chords: [
      [130.81, 164.81, 196.0, 261.63, 329.63],
      [98.0, 123.47, 146.83, 196.0, 246.94, 392.0],
    ],
    intervalMs: 1000,
    seconds: 2,
  },
  /** E2 then G♯2, the open low E and a major 3rd up, over and over. */
  eToGSharp: { chords: [[82.41], [103.83]], intervalMs: 600, seconds: 1.2 },
} as const;

/** A note picked, then bent up: it holds, glides up, and holds at the top until the next pick. */
export const BENDS = {
  /** C4 bent a whole step to D4: fret 5 of the G string. */
  bendCtoD: { from: 261.63, to: 293.66, seconds: 2 },
} as const;

export type Recording =
  keyof typeof TONES | keyof typeof PLUCK_TRAINS | keyof typeof SEQUENCES | keyof typeof BENDS;

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

/**
 * Each chord (or note) in turn, every `intervalMs`, each decaying until the next. Starts at the
 * very first sample, so a loop of the file keeps the pattern.
 */
export function writeSequenceWav(
  path: string,
  chords: readonly (readonly number[])[],
  intervalMs: number,
  seconds: number,
): void {
  const sampleCount = Math.round(SAMPLE_RATE * seconds);
  const interval = Math.round((SAMPLE_RATE * intervalMs) / 1000);
  const data = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index++) {
    const notes = chords[Math.floor(index / interval) % chords.length];
    const time = (index % interval) / SAMPLE_RATE;
    const tone = notes.reduce(
      (sum, frequency) =>
        sum +
        Math.sin(2 * Math.PI * frequency * time) +
        0.3 * Math.sin(4 * Math.PI * frequency * time),
      0,
    );
    const sample = (0.6 * Math.exp(-time / 0.35) * tone) / notes.length;
    data.writeInt16LE(Math.round(sample * 0.5 * 32767), index * 2);
  }
  writeFileSync(path, Buffer.concat([wavHeader(data.length), data]));
}

/**
 * A bend: `from` for 0.3 s, a glide to `to` over 0.3 s, then `to` until the end. Starts at the
 * very first sample with a pick, so each loop of the file is a new bend.
 */
export function writeBendWav(path: string, from: number, to: number, seconds: number): void {
  const sampleCount = Math.round(SAMPLE_RATE * seconds);
  const data = Buffer.alloc(sampleCount * 2);
  let phase = 0;
  for (let index = 0; index < sampleCount; index++) {
    const time = index / SAMPLE_RATE;
    const glide = Math.min(1, Math.max(0, (time - 0.3) / 0.3));
    const frequency = from * (to / from) ** glide;
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    const tone = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase);
    const sample = 0.35 * Math.exp(-time / 1.5) * tone;
    data.writeInt16LE(Math.round(sample * 32767), index * 2);
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
