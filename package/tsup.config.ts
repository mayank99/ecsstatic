import type { Options } from 'tsup';

export default <Options>{
	entryPoints: ['index.ts', 'vite.ts', 'modules.ts'],
	clean: false,
	format: ['cjs', 'esm'],
	dts: true,
	splitting: false,
	outDir: '.',
	esbuildOptions(options) {
		options.allowOverwrite = true;
	},
};
