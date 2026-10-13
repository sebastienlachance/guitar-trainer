/*
 * One-card decks, saved as module settings before a test so the prompt is always known.
 */

/** Triads: the prompt is always Csus4. */
export const CSUS4_ONLY = {
  qualities: ['sus4'],
  roots: ['C'],
  promptDetail: 'chord',
  micMode: 'off',
};

/** Fretboard notes: the prompt is always F♯ on string 5, which is at fret 9. */
export const F_SHARP_ON_A = {
  notes: ['F#'],
  strings: [5],
  maxFret: 12,
  promptKind: 'string',
  micMode: 'off',
};
