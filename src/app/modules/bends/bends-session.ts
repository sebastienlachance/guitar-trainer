import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { PhrasePlayer } from '../../core/audio/phrase-player';
import { TunerPitch } from '../../core/audio/tuner';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import { Bend, BendCard, MIN_START_FRET, bendFor, buildDeck, settingsProblems } from './deck';
import { BendJudge, BendPoint, BendResult } from './judge';
import { BendsSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const BENDS_MODULE = 'bends';

const SETTINGS_KEY = 'bends:settings';
const STATS_KEY = 'bends:stats';

/** The verdict on a bend: held in tune, or missed, and by how many cents. */
export type BendVerdict = Extract<BendResult, { centsOff: number }>;

/**
 * Bend trainer: bend a note up to a target pitch and hold it there. The pitch is read as the
 * tuner reads it; a verdict comes once the bend holds in tune, or ends without doing so.
 */
@Service({ autoProvided: false })
export class BendsSession implements Drill {
  private readonly mic = inject(MicListener);
  private readonly player = inject(PhrasePlayer);

  readonly title = 'Bends';
  readonly unit = 'bend';
  readonly selfCheck = false;
  readonly ownResult = true;

  readonly settings = signal<BendsSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));

  readonly run = new PracticeRun<BendCard>({
    module: BENDS_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    // The bend's verdict and its curve are worth a look: wait for Next even when in tune.
    advanceAfterCorrect: false,
    onStart: () => void this.mic.start('pitch'),
    onEnd: () => {
      this.player.stop();
      this.mic.stop();
    },
    onNext: () => {
      const card = this.run.current();
      const bend = card ? bendFor(card, this.settings().maxFret, Math.random) : null;
      this.bend.set(bend);
      this.verdict.set(null);
      this.fretted.set(false);
      this.trace.set([]);
      this.judge = bend ? new BendJudge(bend.start, bend.target, this.mic.strums()) : null;
      if (bend && this.settings().target === 'first') {
        this.hearTarget();
      }
    },
  });

  /** The bend asked for this time. */
  readonly bend = signal<Bend | null>(null);
  readonly verdict = signal<BendVerdict | null>(null);
  /** The target was played fretted, not bent up to. */
  readonly fretted = signal(false);
  /** The readings of the bend in progress, or of the last one. */
  readonly trace = signal<readonly BendPoint[]>([]);
  readonly playing = this.player.playing;

  readonly tags = computed(() => {
    const { strings, sizes, maxFret } = this.settings();
    return [
      plural(strings.length, 'string'),
      plural(sizes.length, 'size'),
      `Frets ${MIN_START_FRET}–${maxFret}`,
    ];
  });

  private judge: BendJudge | null = null;
  private attacksTouched = 0;

  constructor() {
    effect(() => {
      const pitch = this.mic.pitch();
      const attacks = this.mic.strums();
      untracked(() => this.listen(pitch, attacks));
    });
    effect(() => {
      if (this.run.paused()) {
        untracked(() => this.player.stop());
      }
    });
  }

  updateSettings(changes: Partial<BendsSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Plays the pitch to bend up to. */
  hearTarget(): void {
    const bend = this.bend();
    if (bend) {
      void this.player.play([bend.target]);
    }
  }

  private listen(pitch: TunerPitch | null, attacks: number): void {
    const judge = this.judge;
    if (!judge || this.run.phase() !== 'prompt') {
      return;
    }
    if (this.run.paused() || this.player.playing()) {
      // The target's own pluck, or anything heard while paused, isn't a bend.
      judge.skip(attacks);
      return;
    }
    if (attacks > this.attacksTouched) {
      this.attacksTouched = attacks;
      this.run.touch();
    }
    const result = judge.push({ pitch, attacks, time: pitch?.time ?? performance.now() });
    this.trace.set(judge.trace);
    if (result?.kind === 'fretted') {
      this.fretted.set(true);
    } else if (result) {
      this.verdict.set(result);
      this.run.resolve(result.kind === 'held');
    }
  }
}

/** Providers for the pages: the session, also offered as the `Drill` the shared screens use. */
export function provideBends(): Provider[] {
  return [BendsSession, { provide: Drill, useExisting: BendsSession }];
}
