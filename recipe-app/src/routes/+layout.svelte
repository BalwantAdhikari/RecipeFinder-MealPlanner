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
		z-index: 20;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: saturate(1.6) blur(12px);
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
		font-size: var(--step-1);
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text);
		text-decoration: none;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 1.875rem;
		height: 1.875rem;
		color: var(--accent-contrast);
		background: linear-gradient(140deg, var(--accent), var(--accent-hover));
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow-1);
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
		padding: 0.4375rem 0.8125rem;
		font-size: var(--step-0);
		font-weight: 500;
		color: var(--muted);
		text-decoration: none;
		border-radius: var(--radius-full);
		transition:
			color 140ms var(--ease),
			background 140ms var(--ease);
	}

	nav a:hover {
		color: var(--text);
		background: var(--surface-2);
	}

	nav a[aria-current='page'] {
		color: var(--accent-contrast);
		background: var(--accent);
		box-shadow: var(--shadow-1);
	}

	.main {
		flex: 1;
		width: 100%;
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-5) var(--space-7);
	}

	.footer {
		border-top: 1px solid var(--border);
		background: var(--surface);
	}

	.footer p {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-4) var(--space-5);
		font-size: var(--step--1);
		color: var(--muted);
	}

	@media (max-width: 520px) {
		.brand-text {
			font-size: var(--step-0);
		}

		.bar {
			padding: var(--space-3) var(--space-4);
		}

		.main {
			padding: var(--space-5) var(--space-4) var(--space-6);
		}
	}
</style>
