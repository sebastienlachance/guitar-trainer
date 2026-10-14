import { mkdirSync } from 'node:fs';
import {
  AUDIO_DIR,
  PLUCK_TRAINS,
  TONES,
  recordingPath,
  writePlucksWav,
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
}
