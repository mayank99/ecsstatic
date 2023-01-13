import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ecsstatic } from '@acab/ecsstatic/vite';
import Inspect from 'vite-plugin-inspect';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		ecsstatic({
			evaluateExpressions: {
				resolvePackages: ['open-props'],
			},
		}),
		Inspect(),
	],
});
