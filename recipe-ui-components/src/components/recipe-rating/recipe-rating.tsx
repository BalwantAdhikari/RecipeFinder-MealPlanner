import { Component, Prop, Event, EventEmitter, h, Host } from '@stencil/core';

/**
 * A star rating, usable either as a read-only display or an input.
 *
 * When `readonly` is false the stars form a radio group so keyboard users can
 * pick a value with arrow keys, matching native radio semantics.
 *
 * @slot - Rendered after the stars, e.g. a review count.
 *
 * @part rating - The outer container.
 * @part star - Each individual star.
 */
@Component({
  tag: 'recipe-rating',
  styleUrl: 'recipe-rating.css',
  shadow: true,
})
export class RecipeRating {
  /** Current rating. Clamped to `0..max`. */
  @Prop() value: number = 0;

  /** Number of stars to render. */
  @Prop() max: number = 5;

  /** When true the stars are display-only and emit nothing. */
  @Prop() readonly: boolean = false;

  /** Accessible label for the group. */
  @Prop() label: string = 'Rating';

  /** Emitted when the user picks a rating. Never fires while `readonly`. */
  @Event() rate!: EventEmitter<{ value: number }>;

  private get clamped(): number {
    const max = Math.max(0, Math.floor(this.max));
    const value = Number.isFinite(this.value) ? this.value : 0;
    return Math.min(Math.max(value, 0), max);
  }

  private handleSelect = (next: number) => {
    if (!this.readonly) {
      this.rate.emit({ value: next });
    }
  };

  render() {
    const max = Math.max(0, Math.floor(this.max));
    const value = this.clamped;
    const stars = Array.from({ length: max }, (_, index) => index + 1);

    return (
      <Host>
        <div
          class={{ 'rating': true, 'rating--interactive': !this.readonly }}
          part="rating"
          role={this.readonly ? 'img' : 'radiogroup'}
          aria-label={this.readonly ? `${this.label}: ${value} out of ${max}` : this.label}
        >
          {stars.map(star =>
            this.readonly ? (
              <span
                class={{ 'star': true, 'star--on': star <= value }}
                part="star"
                aria-hidden="true"
              >
                ★
              </span>
            ) : (
              <button
                type="button"
                class={{ 'star': true, 'star--on': star <= value }}
                part="star"
                role="radio"
                aria-checked={String(star === value)}
                aria-label={`${star} of ${max}`}
                onClick={() => this.handleSelect(star)}
              >
                ★
              </button>
            ),
          )}

          <slot />
        </div>
      </Host>
    );
  }
}
