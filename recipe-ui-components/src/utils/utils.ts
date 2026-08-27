/**
 * Coerce a prop that may arrive as either a real object or a JSON string.
 *
 * Frameworks that render custom elements through their generic element path
 * (Svelte, plain HTML templates, SSR markup) can only set *attributes*, which
 * are always strings. Accepting both shapes means a consumer can pass either
 * `el.recipe = obj` or `recipe='{"id":"1"}'` and get identical behaviour.
 *
 * Returns `undefined` rather than throwing when the string is not valid JSON,
 * so a malformed attribute degrades to an empty render instead of a crash.
 */
export function parseObjectProp<T>(value: T | string | undefined | null): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

/**
 * Same coercion as {@link parseObjectProp} but guaranteed to yield an array.
 *
 * Non-array values (including a successfully parsed object) collapse to `[]`,
 * which keeps `.map()` in render methods unconditional.
 */
export function parseArrayProp<T>(value: T[] | string | undefined | null): T[] {
  const parsed = parseObjectProp<T[]>(value);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Debounce a function by `delay` milliseconds.
 *
 * Used by `recipe-search-bar` so keystrokes do not fan out into one API
 * request each. Returns a `cancel` handle for teardown on disconnect.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wrapped = (...args: A) => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delay);
  };

  wrapped.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return wrapped;
}
