import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { ecsstatic } from '@acab/ecsstatic/vite';

export default defineConfig({
	vite: {
		plugins: [ecsstatic()],
	},
	integrations: [react()],
});
