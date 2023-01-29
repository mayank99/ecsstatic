import { defineConfig } from 'astro/config';
import solidjs from '@astrojs/solid-js';
import { ecsstatic } from '@acab/ecsstatic/vite';

export default defineConfig({
	vite: {
		plugins: [ecsstatic()],
	},
	integrations: [solidjs()],
});
