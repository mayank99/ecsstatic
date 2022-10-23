import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { vitePlugin as ecsstatic } from '@acab/ecsstatic';

export default defineConfig({
	vite: {
		plugins: [ecsstatic()],
	},
	integrations: [react()],
});
