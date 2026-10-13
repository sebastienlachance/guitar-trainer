/** Open-string MIDI notes indexed by string number − 1; string 1 is the high E. */
export const STANDARD_TUNING: readonly number[] = [64, 59, 55, 50, 45, 40];

export const STRING_NAMES: readonly string[] = ['e', 'B', 'G', 'D', 'A', 'E'];

export const STRING_COUNT = STANDARD_TUNING.length;

export interface StringSet {
  /** Label as guitarists write it, e.g. "2-3-4". */
  readonly id: string;
  /** String numbers from the lowest-pitched to the highest, e.g. [4, 3, 2]. */
  readonly strings: readonly number[];
}

function stringSet(id: string): StringSet {
  return { id, strings: id.split('-').map(Number).reverse() };
}

/** Adjacent three-string sets, for triads and shell voicings. */
export const THREE_STRING_SETS: readonly StringSet[] = ['1-2-3', '2-3-4', '3-4-5', '4-5-6'].map(
  stringSet,
);

/** Adjacent four-string sets, for drop 2 voicings. */
export const FOUR_STRING_SETS: readonly StringSet[] = ['1-2-3-4', '2-3-4-5', '3-4-5-6'].map(
  stringSet,
);

export const STRING_SETS: readonly StringSet[] = [...THREE_STRING_SETS, ...FOUR_STRING_SETS];

export function stringSetById(id: string): StringSet | undefined {
  return STRING_SETS.find((set) => set.id === id);
}
