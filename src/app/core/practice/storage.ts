/** Prefix for every key the app writes, versioned so a future format change can start clean. */
export const STORAGE_PREFIX = 'guitar-trainer:v1:';

/**
 * Reads a JSON value from localStorage, or undefined when there is none or it can't be read
 * (private browsing, blocked site data). The value may come from an older build: validate it.
 */
export function loadJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read saved "${key}"; using defaults.`, error);
    return undefined;
  }
}

/** Writes a JSON value; the app keeps working for this session if storage is unavailable. */
export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn(
      `Could not save "${key}"; progress will not be kept after closing the app.`,
      error,
    );
  }
}
