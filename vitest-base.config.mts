import { defineConfig } from 'vitest/config';

// Extra Vitest settings for `ng test`, loaded through `runnerConfig` in angular.json.
export default defineConfig({
  test: {
    // Vitest 5 caches transformed modules on disk by default (node_modules/.vitest-cache). Angular
    // builds each spec in memory, bundled with the code it imports, and the cache only notices
    // changes to the spec file itself: a test could pass against an old copy of the code it tests.
    fsModuleCache: false,
  },
});
