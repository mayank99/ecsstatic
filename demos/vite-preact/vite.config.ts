import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { ecsstatic } from '@acab/ecsstatic/vite';

export default defineConfig({
	plugins: [preact(), ecsstatic()],
});
