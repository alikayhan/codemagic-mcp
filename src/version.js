import pkg from '../package.json' with { type: 'json' };
/** Single source of truth is package.json. plugin.json is kept in sync by scripts/sync-version.js (run automatically by `npm version`). */
export const VERSION = pkg.version;
