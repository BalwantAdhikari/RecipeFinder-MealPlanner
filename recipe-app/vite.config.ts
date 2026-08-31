import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// The repo lives on /mnt/c, a Windows 9p mount where Linux inotify events are
	// not delivered. Without polling, Vite never sees file edits and serves stale
	// transforms, so HMR silently does nothing.
	server: {
		watch: { usePolling: true, interval: 300 }
	},

	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			/*
			 * Vercel adapter, replacing adapter-auto now that the target is known.
			 *
			 * The pages use load functions that fetch TheMealDB per request, so they
			 * run as serverless functions rather than being prerendered. `nodejs22.x`
			 * rather than the edge runtime: the edge runtime has no full Node API and
			 * buys nothing here, since the latency is dominated by the upstream API
			 * call, not by cold start.
			 */
			adapter: adapter({ runtime: 'nodejs22.x' })
		})
	]
});
