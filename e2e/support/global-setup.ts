import { mkdirSync } from 'node:fs';
import { AUDIO_DIR, TONES, tonePath, writeToneWav } from './audio';

/** Generates the recordings the fake microphone plays, so no audio files live in git. */
export default function globalSetup(): void {
  mkdirSync(AUDIO_DIR, { recursive: true });
  for (const [name, frequency] of Object.entries(TONES)) {
    writeToneWav(tonePath(name as keyof typeof TONES), frequency);
  }
}
