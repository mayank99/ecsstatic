import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ecsstaticVite as ecsstatic } from '@acab/ecsstatic';
import Inspect from 'vite-plugin-inspect';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		ecsstatic({
			resolvePackages: ['open-props'],
		}),
		Inspect(),
	],
});
