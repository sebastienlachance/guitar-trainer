import { ChordTarget } from '../../core/audio/matchers';
import { FrettedNote, placeVoicing } from '../../core/fretboard/placement';
import {
  FOUR_STRING_SETS,
  StringSet,
  THREE_STRING_SETS,
  stringSetById,
} from '../../core/fretboard/tuning';
import { ChordQuality, chordSymbol } from '../../core/music/chords';
import { semitonesOf } from '../../core/music/intervals';
import { SpelledNote, mod, noteName, parseNote, pitchClassOf } from '../../core/music/notes';
import { Voicing, inversionName, voicingFor } from '../../core/music/voicings';
import { CHORD_QUALITIES, isFourNote, qualityById, shellIntervals } from './catalog';
import { FourNoteVoicing, TriadSettings } from './settings';

/** triad: a three-note chord; shell: a four-note chord minus its 5th; drop2: all four notes. */
export type ShapeKind = 'triad' | 'shell' | 'drop2';

export interface Shape {
  readonly kind: ShapeKind;
  readonly stringSet: StringSet;
  readonly inversion: number;
}

export interface TriadCard {
  /** Identifies the card in stats, e.g. "C|sus4" or "Bb|7|drop2|1-2-3-4|1". */
  readonly key: string;
  readonly root: SpelledNote;
  readonly quality: ChordQuality;
  /** Null when the prompt asks for the chord in any shape. */
  readonly shape: Shape | null;
}

const KIND_LABELS: Readonly<Record<ShapeKind, string>> = {
  triad: '',
  shell: 'Shell',
  drop2: 'Drop 2',
};

export function shapeKindsFor(quality: ChordQuality, preference: FourNoteVoicing): ShapeKind[] {
  if (!isFourNote(quality)) {
    return ['triad'];
  }
  const canShell = shellIntervals(quality) !== null;
  const kinds: ShapeKind[] = [];
  if (canShell && preference !== 'drop2') {
    kinds.push('shell');
  }
  // Chords that have no shell keep their drop 2 shapes, even when shells were asked for.
  if (preference !== 'shell' || !canShell) {
    kinds.push('drop2');
  }
  return kinds;
}

/** Every shape the settings allow for a chord type, in a stable order. */
export function shapesFor(quality: ChordQuality, settings: TriadSettings): Shape[] {
  return shapeKindsFor(quality, settings.fourNoteVoicing).flatMap((kind) => {
    const sets = kind === 'drop2' ? FOUR_STRING_SETS : THREE_STRING_SETS;
    return sets
      .filter((set) => settings.stringSets.includes(set.id))
      .flatMap((stringSet) =>
        settings.inversions
          .filter((inversion) => inversion < stringSet.strings.length)
          .map((inversion) => ({ kind, stringSet, inversion })),
      );
  });
}

export function voicingOf(quality: ChordQuality, shape: Shape): Voicing {
  const intervals = shape.kind === 'shell' ? shellIntervals(quality)! : quality.intervals;
  return voicingFor(intervals, shape.kind === 'drop2' ? 'drop2' : 'close', shape.inversion);
}

/** Where on the neck a shape can be played for a given root, lowest position first. */
export function positionsOf(
  root: SpelledNote,
  quality: ChordQuality,
  shape: Shape,
): FrettedNote[][] {
  const voicing = voicingOf(quality, shape);
  const bassPitchClass = mod(pitchClassOf(root) + semitonesOf(voicing.tones[0]), 12);
  return placeVoicing(voicing, bassPitchClass, shape.stringSet.strings);
}

export function cardKey(root: SpelledNote, quality: ChordQuality, shape: Shape | null): string {
  const chord = `${noteName(root)}|${quality.id}`;
  return shape ? `${chord}|${shape.kind}|${shape.stringSet.id}|${shape.inversion}` : chord;
}

/** Rebuilds a card from its stats key; undefined for keys from chords no longer offered. */
export function cardFromKey(key: string): TriadCard | undefined {
  const [rootName, qualityId, kind, setId, inversion] = key.split('|');
  const quality = qualityById(qualityId);
  if (!quality || !/^[A-G](#|b)?$/.test(rootName)) {
    return undefined;
  }
  const root = parseNote(rootName);
  if (kind === undefined) {
    return { key, root, quality, shape: null };
  }
  const stringSet = stringSetById(setId);
  if (!stringSet || !(kind in KIND_LABELS)) {
    return undefined;
  }
  return {
    key,
    root,
    quality,
    shape: { kind: kind as ShapeKind, stringSet, inversion: Number(inversion) },
  };
}

export function buildDeck(settings: TriadSettings): TriadCard[] {
  const qualities = CHORD_QUALITIES.filter((quality) => settings.qualities.includes(quality.id));
  return settings.roots.map(parseNote).flatMap((root) =>
    qualities.flatMap((quality): TriadCard[] => {
      if (settings.promptDetail === 'chord') {
        return [{ key: cardKey(root, quality, null), root, quality, shape: null }];
      }
      return shapesFor(quality, settings)
        .filter((shape) => positionsOf(root, quality, shape).length > 0)
        .map((shape) => ({ key: cardKey(root, quality, shape), root, quality, shape }));
    }),
  );
}

export function cardTitle(card: TriadCard): string {
  return chordSymbol(card.root, card.quality);
}

/** E.g. "Drop 2 · 1st inversion · strings 1-2-3-4". */
export function shapeLabel(shape: Shape): string {
  return [KIND_LABELS[shape.kind], inversionName(shape.inversion), `strings ${shape.stringSet.id}`]
    .filter(Boolean)
    .join(' · ');
}

/** What the microphone has to hear: the exact notes of a shape, or the chord's pitch classes. */
export function chordTarget(card: TriadCard): ChordTarget {
  if (card.shape) {
    const positions = positionsOf(card.root, card.quality, card.shape);
    return { kind: 'exact', positions: positions.map((notes) => notes.map((note) => note.midi)) };
  }
  const root = pitchClassOf(card.root);
  return {
    kind: 'pitchClasses',
    pitchClasses: card.quality.intervals.map((interval) => mod(root + semitonesOf(interval), 12)),
  };
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: TriadSettings, deck: readonly TriadCard[]): string[] {
  const problems: string[] = [];
  if (settings.qualities.length === 0) {
    problems.push('Pick at least one chord type.');
  }
  if (settings.roots.length === 0) {
    problems.push('Pick at least one root.');
  }
  if (settings.promptDetail === 'shape') {
    if (settings.stringSets.length === 0) {
      problems.push('Pick at least one string set.');
    }
    if (settings.inversions.length === 0) {
      problems.push('Pick at least one inversion.');
    }
  }
  if (problems.length === 0 && deck.length === 0) {
    problems.push(
      'None of the chosen string sets fit these chords. Triads and shells use three strings; drop 2 uses four.',
    );
  }
  return problems;
}
