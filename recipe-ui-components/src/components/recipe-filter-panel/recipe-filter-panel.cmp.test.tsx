import { render, h, describe, it, expect } from '@stencil/vitest';

const CATEGORIES = ['Beef', 'Chicken', 'Dessert'];
const AREAS = ['Italian', 'Japanese'];

/** Pick a select option and fire the `change` event the component listens for. */
function choose(el: HTMLSelectElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('recipe-filter-panel', () => {
  it('renders a select per populated option list', async () => {
    const { root } = await render(<recipe-filter-panel categories={CATEGORIES} areas={AREAS} />);
    const selects = root.shadowRoot!.querySelectorAll('select');

    expect(selects.length).toBe(2);
    // Each select gets an extra "All" option.
    expect(selects[0].querySelectorAll('option').length).toBe(CATEGORIES.length + 1);
  });

  it('omits a select when its option list is empty', async () => {
    const { root } = await render(<recipe-filter-panel categories={CATEGORIES} />);

    expect(root.shadowRoot!.querySelectorAll('select').length).toBe(1);
  });

  it('accepts option lists as JSON strings', async () => {
    const { root } = await render(<recipe-filter-panel categories={JSON.stringify(CATEGORIES)} />);

    expect(root.shadowRoot!.querySelectorAll('option').length).toBe(CATEGORIES.length + 1);
  });

  it('marks the selected option from the selected prop', async () => {
    const { root } = await render(
      <recipe-filter-panel categories={CATEGORIES} selected={{ category: 'Chicken' }} />,
    );

    expect(root.shadowRoot!.querySelector('select')!.value).toBe('Chicken');
  });

  it('emits the full merged filter state on change', async () => {
    const { root, spyOnEvent } = await render(
      <recipe-filter-panel categories={CATEGORIES} areas={AREAS} selected={{ area: 'Italian' }} />,
    );
    const spy = spyOnEvent('filterChange');

    choose(root.shadowRoot!.querySelector('select') as HTMLSelectElement, 'Beef');

    // Merges the new category with the pre-existing area.
    expect(spy.lastEvent!.detail).toEqual({ area: 'Italian', category: 'Beef' });
  });

  it('drops a filter when reset to All rather than emitting an empty string', async () => {
    const { root, spyOnEvent } = await render(
      <recipe-filter-panel categories={CATEGORIES} selected={{ category: 'Beef' }} />,
    );
    const spy = spyOnEvent('filterChange');

    choose(root.shadowRoot!.querySelector('select') as HTMLSelectElement, '');

    expect(spy.lastEvent!.detail).toEqual({});
  });

  it('shows an active filter count and clears on demand', async () => {
    const { root, spyOnEvent } = await render(
      <recipe-filter-panel
        categories={CATEGORIES}
        areas={AREAS}
        selected={{ category: 'Beef', area: 'Italian' }}
      />,
    );
    const clearSpy = spyOnEvent('filterClear');
    const changeSpy = spyOnEvent('filterChange');
    const clear = root.shadowRoot!.querySelector('.clear') as HTMLButtonElement;

    expect(clear.textContent).toContain('(2)');

    clear.click();

    expect(clearSpy.length).toBe(1);
    expect(changeSpy.lastEvent!.detail).toEqual({});
  });

  it('ignores keys whose value is undefined when counting active filters', async () => {
    // A consumer building filters from URL params can easily produce
    // `{ category: undefined }`. Counting keys would claim a filter is active.
    const { root } = await render(
      <recipe-filter-panel
        categories={CATEGORIES}
        areas={AREAS}
        selected={{ category: undefined, area: undefined }}
      />,
    );

    expect(root.shadowRoot!.querySelector('.clear')).toBeNull();
  });

  it('counts only the set filters when some keys are undefined', async () => {
    const { root } = await render(
      <recipe-filter-panel
        categories={CATEGORIES}
        areas={AREAS}
        selected={{ category: 'Beef', area: undefined }}
      />,
    );

    expect(root.shadowRoot!.querySelector('.clear')!.textContent).toContain('(1)');
  });

  it('hides the clear button when nothing is selected', async () => {
    const { root } = await render(<recipe-filter-panel categories={CATEGORIES} />);

    expect(root.shadowRoot!.querySelector('.clear')).toBeNull();
  });

  it('hides the clear button when hideClear is set', async () => {
    const { root } = await render(
      <recipe-filter-panel
        categories={CATEGORIES}
        selected={{ category: 'Beef' }}
        hideClear={true}
      />,
    );

    expect(root.shadowRoot!.querySelector('.clear')).toBeNull();
  });

  it('projects extra controls into the default slot', async () => {
    const { root } = await render(
      <recipe-filter-panel categories={CATEGORIES}>
        <label id="quick">Under 30 min</label>
      </recipe-filter-panel>,
    );

    expect(root.querySelector('#quick')).toBeTruthy();
    expect(root.shadowRoot!.querySelector('slot:not([name])')).toBeTruthy();
  });
});
