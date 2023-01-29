import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
	integrations: [preact()],
	vite: {
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: `@use 'open-props-scss' as *;`,
				},
			},
		},
	},
});
