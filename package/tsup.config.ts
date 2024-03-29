import type { Options } from 'tsup';

export default <Options>{
	entryPoints: ['index.ts', 'scss.ts', 'vite.ts'],
	clean: false,
	format: ['esm'],
	dts: true,
	splitting: false,
	outDir: '.',
	esbuildOptions(options) {
		options.allowOverwrite = true;
	},
};
