// Set at build time through Angular's `define` option: empty in angular.json, filled in by the
// deploy workflow (.github/workflows/ci.yml) with the commit being deployed.
declare const BUILD_COMMIT: string;
declare const BUILD_DATE: string;

export const REPOSITORY_URL = 'https://github.com/sebastienlachance/guitar-trainer';

export interface BuildInfo {
  /** Full commit SHA. */
  readonly commit: string;
  /** Commit date, ISO 8601. */
  readonly date: string;
}

/** The deployed commit, or null for a local build. */
export const BUILD: BuildInfo | null = BUILD_COMMIT
  ? { commit: BUILD_COMMIT, date: BUILD_DATE }
  : null;
