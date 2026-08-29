/**
 * Helpers for talking to the Stencil custom elements.
 *
 * Two problems need solving at the boundary, and both are solved here once
 * rather than at every call site.
 */

/**
 * Bind listeners for camelCase custom events.
 *
 * Svelte 5's `onclick`-style shorthand only covers known DOM events, so
 * `onfavoriteToggle` is not a thing. Rather than fall back to the deprecated
 * `on:` directive everywhere, this action wires `addEventListener` and tears
 * the listeners down on destroy.
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
 * Assign object/array values as DOM *properties* rather than attributes.
 *
 * Svelte sets attributes on elements it does not recognise, which stringifies
 * objects to "[object Object]". Assigning real properties avoids that, and
 * avoids a serialise/parse round trip on every update.
 *
 * The ordering subtlety: a child component's actions run *before* the parent
 * layout's `onMount`, so the custom element is usually still un-upgraded when
 * this action first fires. Assigning then would create own properties that
 * shadow the accessors Stencil installs on the prototype during upgrade, and
 * the component would render as though no props were passed at all. So when the
 * element is a not-yet-defined custom element, assignment waits for
 * `whenDefined`.
 *
 * ```svelte
 * <recipe-card use:props={{ recipe, isFavorite }}></recipe-card>
 * ```
 */
export function props(node: HTMLElement, values: Record<string, unknown>) {
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
			// Before upgrade, whenDefined() will apply the latest `current`.
			if (ready) apply();
		}
	};
}
