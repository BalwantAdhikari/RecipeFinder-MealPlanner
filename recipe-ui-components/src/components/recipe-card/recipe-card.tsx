import { Component, Prop, State, Element, Event, EventEmitter, h, Host } from '@stencil/core';
import { parseObjectProp } from '../../utils/utils';
import type { Recipe } from '../../types/recipe';

/**
 * A single recipe tile: image, title, a category/area meta row, and a favorite
 * toggle.
 *
 * The whole card is the navigation target. Rather than putting a click handler
 * on the `article` — which is invisible to keyboards and screen readers — the
 * title is a real button and an absolutely positioned overlay extends its hit
 * area over the card. The favorite toggle and anything slotted into `actions`
 * sit above that overlay, so they stay independently clickable.
 *
 * @slot actions - Controls rendered in the card footer, e.g. "Add to meal
 * plan". The footer is omitted entirely when nothing is slotted in, so a card
 * with no consumer actions has no empty strip at the bottom.
 * @slot badge - Overlaid on the top-left of the image. Use for a source or
 * dietary badge.
 * @slot rating - Rendered at the right of the meta row, opposite the category.
 * Intended for `<recipe-rating>` or a review count. This library's data source
 * has no rating field, so the slot is the only way to show one.
 *
 * @part card - The outer card container.
 * @part image - The recipe image.
 * @part title - The recipe title heading.
 * @part category - The category label in the meta row.
 * @part favorite - The favorite toggle button.
 */
@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {
  @Element() host!: HTMLElement;

  /**
   * The recipe to display. Accepts either an object (set as a DOM property) or
   * a JSON string (set as an attribute), so it works from any framework.
   */
  @Prop() recipe?: Recipe | string;

  /** Whether this recipe is currently in the user's favorites. */
  @Prop() isFavorite: boolean = false;

  /** Renders a denser card with the meta row hidden. */
  @Prop() compact: boolean = false;

  /**
   * Emitted when the favorite button is activated. The payload carries the
   * *requested* next state; the consumer owns the actual favorites store.
   */
  @Event() favoriteToggle!: EventEmitter<{ recipeId: string; isFavorite: boolean }>;

  /** Emitted when the user asks to open the full recipe. */
  @Event() viewDetails!: EventEmitter<{ recipeId: string }>;

  /**
   * Whether anything is slotted into `actions`, which decides if the footer
   * renders at all.
   *
   * Seeded from the light DOM before first paint so the footer is correct on
   * the initial render, then kept current by `slotchange` for consumers that
   * add or remove actions later.
   */
  @State() private hasActions: boolean = false;

  componentWillLoad() {
    this.hasActions = this.actionsSlotFilled();
  }

  private actionsSlotFilled(): boolean {
    return !!this.host.querySelector('[slot="actions"]');
  }

  private get parsed(): Recipe | undefined {
    return parseObjectProp<Recipe>(this.recipe);
  }

  private handleFavorite = (event: MouseEvent) => {
    // The favorite button sits inside the card's click overlay region. Stopping
    // propagation keeps "favorite" from also reading as "open the recipe".
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
              {/*
                A button, not a handler on the article: this is the one focusable
                navigation target for the card, and `.title__btn::after` stretches
                its hit area to the card's edges.
              */}
              <button type="button" class="title__btn" onClick={this.handleView}>
                {recipe.title}
              </button>
            </h3>

            {!this.compact && (
              <div class="meta">
                {recipe.category && (
                  <span class="category" part="category">
                    {recipe.category}
                  </span>
                )}
                {recipe.area && <span class="area">{recipe.area}</span>}
                <span class="rating">
                  <slot name="rating" />
                </span>
              </div>
            )}
          </div>

          {/*
            Rendered only when the consumer slots something in, so a card without
            actions has no empty footer strip. `slotchange` covers actions added
            after first render; the initial value is read from the light DOM in
            componentWillLoad, because slotchange has not fired yet at that point.
          */}
          <footer class="footer" hidden={!this.hasActions}>
            <slot
              name="actions"
              onSlotchange={() => {
                this.hasActions = this.actionsSlotFilled();
              }}
            />
          </footer>
        </article>
      </Host>
    );
  }
}
