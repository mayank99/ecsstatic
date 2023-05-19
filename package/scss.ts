/**
 * Returns a scoped class name for the Sass code provided in the template string.
 *
 * @example
 * ```
 * import { css } from '@acab/ecsstatic/scss';
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
export function css(templates: TemplateStringsArray, ...args: Array<string | number>): string {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}

/**
 * Sass version of void function that applies unscoped, global styles.
 *
 * This should only be used when it's not possible to use a .scss file,
 * such as for interpolating javascript expressions.
 *
 * @example
 * import { createGlobalStyle } from '@acab/ecsstatic/scss';
 *
 * createGlobalStyle`
 *   :root {
 *     --foo: ${1 + 1};
 *   }
 * `;
 */
export function createGlobalStyle(
	templates: TemplateStringsArray,
	...args: Array<string | number>
): void {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}
