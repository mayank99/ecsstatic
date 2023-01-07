import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { vitePlugin as ecsstatic } from '@acab/ecsstatic';
import Inspect from 'vite-plugin-inspect';

export default defineConfig({
	vite: {
		plugins: [Inspect, ecsstatic()],
	},
	integrations: [react()],
});
