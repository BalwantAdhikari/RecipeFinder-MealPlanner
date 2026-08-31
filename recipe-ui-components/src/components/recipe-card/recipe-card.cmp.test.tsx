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
  it('renders the title and the category/area meta row from an object prop', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('[part="title"]')!.textContent).toBe(RECIPE.title);
    expect(shadow.querySelector('[part="category"]')!.textContent).toBe('Chicken');
    expect(shadow.querySelector('.area')!.textContent).toBe('Japanese');
  });

  it('omits the category and area when the recipe has neither', async () => {
    const { root } = await render(<recipe-card recipe={{ ...RECIPE, category: '', area: '' }} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('[part="category"]')).toBeNull();
    expect(shadow.querySelector('.area')).toBeNull();
    // The row itself stays, since the rating slot may still be filled.
    expect(shadow.querySelector('.meta')).toBeTruthy();
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

  it('emits viewDetails when the title is activated', async () => {
    const { root, spyOnEvent } = await render(<recipe-card recipe={RECIPE} />);
    const spy = spyOnEvent('viewDetails');

    (root.shadowRoot!.querySelector('.title__btn') as HTMLButtonElement).click();

    expect(spy.lastEvent!.detail).toEqual({ recipeId: RECIPE.id });
  });

  it('makes the card the click target via a real focusable button', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const shadow = root.shadowRoot!;
    const trigger = shadow.querySelector('.title__btn') as HTMLButtonElement;

    // A handler on the <article> would pass a click test but be unreachable by
    // keyboard, so assert the semantics rather than just the behaviour.
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent).toBe(RECIPE.title);

    trigger.focus();
    expect(shadow.activeElement).toBe(trigger);
  });

  it("covers the whole card with the title's hit area", async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const shadow = root.shadowRoot!;
    const card = shadow.querySelector('[part="card"]') as HTMLElement;
    const trigger = shadow.querySelector('.title__btn') as HTMLElement;
    const box = card.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(0);

    // Probe *inside* the shadow root. document.elementFromPoint stops at the
    // host, so it would return <recipe-card> for any point on the card and this
    // assertion could never fail.
    const corners = [
      [box.left + 6, box.top + 6],
      [box.right - 6, box.top + 6],
      [box.left + 6, box.bottom - 6],
      [box.right - 6, box.bottom - 6],
    ] as const;

    for (const [x, y] of corners) {
      expect(shadow.elementFromPoint(x, y)).toBe(trigger);
    }
  });

  it('clicking favorite does not also fire viewDetails', async () => {
    const { root, spyOnEvent } = await render(<recipe-card recipe={RECIPE} />);
    const view = spyOnEvent('viewDetails');
    const fav = spyOnEvent('favoriteToggle');
    const shadow = root.shadowRoot!;
    const button = shadow.querySelector('[part="favorite"]') as HTMLButtonElement;

    // The card-wide overlay paints over the favorite unless it is lifted above
    // it. A dispatched click() ignores hit-testing and would pass either way, so
    // assert that the favorite is genuinely the topmost element at its own
    // coordinates before clicking it.
    const box = button.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(0);
    const topmost = shadow.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    // The heart SVG is the deepest element at that point, which is fine — what
    // matters is that the hit lands inside the favorite and not on the overlay.
    expect(topmost === button || button.contains(topmost)).toBe(true);
    expect(topmost).not.toBe(shadow.querySelector('.title__btn'));

    button.click();

    expect(fav.length).toBe(1);
    expect(view.length).toBe(0);
  });

  it('emits nothing when no recipe is set', async () => {
    const { root, spyOnEvent } = await render(<recipe-card />);
    const spy = spyOnEvent('viewDetails');

    const button = root.shadowRoot!.querySelector('.title__btn') as HTMLButtonElement | null;
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

  it('omits the footer when nothing is slotted into actions', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} />);
    const footer = root.shadowRoot!.querySelector('.footer') as HTMLElement;

    expect(footer.hidden).toBe(true);
    expect(footer.getBoundingClientRect().height).toBe(0);
  });

  it('shows the footer once an action is slotted in', async () => {
    const { root } = await render(
      <recipe-card recipe={RECIPE}>
        <button slot="actions">Add to plan</button>
      </recipe-card>,
    );
    const footer = root.shadowRoot!.querySelector('.footer') as HTMLElement;

    expect(footer.hidden).toBe(false);
    expect(footer.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('keeps slotted actions clickable through the card overlay', async () => {
    let clicked = false;
    const { root } = await render(
      <recipe-card recipe={RECIPE}>
        <button id="plan" slot="actions" onClick={() => (clicked = true)}>
          Add to plan
        </button>
      </recipe-card>,
    );
    const action = root.querySelector('#plan') as HTMLButtonElement;
    const trigger = root.shadowRoot!.querySelector('.title__btn') as HTMLElement;

    // A z-index mistake would leave this button dead to the mouse while still
    // passing a .click() test, since dispatching a click ignores hit-testing.
    // Assert on the topmost element at the button's real coordinates.
    const box = action.getBoundingClientRect();
    expect(box.height).toBeGreaterThan(0);
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;

    expect(document.elementFromPoint(cx, cy)).toBe(action);
    expect(root.shadowRoot!.elementFromPoint(cx, cy)).not.toBe(trigger);

    action.click();
    expect(clicked).toBe(true);
  });

  it('projects content into the rating slot', async () => {
    const { root } = await render(
      <recipe-card recipe={RECIPE}>
        <span id="stars" slot="rating">
          4.5
        </span>
      </recipe-card>,
    );

    expect(root.querySelector('#stars')).toBeTruthy();
    expect(root.shadowRoot!.querySelector('slot[name="rating"]')).toBeTruthy();
  });

  it('hides the meta row in compact mode', async () => {
    const { root } = await render(<recipe-card recipe={RECIPE} compact={true} />);

    expect(root.shadowRoot!.querySelector('.meta')).toBeNull();
    expect(root.shadowRoot!.querySelector('.card--compact')).toBeTruthy();
  });
});
