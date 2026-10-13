/*
 * Helpers for rebuilding a module's settings from saved data. Saved data can come from an older
 * build or be edited by hand, so each field is checked against what this version knows and falls
 * back to its default otherwise.
 */

/** The saved object, or an empty one when there is none. */
export function savedFields(saved: unknown): Record<string, unknown> {
  return typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : {};
}

/** The known values from a saved list, in the order of `allowed`. */
export function pickList<T>(
  value: unknown,
  allowed: readonly T[],
  fallback: readonly T[],
): readonly T[] {
  return Array.isArray(value) ? allowed.filter((item) => value.includes(item)) : fallback;
}

/** A saved value if it's one of `allowed`. */
export function pickOne<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** A saved number if it's within the range. */
export function pickNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && value >= min && value <= max ? value : fallback;
}
