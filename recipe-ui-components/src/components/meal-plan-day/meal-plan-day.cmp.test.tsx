import { render, h, describe, it, expect } from '@stencil/vitest';
import type { PlannedMeal } from '../../types/recipe';

const DINNER: PlannedMeal = {
  slot: 'dinner',
  recipeId: '52772',
  title: 'Teriyaki Chicken Casserole',
  image: 'https://example.test/teriyaki.jpg',
};

describe('meal-plan-day', () => {
  it('renders three slots, empty by default', async () => {
    const { root } = await render(<meal-plan-day day="Monday" />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('.name')!.textContent).toBe('Monday');
    expect(shadow.querySelectorAll('[part="slot"]').length).toBe(3);
    expect(shadow.querySelectorAll('.add').length).toBe(3);
    expect(shadow.querySelectorAll('.meal').length).toBe(0);
  });

  it('places a meal into its matching slot only', async () => {
    const { root } = await render(<meal-plan-day day="Monday" meals={[DINNER]} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelectorAll('.slot--filled').length).toBe(1);
    expect(shadow.querySelector('.meal__title')!.textContent).toBe(DINNER.title);
    expect(shadow.querySelectorAll('.add').length).toBe(2);
  });

  it('accepts meals as a JSON string', async () => {
    const { root } = await render(
      <meal-plan-day day="Tuesday" meals={JSON.stringify([DINNER])} />,
    );

    expect(root.shadowRoot!.querySelector('.meal__title')!.textContent).toBe(DINNER.title);
  });

  it('emits removeMeal with day, slot and recipe id', async () => {
    const { root, spyOnEvent } = await render(<meal-plan-day day="Monday" meals={[DINNER]} />);
    const spy = spyOnEvent('removeMeal');

    (root.shadowRoot!.querySelector('.meal__remove') as HTMLButtonElement).click();

    expect(spy.lastEvent!.detail).toEqual({
      day: 'Monday',
      slot: 'dinner',
      recipeId: DINNER.recipeId,
    });
  });

  it('emits addMealRequest naming the empty slot that was clicked', async () => {
    const { root, spyOnEvent } = await render(<meal-plan-day day="Friday" />);
    const spy = spyOnEvent('addMealRequest');

    // Slots render in order: breakfast, lunch, dinner.
    (root.shadowRoot!.querySelectorAll('.add')[1] as HTMLButtonElement).click();

    expect(spy.lastEvent!.detail).toEqual({ day: 'Friday', slot: 'lunch' });
  });

  it('uses a custom addLabel', async () => {
    const { root } = await render(<meal-plan-day day="Monday" addLabel="Plan a meal" />);

    expect(root.shadowRoot!.querySelector('.add')!.textContent).toBe('Plan a meal');
  });

  it('emits mealDrop when a recipe id is dropped on a slot', async () => {
    const { root, spyOnEvent } = await render(<meal-plan-day day="Sunday" />);
    const spy = spyOnEvent('mealDrop');
    const target = root.shadowRoot!.querySelectorAll('[part="slot"]')[0];

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', '52772');
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));

    expect(spy.lastEvent!.detail).toEqual({
      day: 'Sunday',
      slot: 'breakfast',
      recipeId: '52772',
    });
  });

  it('ignores a drop that carries no recipe id', async () => {
    const { root, spyOnEvent } = await render(<meal-plan-day day="Sunday" />);
    const spy = spyOnEvent('mealDrop');
    const target = root.shadowRoot!.querySelectorAll('[part="slot"]')[0];

    target.dispatchEvent(
      new DragEvent('drop', { bubbles: true, dataTransfer: new DataTransfer() }),
    );

    expect(spy.length).toBe(0);
  });

  it('marks the column as today', async () => {
    const { root } = await render(<meal-plan-day day="Wednesday" isToday={true} />);
    const shadow = root.shadowRoot!;

    expect(shadow.querySelector('.day--today')).toBeTruthy();
    expect(shadow.querySelector('.today')!.textContent).toBe('Today');
  });

  it('projects content into the footer slot', async () => {
    const { root } = await render(
      <meal-plan-day day="Monday">
        <small id="kcal" slot="footer">
          1,850 kcal
        </small>
      </meal-plan-day>,
    );

    expect(root.querySelector('#kcal')).toBeTruthy();
  });
});
