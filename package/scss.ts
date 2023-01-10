/**
 * Returns a scoped className for the Sass code provided in the template string.
 *
 * Must be used outside the component at the top level of a file.
 *
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
export function scss(templates: TemplateStringsArray, ...args: any[]): string {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}
