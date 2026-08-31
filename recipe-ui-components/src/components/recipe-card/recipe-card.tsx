import { Component, Prop, Event, EventEmitter, h, Host } from '@stencil/core';
import { parseObjectProp } from '../../utils/utils';
import type { Recipe } from '../../types/recipe';

/**
 * A single recipe tile: image, title, category/area meta, and a favorite toggle.
 *
 * @slot actions - Extra controls rendered in the card footer, beside the
 * "View recipe" button. Use for consumer-specific actions such as
 * "Add to meal plan".
 * @slot badge - Overlaid on the top-left of the image. Use for a source or
 * dietary badge.
 *
 * @part card - The outer card container.
 * @part image - The recipe image.
 * @part title - The recipe title heading.
 * @part favorite - The favorite toggle button.
 */
@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {
  /**
   * The recipe to display. Accepts either an object (set as a DOM property) or
   * a JSON string (set as an attribute), so it works from any framework.
   */
  @Prop() recipe?: Recipe | string;

  /** Whether this recipe is currently in the user's favorites. */
  @Prop() isFavorite: boolean = false;

  /** Renders a denser card with the description and meta row hidden. */
  @Prop() compact: boolean = false;

  /**
   * Emitted when the favorite button is activated. The payload carries the
   * *requested* next state; the consumer owns the actual favorites store.
   */
  @Event() favoriteToggle!: EventEmitter<{ recipeId: string; isFavorite: boolean }>;

  /** Emitted when the user asks to open the full recipe. */
  @Event() viewDetails!: EventEmitter<{ recipeId: string }>;

  private get parsed(): Recipe | undefined {
    return parseObjectProp<Recipe>(this.recipe);
  }

  private handleFavorite = (event: MouseEvent) => {
    event.stopPropagation();
    const recipe = this.parsed;
    if (!recipe) {
      return;
    }
    this.favoriteToggle.emit({ recipeId: recipe.id, isFavorite: !this.isFavorite });
  };

  private handleView = () => {
    const recipe = this.parsed;
    if (!recipe) {
      return;
    }
    this.viewDetails.emit({ recipeId: recipe.id });
  };

  render() {
    const recipe = this.parsed;

    if (!recipe) {
      return (
        <Host>
          <article class="card card--empty" part="card">
            <p class="empty">No recipe provided.</p>
          </article>
        </Host>
      );
    }

    const meta = [recipe.category, recipe.area].filter(Boolean);

    return (
      <Host>
        <article class={{ 'card': true, 'card--compact': this.compact }} part="card">
          <div class="media">
            {recipe.image ? (
              <img part="image" src={recipe.image} alt={recipe.title} loading="lazy" />
            ) : (
              <div class="media__placeholder" aria-hidden="true">
                🍽
              </div>
            )}
            <div class="media__badge">
              <slot name="badge" />
            </div>
            <button
              type="button"
              part="favorite"
              class={{ 'fav': true, 'fav--active': this.isFavorite }}
              aria-pressed={String(this.isFavorite)}
              aria-label={this.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={this.handleFavorite}
            >
              {/* Inline SVG rather than a ★/♥ character: an emoji or dingbat glyph
                  renders as a tofu box on systems without the right font, and the
                  filled/outline distinction is what communicates state here. */}
              <svg
                class="fav__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                fill={this.isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z" />
              </svg>
            </button>
          </div>

          <div class="body">
            <h3 class="title" part="title">
              {recipe.title}
            </h3>

            {!this.compact && meta.length > 0 && (
              <p class="meta">
                {meta.map(item => (
                  <span class="chip">{item}</span>
                ))}
              </p>
            )}
          </div>

          <footer class="footer">
            <button type="button" class="primary" onClick={this.handleView}>
              View recipe
            </button>
            <slot name="actions" />
          </footer>
        </article>
      </Host>
    );
  }
}
