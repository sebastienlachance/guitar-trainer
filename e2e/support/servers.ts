/** `ng serve` of the production configuration, for most tests. */
export const APP_PORT = 4300;

/**
 * The real build, served under the same path as on GitHub Pages. The service worker needs it:
 * `ng serve` produces files whose hashes don't match the worker's manifest.
 */
export const PAGES_PORT = 4310;
export const PAGES_BASE = '/guitar-trainer/';
export const PAGES_URL = `http://localhost:${PAGES_PORT}${PAGES_BASE}`;
