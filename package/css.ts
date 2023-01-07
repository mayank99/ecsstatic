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
export function css() {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}
