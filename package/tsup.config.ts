import type { Options } from 'tsup';

export default <Options>{
	entryPoints: ['index.ts', 'css.ts', 'vite.ts'],
	clean: true,
	format: ['cjs', 'esm'],
	dts: true,
};
