/**
 * Returns an object containing CSS-modules-like scoped class names for the
 * CSS inside the template string.
 *
 * @example
 * import { css } from '@acab/ecsstatic/modules';
 *
 * const styles = css`
 *   .wrapper {
 *     display: grid;
 *     place-items: center;
 *   }
 *   .button {
 *     font: inherit;
 *     color: hotpink;
 *   }
 * `;
 *
 * export () => (
 *   <div class={styles.wrapper}>
 *    <button class={styles.button}>hi</button>
 *   </div>
 * );
 */
export function css(
	templates: TemplateStringsArray,
	...args: Array<string | number>
): Record<string, string> {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}

/**
 * Returns an object containing CSS-modules-like scoped class names for the
 * SCSS inside the template string.
 *
 * @example
 * import { scss } from '@acab/ecsstatic/modules';
 *
 * const styles = scss`
 *   $accent: hotpink;
 *
 *   .wrapper {
 *     display: grid;
 *     place-items: center;
 *   }
 *   .button {
 *     font: inherit;
 *     color: $accent;
 *   }
 * `;
 *
 * export () => (
 *   <div class={styles.wrapper}>
 *    <button class={styles.button}>hi</button>
 *   </div>
 * );
 */
export function scss(
	templates: TemplateStringsArray,
	...args: Array<string | number>
): Record<string, string> {
	throw new Error(
		`If you're seeing this error, it is likely your bundler isn't configured correctly.`
	);
}
