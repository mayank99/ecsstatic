import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { ecsstatic } from '@acab/ecsstatic/vite';

export default defineConfig({
	plugins: [solid(), ecsstatic()],
});
