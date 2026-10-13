import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MicListener } from '../../../core/audio/mic-listener';
import { targetPitchClasses } from '../../../core/audio/matchers';
import { STRING_SETS } from '../../../core/fretboard/tuning';
import { ChordQuality } from '../../../core/music/chords';
import { midiToName } from '../../../core/music/notes';
import { Icon } from '../../../core/ui/icon';
import { cardTitle, chordTarget, shapeLabel } from '../deck';
import { ChordReveal } from '../reveal/chord-reveal';
import { INVERSIONS, LabelMode } from '../settings';
import { TriadsSession } from '../triads-session';

const PITCH_CLASS_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const INVERSION_SHORT_NAMES = ['Root', '1st', '2nd', '3rd'];
const HEARD_SHOWN = 4;

function qualityTag(quality: ChordQuality): string {
  return { '': 'major', m: 'minor' }[quality.symbol] ?? quality.symbol;
}

@Component({
  selector: 'app-practice-page',
  imports: [RouterLink, Icon, ChordReveal],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class PracticePage implements OnInit, OnDestroy {
  protected readonly session = inject(TriadsSession);
  protected readonly mic = inject(MicListener);

  protected readonly started = signal(false);
  protected readonly card = this.session.current;
  protected readonly phase = this.session.phase;
  protected readonly settings = this.session.settings;

  protected readonly title = computed(() => {
    const card = this.card();
    return card ? cardTitle(card) : '';
  });
  protected readonly subtitle = computed(() => {
    const shape = this.card()?.shape;
    return shape ? shapeLabel(shape) : '';
  });
  protected readonly responseSeconds = computed(() => {
    const ms = this.session.responseMs();
    return ms === null ? '' : `${(ms / 1000).toFixed(1)} s`;
  });

  /** Short reminders of what is being practised, shown above the prompt. */
  protected readonly practiceTags = computed(() => {
    const settings = this.settings();
    const tags = this.session.selectedQualities().map(qualityTag);
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

  protected readonly heardNotes = computed(() =>
    this.mic.heard().slice(-HEARD_SHOWN).map(midiToName).join(' '),
  );

  /** Live pitch-class levels for strum mode, with the chord's own tones marked. */
  protected readonly chromaBars = computed(() => {
    const card = this.card();
    const chroma = this.mic.chroma();
    const wanted = card ? targetPitchClasses(chordTarget(card)) : [];
    return PITCH_CLASS_NAMES.map((name, pitchClass) => ({
      name,
      level: chroma?.[pitchClass] ?? 0,
      inChord: wanted.includes(pitchClass),
    }));
  });

  private readonly primaryAction = viewChild<ElementRef<HTMLButtonElement>>('primaryAction');

  constructor() {
    // The button you clicked disappears when the phase changes; keep keyboard focus on the next step.
    afterRenderEffect(() => {
      this.phase();
      this.primaryAction()?.nativeElement.focus();
    });
  }

  ngOnInit(): void {
    this.started.set(this.session.start());
  }

  ngOnDestroy(): void {
    this.session.stop();
  }

  protected setLabelMode(labelMode: LabelMode): void {
    this.session.updateSettings({ labelMode });
  }

  protected retryMic(): void {
    const { micMode } = this.settings();
    if (micMode !== 'off') {
      void this.mic.start(micMode);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Leave keys alone while a form control has focus: arrows move between radio options there.
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      !this.card() ||
      inControl ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const phase = this.phase();
    let handled = true;
    if (event.key === ' ' && phase === 'prompt') {
      this.session.reveal();
    } else if ((event.key === ' ' || event.key === 'ArrowRight') && phase === 'heard') {
      this.session.showNext();
    } else if (event.key === 'ArrowRight' && phase === 'revealed') {
      this.session.answer(true);
    } else if (event.key === 'ArrowLeft' && phase === 'revealed') {
      this.session.answer(false);
    } else {
      handled = false;
    }
    if (handled) {
      // Stops Space from also clicking the focused button or scrolling the page.
      event.preventDefault();
    }
  }
}
