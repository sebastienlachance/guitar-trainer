/** "1 chord", "3 chords". */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "83%", or a dash when there is nothing to measure yet. */
export function percentCorrect(correct: number, answered: number): string {
  return answered > 0 ? `${Math.round((correct / answered) * 100)}%` : '–';
}
