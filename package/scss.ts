/**
 * Returns a scoped class name for the Sass code provided in the template string.
 *
 * @example
 * ```
 * import { scss } from '@acab/ecsstatic';
 *
 * const buttonClass = scss`
 * 	 \@use './colors';
 *
 *   font: inherit;
 *   color: colors.$text-color;
 *
 *   &:hover {
 *     color: colors.$text-color-hover;
 *   }
 * `;
 *
 * export () => (
 *   <button className={buttonClass}>hi</button>
 * );
 * ```
 */
export function scss(templates: TemplateStringsArray, ...args: Array<string | number>): string {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}
