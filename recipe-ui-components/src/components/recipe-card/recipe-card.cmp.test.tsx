import { render, h, describe, it, expect } from '@stencil/vitest';
import type { Recipe } from '../../types/recipe';

const RECIPE: Recipe = {
  id: '52772',
  title: 'Teriyaki Chicken Casserole',
  image: 'https://example.test/teriyaki.jpg',
  category: 'Chicken',
  area: 'Japanese',
  source: 'api',
};

describe('recipe-card', () => {
  it('renders the title and meta chips from an object prop', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('[part="title"]')!.textContent).toBe(RECIPE.title);
    const chips = Array.from(shadow.querySelectorAll('.chip')).map(c => c.textContent);
    expect(chips).toEqual(['Chicken', 'Japanese']);
  });

  it('accepts the recipe as a JSON string', async () => {
    const { root } = await render(<recipe-card recipe={JSON.stringify(RECIPE)} />);

    expect(root.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe(RECIPE.title);
  });

  it('falls back to an empty state when no recipe is given', async () => {
    const { root } = await render(<recipe-card />);

    expect(root.shadowRoot!.querySelector('.empty')!.textContent).toContain('No recipe provided');
  });

  it('degrades to the empty state on malformed JSON instead of throwing', async () => {
    const { root } = await render(<recipe-card recipe="{broken" />);

    expect(root.shadowRoot!.querySelector('.empty')).toBeTruthy();
  });

  it('renders a placeholder when the recipe has no image', async () => {
    const { root } = await render(<recipe-card recipe={{ ...RECIPE, image: undefined }} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('img')).toBeNull();
    expect(shadow.querySelector('.media__placeholder')).toBeTruthy();
  });

  it('emits favoriteToggle with the requested next state', async () => {
    const { root, spyOnEvent } = await render(<recipe-card recipe={RECIPE} />);
    const spy = spyOnEvent('favoriteToggle');

    (root.shadowRoot!.querySelector('.fav') as HTMLButtonElement).click();

    expect(spy.length).toBe(1);
    expect(spy.lastEvent!.detail).toEqual({ recipeId: RECIPE.id, isFavorite: true });
  });

  it('emits favoriteToggle:false when already favorited', async () => {
    const { root, spyOnEvent } = await render(<recipe-card recipe={RECIPE} isFavorite={true} />);
    const spy = spyOnEvent('favoriteToggle');

    (root.shadowRoot!.querySelector('.fav') as HTMLButtonElement).click();

    expect(spy.lastEvent!.detail).toEqual({ recipeId: RECIPE.id, isFavorite: false });
  });

  it('reflects favorite state to aria-pressed', async () => {
    const { root, setProps } = await render(<recipe-card recipe={RECIPE} />);
    const fav = () => root.shadowRoot!.querySelector('.fav')!;

    expect(fav().getAttribute('aria-pressed')).toBe('false');

    await setProps({ isFavorite: true });
    expect(fav().getAttribute('aria-pressed')).toBe('true');
  });

  it('renders a heart icon, outlined when not favorited', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const icon = root.shadowRoot!.querySelector('.fav__icon')!;

    // Outline vs fill is what conveys state, so assert the attribute rather than
    // just the presence of an icon.
    expect(icon.getAttribute('fill')).toBe('none');
    expect(icon.getAttribute('stroke')).toBe('currentColor');
  });

  it('fills the heart when favorited', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} isFavorite={true} />);

    expect(root.shadowRoot!.querySelector('.fav__icon')!.getAttribute('fill')).toBe('currentColor');
  });

  it('keeps the icon out of the accessibility tree, leaving the button label', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('.fav__icon')!.getAttribute('aria-hidden')).toBe('true');
    expect(shadow.querySelector('.fav')!.getAttribute('aria-label')).toBe('Add to favorites');
  });

  it('exposes the favorite button as a part for external styling', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);

    expect(root.shadowRoot!.querySelector('[part="favorite"]')).toBeTruthy();
  });

  it('emits viewDetails with the recipe id', async () => {
    const { root, spyOnEvent } = await render(<recipe-card recipe={RECIPE} />);
    const spy = spyOnEvent('viewDetails');

    (root.shadowRoot!.querySelector('.primary') as HTMLButtonElement).click();

    expect(spy.lastEvent!.detail).toEqual({ recipeId: RECIPE.id });
  });

  it('emits nothing when no recipe is set', async () => {
    const { root, spyOnEvent } = await render(<recipe-card />);
    const spy = spyOnEvent('viewDetails');

    const button = root.shadowRoot!.querySelector('.primary') as HTMLButtonElement | null;
    button?.click();

    expect(spy.length).toBe(0);
  });

  it('projects content into the actions and badge slots', async () => {
    const { root } = await render(
      <recipe-card recipe={RECIPE}>
        <button id="plan" slot="actions">
          Add to plan
        </button>
        <span id="src" slot="badge">
          API
        </span>
      </recipe-card>,
    );

    expect(root.querySelector('#plan')).toBeTruthy();
    expect(root.querySelector('#src')).toBeTruthy();
    expect(root.shadowRoot!.querySelector('slot[name="actions"]')).toBeTruthy();
  });

  it('hides the meta row in compact mode', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} compact={true} />);

    expect(root.shadowRoot!.querySelector('.meta')).toBeNull();
    expect(root.shadowRoot!.querySelector('.card--compact')).toBeTruthy();
  });
});
