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
				<span class="brand-mark" aria-hidden="true">
					<svg
						viewBox="0 0 24 24"
						width="18"
						height="18"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<path d="M4 4v7a4 4 0 0 0 8 0V4" />
						<path d="M8 15v5" />
						<path d="M17 4c0 3-2 4-2 7s2 4 2 4" />
						<path d="M17 15v5" />
					</svg>
				</span>
				<span class="brand-text">Recipe Finder</span>
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
		<div class="footer-inner">
			<div class="footer-col">
				<p class="footer-title">About Recipe Finder</p>
				<p>
					Browse recipes from a public database, keep your favourites, and plan a week of meals.
					Everything you save stays in your own browser.
				</p>
			</div>

			<div class="footer-col">
				<p class="footer-title">Explore</p>
				<ul>
					{#each links as link (link.path)}
						<li><a href={link.href}>{link.label}</a></li>
					{/each}
				</ul>
			</div>

			<div class="footer-col">
				<p class="footer-title">Built with</p>
				<ul>
					<li>
						<a href="https://www.themealdb.com/" rel="noreferrer">TheMealDB</a>
					</li>
					<li>
						<a href="https://www.npmjs.com/package/recipe-ui-components" rel="noreferrer">
							recipe-ui-components
						</a>
					</li>
					<li>
						<a href="https://svelte.dev/docs/kit" rel="noreferrer">SvelteKit</a>
					</li>
				</ul>
			</div>
		</div>
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
		z-index: 20;
		background: color-mix(in srgb, var(--bg-deep) 88%, transparent);
		backdrop-filter: saturate(1.4) blur(12px);
		border-bottom: 1px solid var(--border);
	}

	.bar {
		display: flex;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-3) var(--space-5);
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--cream);
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		color: var(--cream);
		background: var(--accent);
		border-radius: var(--radius-full);
	}

	/* The wordmark carries the script face, the nav stays sans for legibility. */
	.brand-text {
		font-family: var(--font-display);
		font-size: var(--step-2);
		letter-spacing: 0.01em;
	}

	nav ul {
		display: flex;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
		flex-wrap: wrap;
	}

	nav a {
		display: block;
		padding: 0.4375rem 0.875rem;
		font-size: var(--step-0);
		font-weight: 500;
		color: var(--cream-muted);
		text-decoration: none;
		border-radius: var(--radius-full);
		transition:
			color 150ms var(--ease),
			background 150ms var(--ease);
	}

	nav a:hover {
		color: var(--cream);
		background: var(--bg-soft);
	}

	nav a[aria-current='page'] {
		color: var(--ink);
		background: var(--cream);
	}

	.main {
		flex: 1;
		width: 100%;
	}

	.footer {
		margin-top: var(--space-8);
		background: var(--bg-deep);
		border-top: 1px solid var(--border);
	}

	.footer-inner {
		display: grid;
		gap: var(--space-5);
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-5);
		font-size: var(--step--1);
		color: var(--cream-muted);
	}

	@media (min-width: 720px) {
		.footer-inner {
			grid-template-columns: 1.4fr 1fr 1fr;
			gap: var(--space-6);
		}
	}

	.footer-title {
		margin-bottom: var(--space-3);
		font-family: var(--font-display);
		font-size: var(--step-1);
		color: var(--cream);
	}

	.footer-col ul {
		display: grid;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.footer-col a {
		color: var(--cream-muted);
		text-decoration: none;
	}

	.footer-col a:hover {
		color: var(--cream);
		text-decoration: underline;
	}

	@media (max-width: 520px) {
		.bar {
			padding: var(--space-3) var(--space-4);
		}

		.brand-text {
			font-size: var(--step-1);
		}
	}
</style>
