import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { ecsstaticVite } from '@acab/ecsstatic';

export default defineConfig({
	vite: {
		plugins: [ecsstaticVite()],
	},
	integrations: [react()],
});
