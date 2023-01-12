# ecsstatic

a modern css-in-js library made specifically for vite.

- fully static. compiles away like it never existed.
- uses regular css syntax, not javascript objects.
- minimal api surface. does one job well: generating scoped classes using colocated styles.
- suppports sass-like nesting, including `@media`, `@container`, and `@layer`.
- supports sass itself!

try it on [stackblitz](https://stackblitz.com/edit/vitejs-vite-jesvnk?file=src%2FApp.tsx,src%2FLogo.tsx,src%2FButton.tsx&terminal=dev).

## Usage

Install:

```
npm install --save-dev @acab/ecsstatic
```

Add the vite plugin to your config:

```js
import { ecsstatic } from '@acab/ecsstatic/vite';

export default defineConfig({
	plugins: [ecsstatic()],
});
```

Start using it:

```tsx
import { css } from '@acab/ecsstatic';

export const Button = (props) => {
	return <button className={button} {...props} />;
};

const button = css`
	all: unset;
	font: inherit;
	color: #862e9c;
	border: 1px solid;
	border-radius: 4px;
	padding: 0.5rem 1rem;

	&:hover,
	&:focus {
		color: #be4bdb;
	}
`;
```

Or with Sass:

```tsx
import { scss } from '@acab/ecsstatic';

export const Button = (props) => {
	return <button className={button} {...props} />;
};

const button = scss`
  @use 'open-props-scss' as op;

  // ...
  color: op.$purple-9;

  &:hover,
  &:focus {
    color: op.$purple-6;
  }
`;
```

## Current limitations

- Must be used at the top level scope, not inside components or objects.
- Resolving variables interpolated in the template strings does not work for all cases.
- `css` and `scss` imports cannot be used together.
