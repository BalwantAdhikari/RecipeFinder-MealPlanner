import { render, h, describe, it, expect } from '@stencil/vitest';

describe('recipe-rating', () => {
  it('renders max stars with value stars lit', async () => {
    const { root } = await render(<recipe-rating value={3} max={5} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelectorAll('[part="star"]').length).toBe(5);
    expect(shadow.querySelectorAll('.star--on').length).toBe(3);
  });

  it('honours a non-default max', async () => {
    const { root } = await render(<recipe-rating value={2} max={3} />);

    expect(root.shadowRoot!.querySelectorAll('[part="star"]').length).toBe(3);
  });

  it('clamps a value above max', async () => {
    const { root } = await render(<recipe-rating value={99} max={5} />);

    expect(root.shadowRoot!.querySelectorAll('.star--on').length).toBe(5);
  });

  it('clamps a negative value to zero', async () => {
    const { root } = await render(<recipe-rating value={-4} />);

    expect(root.shadowRoot!.querySelectorAll('.star--on').length).toBe(0);
  });

  it('emits rate with the chosen star when interactive', async () => {
    const { root, spyOnEvent } = await render(<recipe-rating value={1} />);
    const spy = spyOnEvent('rate');

    (root.shadowRoot!.querySelectorAll('[part="star"]')[3] as HTMLButtonElement).click();

    expect(spy.lastEvent!.detail).toEqual({ value: 4 });
  });

  it('renders a radiogroup of buttons when interactive', async () => {
    const { root } = await render(<recipe-rating value={2} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('[part="rating"]')!.getAttribute('role')).toBe('radiogroup');
    expect(shadow.querySelectorAll('button[role="radio"]').length).toBe(5);
    expect(shadow.querySelectorAll('[aria-checked="true"]').length).toBe(1);
  });

  it('renders inert spans and emits nothing when readonly', async () => {
    const { root, spyOnEvent } = await render(<recipe-rating value={4} readonly={true} />);
    const spy = spyOnEvent('rate');
    const shadow = root.shadowRoot!;

    expect(shadow.querySelectorAll('button').length).toBe(0);
    expect(shadow.querySelector('[part="rating"]')!.getAttribute('role')).toBe('img');
    expect(shadow.querySelector('[part="rating"]')!.getAttribute('aria-label')).toContain(
      '4 out of 5',
    );

    (shadow.querySelector('[part="star"]') as HTMLElement).click();
    expect(spy.length).toBe(0);
  });

  it('projects a review count into the default slot', async () => {
    const { root } = await render(
      <recipe-rating value={5}>
        <span id="count">(42)</span>
      </recipe-rating>,
    );

    expect(root.querySelector('#count')).toBeTruthy();
  });
});
