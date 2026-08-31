/** Two small actions for working with the Stencil elements. */

/**
 * Listens for the components' camelCase custom events.
 *
 * Svelte's `onclick` shorthand only knows real DOM events, so `onfavoriteToggle`
 * doesn't exist and `on:` is deprecated. This just wires up addEventListener and
 * cleans up after itself.
 *
 * ```svelte
 * <recipe-card use:on={{ favoriteToggle: (e) => toggle(e.detail) }}></recipe-card>
 * ```
 */
export function on(node: HTMLElement, handlers: Record<string, (e: CustomEvent) => void>) {
	let current = handlers;

	const bind = (map: Record<string, (e: CustomEvent) => void>) => {
		for (const [name, fn] of Object.entries(map)) {
			node.addEventListener(name, fn as EventListener);
		}
	};
	const unbind = (map: Record<string, (e: CustomEvent) => void>) => {
		for (const [name, fn] of Object.entries(map)) {
			node.removeEventListener(name, fn as EventListener);
		}
	};

	bind(current);

	return {
		update(next: Record<string, (e: CustomEvent) => void>) {
			unbind(current);
			current = next;
			bind(current);
		},
		destroy() {
			unbind(current);
		}
	};
}

/**
 * Sets objects and arrays as DOM properties instead of attributes, since Svelte
 * would otherwise stringify them to "[object Object]".
 *
 * Don't rename this to `props` — Svelte treats `$props` as a store
 * subscription, so an import by that name breaks the `$props()` rune.
 *
 * The `whenDefined` wait matters more than it looks: a child's actions run
 * before the parent layout's `onMount`, so the element usually isn't upgraded
 * yet. Assigning early creates own properties that shadow Stencil's accessors,
 * and the component renders as if it got nothing.
 *
 * ```svelte
 * <recipe-card use:setProps={{ recipe, isFavorite }}></recipe-card>
 * ```
 */
export function setProps(node: HTMLElement, values: Record<string, unknown>) {
	let current = values;
	let ready = false;

	const apply = () => {
		for (const [key, value] of Object.entries(current)) {
			(node as unknown as Record<string, unknown>)[key] = value;
		}
	};

	const tag = node.localName;
	if (tag.includes('-') && !customElements.get(tag)) {
		customElements.whenDefined(tag).then(() => {
			ready = true;
			apply();
		});
	} else {
		ready = true;
		apply();
	}

	return {
		update(next: Record<string, unknown>) {
			current = next;
			// Before upgrade, whenDefined() picks up the latest `current` anyway.
			if (ready) apply();
		}
	};
}
