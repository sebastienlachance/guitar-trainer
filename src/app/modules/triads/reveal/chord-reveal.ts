import { Component, computed, input, model } from '@angular/core';
import { Fretboard, FretboardDot } from '../../../core/fretboard/fretboard';
import { FrettedNote, MAX_FRET, findChordTones } from '../../../core/fretboard/placement';
import { spellChord } from '../../../core/music/chords';
import { IntervalName, displayInterval, spellInterval } from '../../../core/music/intervals';
import { displayNoteName, pitchClassOf } from '../../../core/music/notes';
import { Shape, TriadCard, cardTitle, positionsOf, shapeLabel } from '../deck';
import { LabelMode } from '../settings';

interface Diagram {
  readonly id: string;
  readonly caption: string;
  readonly dots: FretboardDot[];
  readonly description: string;
}

/** The answer to a prompt: chord tones, then where to play them. */
@Component({
  selector: 'app-chord-reveal',
  imports: [Fretboard],
  templateUrl: './chord-reveal.html',
  styleUrl: './chord-reveal.css',
})
export class ChordReveal {
  readonly card = input.required<TriadCard>();
  /** Shapes to show when the card asks for the chord only. */
  readonly shapes = input<readonly Shape[]>([]);
  readonly labelMode = model<LabelMode>('interval');

  protected readonly neckWindow = { first: 1, last: MAX_FRET };

  protected readonly title = computed(() => cardTitle(this.card()));

  protected readonly tones = computed(() =>
    spellChord(this.card().root, this.card().quality).map((tone) => ({
      note: displayNoteName(tone.note),
      interval: displayInterval(tone.interval),
      isRoot: tone.interval === '1',
    })),
  );

  /** One diagram per position of the asked shape. */
  protected readonly positions = computed((): Diagram[] => {
    const { root, quality, shape } = this.card();
    if (!shape) {
      return [];
    }
    return positionsOf(root, quality, shape).map((notes) => {
      const lowestFret = Math.min(...notes.map((note) => note.fret));
      return this.diagram(notes, `From fret ${lowestFret}`, shapeLabel(shape));
    });
  });

  protected readonly neck = computed((): Diagram | null => {
    const { root, quality, shape } = this.card();
    if (shape) {
      return null;
    }
    const notes = findChordTones(pitchClassOf(root), quality.intervals);
    return this.diagram(notes, 'Every chord tone up to the 15th fret', 'on the whole neck');
  });

  /** The lowest position of each shape, for chord-only prompts. */
  protected readonly gallery = computed((): Diagram[] => {
    const { root, quality, shape } = this.card();
    if (shape) {
      return [];
    }
    return this.shapes().flatMap((candidate) => {
      const [lowest] = positionsOf(root, quality, candidate);
      return lowest ? [this.diagram(lowest, shapeLabel(candidate), shapeLabel(candidate))] : [];
    });
  });

  private diagram(notes: readonly FrettedNote[], caption: string, context: string): Diagram {
    const dots = notes.map((note) => ({
      string: note.string,
      fret: note.fret,
      label: this.label(note.tone),
      isRoot: note.tone === '1',
    }));
    const where = notes
      .map((note) => `string ${note.string} fret ${note.fret} (${displayInterval(note.tone)})`)
      .join(', ');
    return {
      id: caption + notes.map((note) => `${note.string}:${note.fret}`).join(),
      caption,
      dots,
      description: `${this.title()} ${context}: ${where}`,
    };
  }

  private label(tone: IntervalName): string {
    return this.labelMode() === 'interval'
      ? displayInterval(tone)
      : displayNoteName(spellInterval(this.card().root, tone));
  }
}
