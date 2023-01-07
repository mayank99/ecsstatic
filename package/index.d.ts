import type { Plugin } from 'vite';

/**
 * Returns a scoped className for the CSS provided in the template string.
 *
 * Must be used outside the component at the top level of a file.
 *
 * @example
 * import { css } from '@acab/ecsstatic';
 *
 * const buttonClass = css`
 *   font: inherit;
 *   color: hotpink;
 *
 *   &:hover {
 *     color: pink;
 *   }
 * `;
 *
 * export () => (
 *   <button className={buttonClass}>hi</button>
 * );
 */
export function css(template: TemplateStringsArray, ...args: Array<unknown>): string;

/**
 * Returns the vite plugin for ecsstatic.
 *
 * @example
 * import { ecsstatic } from '@acab/ecsstatic';
 *
 * export default defineConfig({
 * 	plugins: [ecsstaticVite()],
 * });
 */
export function ecsstaticVite(): Plugin;
