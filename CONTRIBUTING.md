# Contribution guide

Found a bug or have a question? Open an [issue](https://github.com/mayank99/ecsstatic/issues)!

Want to create a pull request? Keep reading, but first off: just know that you're awesome and your contributions are very welcome.

## Get started

This repo uses [pnpm](https://pnpm.io/installation#using-corepack). If you have Node v16+, then installing it is straightforward using Corepack.

To run the repo:

- [Fork the repo](https://github.com/mayank99/ecsstatic/fork), then [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) your fork.
- Open the cloned directory in your IDE (e.g. vscode or codespaces)
- Run `pnpm install` to install dependencies.
- Run `pnpm run dev` to start all dev servers in parallel.
- Or run `pnpm run build` to build everything.

## Directory structure

This project is a monorepo split into three folders:

- `package` contains the actual code for the `ecsstatic` package.
- `docsite` contains the documentation site hosted on [ecsstatic.dev](https://ecsstatic.dev). This is built using [astro](https://docs.astro.build/).
- `demos` contains subdirectories showing examples of how to use ecsstatic with other tools.

## Documentation

The simplest docs updates can be done directly to the [`README.md`](https://github.com/mayank99/ecsstatic/blob/main/package/README.md).

For contributing actual docs, use the `docsite` folder. Astro knows how to render markdown pages as html, so any `.md` files can be added under [`docsite/src/pages`](https://github.com/mayank99/ecsstatic/tree/main/docsite/src/pages).

Any changes that improve the visuals or accessibility of the website are also very welcome!
