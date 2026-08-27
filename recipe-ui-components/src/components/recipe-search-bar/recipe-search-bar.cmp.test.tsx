import { render, h, describe, it, expect } from '@stencil/vitest';

/** Type into an input and fire the `input` event the component listens for. */
function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Wait real milliseconds.
 *
 * These tests deliberately avoid `vi.useFakeTimers()`. Vitest's browser-mode
 * `render()` polls for the element to be laid out before it resolves, and that
 * polling runs on the same timers the fake clock freezes — so faking timers
 * before a render deadlocks it. Short real debounce windows are cheaper than
 * working around that.
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('recipe-search-bar', () => {
  it('seeds the input from the value prop', async () => {
    const { root } = await render(<recipe-search-bar value="pasta" />);
    const input = root.shadowRoot!.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('pasta');
  });

  it('applies the placeholder and accessible label', async () => {
    const { root } = await render(
      <recipe-search-bar placeholder="Find dinner…" label="Recipe search" />,
    );
    const input = root.shadowRoot!.querySelector('input')!;

    expect(input.getAttribute('placeholder')).toBe('Find dinner…');
    expect(input.getAttribute('aria-label')).toBe('Recipe search');
  });

  it('debounces searchChange into a single emission with the latest query', async () => {
    const { root, spyOnEvent } = await render(<recipe-search-bar debounceMs={80} />);
    const spy = spyOnEvent('searchChange');
    const input = root.shadowRoot!.querySelector('input') as HTMLInputElement;

    // Synchronous, so all three land well inside the debounce window.
    type(input, 'c');
    type(input, 'ch');
    type(input, 'chi');
    expect(spy.length).toBe(0);

    await wait(160);

    expect(spy.length).toBe(1);
    expect(spy.lastEvent!.detail).toEqual({ query: 'chi' });
  });

  it('flushes immediately on submit without waiting for the debounce', async () => {
    const { root, spyOnEvent } = await render(<recipe-search-bar debounceMs={300} />);
    const spy = spyOnEvent('searchChange');
    const input = root.shadowRoot!.querySelector('input') as HTMLInputElement;

    type(input, 'soup');
    root.shadowRoot!
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(spy.length).toBe(1);
    expect(spy.lastEvent!.detail).toEqual({ query: 'soup' });

    // The pending debounce must have been cancelled, not merely outpaced.
    await wait(400);
    expect(spy.length).toBe(1);
  });

  it('shows the clear button only when there is a query', async () => {
    const { root, waitForChanges } = await render(<recipe-search-bar />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('.clear')).toBeNull();

    type(shadow.querySelector('input') as HTMLInputElement, 'rice');
    await waitForChanges();

    expect(shadow.querySelector('.clear')).toBeTruthy();
  });

  it('clearing emits searchClear and an empty searchChange', async () => {
    const { root, waitForChanges, spyOnEvent } = await render(<recipe-search-bar value="rice" />);
    const changeSpy = spyOnEvent('searchChange');
    const clearSpy = spyOnEvent('searchClear');

    (root.shadowRoot!.querySelector('.clear') as HTMLButtonElement).click();
    await waitForChanges();

    expect(clearSpy.length).toBe(1);
    expect(changeSpy.lastEvent!.detail).toEqual({ query: '' });
    expect((root.shadowRoot!.querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('syncs the input when the value prop is reset externally', async () => {
    const { root, setProps } = await render(<recipe-search-bar value="beef" />);

    await setProps({ value: '' });

    expect((root.shadowRoot!.querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('exposes setFocus as a public method', async () => {
    const { root } = await render<HTMLRecipeSearchBarElement>(<recipe-search-bar />);

    await root.setFocus();

    expect(root.shadowRoot!.activeElement).toBe(root.shadowRoot!.querySelector('input'));
  });

  it('projects content into the filters slot', async () => {
    const { root } = await render(
      <recipe-search-bar>
        <button id="toggle" slot="filters">
          Filters
        </button>
      </recipe-search-bar>,
    );

    expect(root.querySelector('#toggle')).toBeTruthy();
  });
});
