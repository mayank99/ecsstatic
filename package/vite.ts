import { plugin } from './main.js';

/**
 * Returns the vite plugin for ecsstatic.
 *
 * @example
 * import { ecsstaticVite } from '@acab/ecsstatic';
 *
 * export default defineConfig({
 * 	plugins: [ecsstaticVite()],
 * });
 */
export const ecsstatic = plugin;
