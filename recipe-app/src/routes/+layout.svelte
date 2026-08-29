<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { defineElements } from '$lib/components/define-elements';
	import '../app.css';

	let { children } = $props();

	// Custom element registration touches HTMLElement, which does not exist
	// during SSR, so this must be a client-only dynamic import.
	onMount(() => defineElements());

	// `path` is the canonical route used for active matching; `href` is the
	// resolved link. They are kept separate because resolve() returns a *relative*
	// path during SSR (it depends on the page being rendered), which would never
	// match an absolute pathname.
	const links = $derived([
		{ path: '/', href: resolve('/'), label: 'Discover' },
		{ path: '/favorites', href: resolve('/favorites'), label: 'Favorites' },
		{ path: '/meal-plan', href: resolve('/meal-plan'), label: 'Meal Plan' },
		{ path: '/my-recipes', href: resolve('/my-recipes'), label: 'My Recipes' }
	]);

	// Exact match for the index, prefix match elsewhere, so /my-recipes/new
	// still highlights "My Recipes".
	const isActive = (path: string) =>
		path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(path);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header class="header">
		<div class="bar">
			<a class="brand" href={resolve('/')}>
				<span aria-hidden="true">🍳</span>
				Recipe Finder
			</a>

			<nav aria-label="Main">
				<ul>
					{#each links as link (link.path)}
						<li>
							<a href={link.href} aria-current={isActive(link.path) ? 'page' : undefined}>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	</header>

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<p>
			Recipe data from <a href="https://www.themealdb.com/" rel="noreferrer">TheMealDB</a>. UI built
			with
			<a href="https://www.npmjs.com/package/recipe-ui-components" rel="noreferrer">
				recipe-ui-components
			</a>.
		</p>
	</footer>
</div>

<style>
	.shell {
		display: flex;
		min-height: 100vh;
		flex-direction: column;
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--border);
	}

	.bar {
		display: flex;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 0.75rem 1.25rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}

	nav ul {
		display: flex;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
		flex-wrap: wrap;
	}

	nav a {
		display: block;
		padding: 0.375rem 0.75rem;
		font-size: 0.9375rem;
		color: var(--muted);
		text-decoration: none;
		border-radius: 999px;
	}

	nav a:hover {
		color: var(--text);
		background: var(--surface);
	}

	nav a[aria-current='page'] {
		color: var(--accent-contrast);
		background: var(--accent);
	}

	.main {
		flex: 1;
		width: 100%;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.footer {
		border-top: 1px solid var(--border);
	}

	.footer p {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 1rem 1.25rem;
		font-size: 0.8125rem;
		color: var(--muted);
	}
</style>
