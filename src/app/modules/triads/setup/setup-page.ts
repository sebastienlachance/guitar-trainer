import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FOUR_STRING_SETS, THREE_STRING_SETS } from '../../../core/fretboard/tuning';
import { ChordQuality, chordSymbol } from '../../../core/music/chords';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { inversionName } from '../../../core/music/voicings';
import { CHORD_QUALITIES, NATURAL_ROOTS, ROOTS, isFourNote } from '../catalog';
import {
  FourNoteVoicing,
  INVERSIONS,
  MicMode,
  PromptDetail,
  STRUM_THRESHOLD_RANGE,
  TriadSettings,
  toggleIn,
} from '../settings';
import { TriadsSession } from '../triads-session';

interface Choice<T> {
  readonly value: T;
  readonly label: string;
  readonly hint: string;
}

const C = parseNote('C');

@Component({
  selector: 'app-setup-page',
  templateUrl: './setup-page.html',
  styleUrl: './setup-page.css',
})
export class SetupPage {
  private readonly session = inject(TriadsSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly settings = this.session.settings;
  protected readonly problems = this.session.problems;
  protected readonly deckSize = computed(() => this.session.deck().length);

  protected readonly threeNoteQualities = CHORD_QUALITIES.filter((quality) => !isFourNote(quality));
  protected readonly fourNoteQualities = CHORD_QUALITIES.filter(isFourNote);
  protected readonly roots = ROOTS.map((name) => ({
    name,
    label: displayNoteName(parseNote(name)),
  }));
  protected readonly threeStringSets = THREE_STRING_SETS;
  protected readonly fourStringSets = FOUR_STRING_SETS;
  protected readonly inversions = INVERSIONS.map((value) => ({
    value,
    label: inversionName(value),
  }));
  protected readonly strumRange = STRUM_THRESHOLD_RANGE;

  protected readonly hasFourNoteChords = computed(() =>
    this.fourNoteQualities.some((quality) => this.settings().qualities.includes(quality.id)),
  );

  protected readonly promptChoices: Choice<PromptDetail>[] = [
    { value: 'chord', label: 'Chord only', hint: 'Play it any way you like.' },
    { value: 'shape', label: 'Chord and shape', hint: 'A given inversion on a given string set.' },
  ];

  protected readonly voicingChoices: Choice<FourNoteVoicing>[] = [
    { value: 'drop2', label: 'Drop 2', hint: 'All four notes on four strings.' },
    { value: 'shell', label: 'Shells', hint: 'Three notes, leaving out the 5th.' },
    { value: 'both', label: 'Both', hint: 'A mix of the two.' },
  ];

  protected readonly micChoices: Choice<MicMode>[] = [
    { value: 'off', label: 'Off', hint: 'Reveal the answer and check yourself.' },
    {
      value: 'arpeggio',
      label: 'Arpeggio',
      hint: 'Play the notes one at a time, up or down. The app checks the exact shape.',
    },
    {
      value: 'strum',
      label: 'Strum',
      hint: 'Experimental. Checks the notes but not the shape; works best with a clean tone.',
    },
  ];

  protected chordExample(quality: ChordQuality): string {
    return chordSymbol(C, quality);
  }

  protected hintFor<T>(choices: readonly Choice<T>[], value: T): string {
    return choices.find((choice) => choice.value === value)?.hint ?? '';
  }

  protected toggleQuality(id: string): void {
    const all = CHORD_QUALITIES.map((quality) => quality.id);
    this.update({ qualities: toggleIn(this.settings().qualities, id, all) });
  }

  protected toggleRoot(name: string): void {
    this.update({ roots: toggleIn(this.settings().roots, name, ROOTS) });
  }

  protected selectRoots(which: 'all' | 'naturals'): void {
    this.update({ roots: which === 'all' ? ROOTS : NATURAL_ROOTS });
  }

  protected toggleStringSet(id: string): void {
    const all = [...THREE_STRING_SETS, ...FOUR_STRING_SETS].map((set) => set.id);
    this.update({ stringSets: toggleIn(this.settings().stringSets, id, all) });
  }

  protected toggleInversion(inversion: number): void {
    this.update({ inversions: toggleIn(this.settings().inversions, inversion, INVERSIONS) });
  }

  protected setStrumThreshold(event: Event): void {
    this.update({ strumThreshold: (event.target as HTMLInputElement).valueAsNumber });
  }

  protected update(changes: Partial<TriadSettings>): void {
    this.session.updateSettings(changes);
  }

  protected start(): void {
    if (this.problems().length === 0) {
      void this.router.navigate(['practice'], { relativeTo: this.route });
    }
  }
}
