import { Component, Prop, Event, EventEmitter, h, Host } from '@stencil/core';
import { parseArrayProp } from '../../utils/utils';
import type { MealSlot, PlannedMeal } from '../../types/recipe';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

/**
 * One day column of the weekly meal plan, with a breakfast/lunch/dinner slot.
 *
 * Each empty slot is a drop target and a click target, so a consumer can wire
 * either drag-and-drop or a picker dialog off the same `addMealRequest` event.
 *
 * @slot footer - Rendered below the slot list, e.g. a per-day nutrition summary.
 *
 * @part day - The outer container.
 * @part slot - Each meal slot row.
 */
@Component({
  tag: 'meal-plan-day',
  styleUrl: 'meal-plan-day.css',
  shadow: true,
})
export class MealPlanDay {
  /** Day label, e.g. `Monday`. */
  @Prop() day!: string;

  /** Meals assigned to this day. Accepts an array or a JSON string. */
  @Prop() meals?: PlannedMeal[] | string;

  /** Highlights the column as the current day. */
  @Prop() isToday: boolean = false;

  /** Label shown on the affordance for an empty meal slot. */
  @Prop() addLabel: string = '+ Add';

  /** Emitted when the user removes a planned meal. */
  @Event() removeMeal!: EventEmitter<{ day: string; slot: MealSlot; recipeId: string }>;

  /** Emitted when an empty slot is activated, asking the consumer to open a picker. */
  @Event() addMealRequest!: EventEmitter<{ day: string; slot: MealSlot }>;

  /** Emitted when a recipe is dropped onto a slot. Carries the dragged id. */
  @Event() mealDrop!: EventEmitter<{ day: string; slot: MealSlot; recipeId: string }>;

  private handleDragOver = (event: DragEvent) => {
    // Preventing default is what marks the element as a valid drop target.
    event.preventDefault();
  };

  private handleDrop = (slot: MealSlot) => (event: DragEvent) => {
    event.preventDefault();
    const recipeId = event.dataTransfer?.getData('text/plain');
    if (recipeId) {
      this.mealDrop.emit({ day: this.day, slot, recipeId });
    }
  };

  private renderSlot(slot: MealSlot, meal: PlannedMeal | undefined) {
    return (
      <li
        class={{ slot: true, 'slot--filled': !!meal }}
        part="slot"
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop(slot)}
      >
        <span class="slot__label">{slot}</span>

        {meal ? (
          <div class="meal">
            {meal.image && <img class="meal__img" src={meal.image} alt="" loading="lazy" />}
            <span class="meal__title">{meal.title}</span>
            <button
              type="button"
              class="meal__remove"
              aria-label={`Remove ${meal.title} from ${slot} on ${this.day}`}
              onClick={() =>
                this.removeMeal.emit({ day: this.day, slot, recipeId: meal.recipeId })
              }
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            class="add"
            aria-label={`Add a ${slot} recipe for ${this.day}`}
            onClick={() => this.addMealRequest.emit({ day: this.day, slot })}
          >
            {this.addLabel}
          </button>
        )}
      </li>
    );
  }

  render() {
    const meals = parseArrayProp<PlannedMeal>(this.meals);
    const bySlot = new Map(meals.map(meal => [meal.slot, meal]));

    return (
      <Host>
        <section class={{ day: true, 'day--today': this.isToday }} part="day">
          <header class="head">
            <h3 class="name">{this.day}</h3>
            {this.isToday && <span class="today">Today</span>}
          </header>

          <ul class="slots">{SLOTS.map(slot => this.renderSlot(slot, bySlot.get(slot)))}</ul>

          <slot name="footer" />
        </section>
      </Host>
    );
  }
}
