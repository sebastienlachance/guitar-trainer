import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { matchesArpeggio, matchesStrum, targetPitchClasses } from '../../core/audio/matchers';
import { STRING_SETS } from '../../core/fretboard/tuning';
import { ChordQuality } from '../../core/music/chords';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { CHORD_QUALITIES } from './catalog';
import { TriadCard, buildDeck, chordTarget, settingsProblems, shapesFor } from './deck';
import { INVERSIONS, TriadSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const TRIADS_MODULE = 'triads';

const SETTINGS_KEY = 'triads:settings';
const STATS_KEY = 'triads:stats';

const INVERSION_SHORT_NAMES = ['Root', '1st', '2nd', '3rd'];

function qualityTag(quality: ChordQuality): string {
  return { '': 'major', m: 'minor' }[quality.symbol] ?? quality.symbol;
}

/** The triads module: settings, the deck, the card flow and the microphone check. */
@Service({ autoProvided: false })
export class TriadsSession implements Drill {
  private readonly mic = inject(MicListener);

  readonly title = 'Triads';
  readonly unit = 'chord';
  readonly selfCheck = true;

  readonly settings = signal<TriadSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings(), this.deck()));

  /** Strums heard before the current chord appeared: only a later one can answer it. */
  private readonly strumsBefore = signal(0);

  readonly run = new PracticeRun<TriadCard>({
    module: TRIADS_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onStart: () => {
      const { micMode } = this.settings();
      if (micMode !== 'off') {
        void this.mic.start(micMode === 'strum' ? 'spectrum' : 'notes');
      }
    },
    onEnd: () => this.mic.stop(),
    onNext: () => {
      this.mic.clearHeard();
      this.strumsBefore.set(this.mic.strums());
    },
  });

  readonly tags = computed(() => {
    const settings = this.settings();
    const tags = CHORD_QUALITIES.filter((quality) => settings.qualities.includes(quality.id)).map(
      qualityTag,
    );
    if (settings.promptDetail === 'chord') {
      return [...tags, 'Any shape'];
    }
    const sets = settings.stringSets;
    tags.push(
      sets.length === STRING_SETS.length ? 'All string sets' : `Strings ${sets.join(', ')}`,
    );
    tags.push(
      settings.inversions.length === INVERSIONS.length
        ? 'All inversions'
        : settings.inversions.map((inversion) => INVERSION_SHORT_NAMES[inversion]).join(', '),
    );
    return tags;
  });

  /** Shapes to show for a chord-only prompt, filtered by the chosen string sets and inversions. */
  readonly revealShapes = computed(() => {
    const card = this.run.current();
    return card && !card.shape ? shapesFor(card.quality, this.settings()) : [];
  });

  private readonly micMatched = computed(() => {
    const card = this.run.current();
    const { micMode, strumThreshold } = this.settings();
    if (!card || micMode === 'off' || this.run.phase() !== 'prompt' || this.run.paused()) {
      return false;
    }
    const target = chordTarget(card);
    if (micMode === 'arpeggio') {
      return matchesArpeggio(this.mic.heard(), target);
    }
    // The last chord may still be ringing, and it can share every note with this one (Csus4 and
    // Fsus2): only a strum made since this chord appeared counts.
    const strummedSince = this.mic.strums() > this.strumsBefore();
    const chroma = this.mic.chroma();
    return (
      strummedSince &&
      chroma !== null &&
      matchesStrum(chroma, targetPitchClasses(target), strumThreshold)
    );
  });

  constructor() {
    // A heard chord needs no look at the answer: straight on to the next one.
    effect(() => {
      if (this.micMatched()) {
        untracked(() => this.run.resolveAndMoveOn());
      }
    });
    // Playing counts as practice even before you answer.
    effect(() => {
      if (this.mic.heard().length > 0) {
        untracked(() => this.run.touch());
      }
    });
  }

  updateSettings(changes: Partial<TriadSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }
}

/** Providers for the triads pages: the session, also offered as the `Drill` the shared screens use. */
export function provideTriads(): Provider[] {
  return [TriadsSession, { provide: Drill, useExisting: TriadsSession }];
}
