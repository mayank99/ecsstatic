# 🎈 ecsstatic

The predefinite CSS-in-JS library for Vite.

- fully static. compiles away like it never existed.
- uses regular css syntax, not javascript objects.
- minimal api surface: you write some styles, you get back a scoped class.
- suppports nesting selectors and at-rules, including `@container`, and `@layer`.
- supports sass itself!

Try it on [stackblitz](https://stackblitz.com/edit/vitejs-vite-jesvnk?file=src%2FApp.tsx,src%2FLogo.tsx,src%2FButton.tsx&terminal=dev).

Also check out the landing page: [ecsstatic.dev](https://ecsstatic.dev).

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

Start using `css` in any JS/TS file:

```tsx
import { css } from '@acab/ecsstatic';

export const Button = (props) => {
  return <button {...props} className={button} />;
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

Or use `scss`:

```tsx
import { scss } from '@acab/ecsstatic';

export const Button = (props) => {
  return <button {...props} className={button} />;
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

## Evaluating expressions (interpolation)

Evaluating expressions interpolated in the template strings works out-of-the-box for many cases but might not work perfectly in big files/projects. If you are seeing unexpected results, try moving your component out to a smaller file.

By default, npm packages are not resolved (they are "external"-ized). For importing a package, pass its name to the `resolvePackages` option.

```js
export default defineConfig({
  plugins: [ecsstatic({ resolvePackages: ['open-props'] })],
});
```

## Syntax highlighting

For syntax highlighting and intellisense, use the [vscode-styled-components](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components) extension. This should work fine for `css` literals, but for `scss` you might need to rename the import.

```js
import { scss as css } from '@acab/ecsstatic';
```

## Prior art

Huge shoutout to the previous libraries that came before this; ecsstatic would not have been possible without them paving the way.

- styled-components / emotion
- css modules
- linaria

## Contributing

Open an [issue](https://github.com/mayank99/ecsstatic/issues) or see [`CONTRIBUTING.md`](https://github.com/mayank99/ecsstatic/blob/main/CONTRIBUTING.md).
