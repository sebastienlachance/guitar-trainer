import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { PhrasePlayer } from '../../core/audio/phrase-player';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { PlaybackCard, Phrase, buildDeck, heardPhrase, phraseFor, settingsProblems } from './deck';
import { PlaybackSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const PLAYBACK_MODULE = 'playback';

const SETTINGS_KEY = 'playback:settings';
const STATS_KEY = 'playback:stats';

/**
 * Ear training on the guitar: the app plays a short phrase, giving its first note, and you play
 * it back. The microphone checks it, or you reveal it and judge yourself.
 */
@Service({ autoProvided: false })
export class PlaybackSession implements Drill {
  private readonly mic = inject(MicListener);
  private readonly player = inject(PhrasePlayer);

  readonly title = 'Play it back';
  readonly unit = 'phrase';
  readonly selfCheck = true;

  readonly settings = signal<PlaybackSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));

  readonly run = new PracticeRun<PlaybackCard>({
    module: PLAYBACK_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onStart: () => {
      if (this.settings().answer === 'mic') {
        void this.mic.start('notes');
      }
    },
    onEnd: () => {
      this.player.stop();
      this.mic.stop();
    },
    onNext: () => {
      const card = this.run.current();
      this.phrase.set(card ? phraseFor(card, Math.random) : null);
      this.hear();
    },
  });

  /** The notes of the current card, this time round. */
  readonly phrase = signal<Phrase | null>(null);
  /** The phrase is sounding: the microphone hears the speakers, so it isn't checked. */
  readonly playing = this.player.playing;
  /** The phrase has been heard to the end: what you play from now on is your answer. */
  private readonly answering = signal(false);
  private wasPaused = false;

  readonly tags = computed(() => {
    const { kinds, direction, melodyLength, answer } = this.settings();
    return [
      ...(kinds.includes('interval')
        ? [`Intervals ${direction === 'both' ? 'up and down' : direction}`]
        : []),
      ...(kinds.includes('melody') ? [`Melodies of ${melodyLength} notes`] : []),
      answer === 'mic' ? 'Checked by the mic' : 'Check yourself',
    ];
  });

  private readonly micMatched = computed(() => {
    const phrase = this.phrase();
    return (
      this.settings().answer === 'mic' &&
      this.answering() &&
      this.run.phase() === 'prompt' &&
      !this.run.paused() &&
      phrase !== null &&
      heardPhrase(this.mic.heard(), phrase.notes)
    );
  });

  constructor() {
    effect(() => {
      if (this.micMatched()) {
        untracked(() => this.run.resolve(true));
      }
    });
    // Playing counts as practice even before you answer.
    effect(() => {
      if (this.mic.heard().length > 0) {
        untracked(() => this.run.touch());
      }
    });
    // Pausing stops the phrase and the answer; resuming plays the phrase again, so noodling during
    // the break can't answer it, and the answer starts from a clean slate.
    effect(() => {
      const paused = this.run.paused();
      untracked(() => {
        if (paused) {
          this.player.stop();
          this.answering.set(false);
        } else if (
          this.wasPaused &&
          this.run.view() === 'running' &&
          this.run.phase() === 'prompt'
        ) {
          this.hear();
        }
        this.wasPaused = paused;
      });
    });
  }

  updateSettings(changes: Partial<PlaybackSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Plays the phrase, again if asked; your answer starts once it has finished. */
  hear(): void {
    const phrase = this.phrase();
    if (!phrase) {
      return;
    }
    this.answering.set(false);
    void this.player.play(phrase.notes).then((completed) => {
      if (completed && this.phrase() === phrase) {
        // What the microphone heard so far was the speakers.
        this.mic.clearHeard();
        this.answering.set(true);
      }
    });
  }
}

/** Providers for the pages: the session, also offered as the `Drill` the shared screens use. */
export function providePlayback(): Provider[] {
  return [PlaybackSession, { provide: Drill, useExisting: PlaybackSession }];
}
