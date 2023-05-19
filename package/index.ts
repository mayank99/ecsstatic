/**
 * Returns a scoped class name for the CSS provided in the template string.
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
export function css(templates: TemplateStringsArray, ...args: Array<string | number>): string {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}

/**
 * Void function that applies unscoped, global styles.
 *
 * This should only be used when it's not possible to use a .css file,
 * such as for interpolating javascript expressions.
 *
 * @example
 * import { createGlobalStyle } from '@acab/ecsstatic';
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
