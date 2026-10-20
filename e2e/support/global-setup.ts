import { mkdirSync } from 'node:fs';
import {
  AUDIO_DIR,
  BENDS,
  PLUCK_TRAINS,
  SEQUENCES,
  TONES,
  recordingPath,
  writeBendWav,
  writePlucksWav,
  writeSequenceWav,
  writeToneWav,
} from './audio';

/** Generates the recordings the fake microphone plays, so no audio files live in git. */
export default function globalSetup(): void {
  mkdirSync(AUDIO_DIR, { recursive: true });
  for (const [name, frequency] of Object.entries(TONES)) {
    writeToneWav(recordingPath(name as keyof typeof TONES), frequency);
  }
  for (const [name, train] of Object.entries(PLUCK_TRAINS)) {
    writePlucksWav(
      recordingPath(name as keyof typeof PLUCK_TRAINS),
      train.frequency,
      train.intervalMs,
      train.seconds,
    );
  }
  for (const [name, bend] of Object.entries(BENDS)) {
    writeBendWav(recordingPath(name as keyof typeof BENDS), bend.from, bend.to, bend.seconds);
  }
  for (const [name, sequence] of Object.entries(SEQUENCES)) {
    writeSequenceWav(
      recordingPath(name as keyof typeof SEQUENCES),
      sequence.chords,
      sequence.intervalMs,
      sequence.seconds,
    );
  }
}
