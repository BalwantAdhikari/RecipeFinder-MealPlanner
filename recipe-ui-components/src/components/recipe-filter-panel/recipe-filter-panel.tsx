import { Component, Prop, Event, EventEmitter, h, Host } from '@stencil/core';
import { parseArrayProp, parseObjectProp } from '../../utils/utils';
import type { RecipeFilters } from '../../types/recipe';

/**
 * Category and cuisine filters for the recipe list.
 *
 * Fully controlled: the component never holds selection state of its own. It
 * emits `filterChange` with the complete next filter object, so the consumer's
 * store stays the single source of truth.
 *
 * @slot - Default slot rendered below the built-in selects. Use for additional
 * filters such as a max-time slider.
 *
 * @part panel - The outer container.
 * @part select - Each select element.
 */
@Component({
  tag: 'recipe-filter-panel',
  styleUrl: 'recipe-filter-panel.css',
  shadow: true,
})
export class RecipeFilterPanel {
  /** Available categories. Accepts an array or a JSON string. */
  @Prop() categories?: string[] | string;

  /** Available cuisines/areas. Accepts an array or a JSON string. */
  @Prop() areas?: string[] | string;

  /** Currently active filters. Accepts an object or a JSON string. */
  @Prop() selected?: RecipeFilters | string;

  /** Hides the "Clear all" button when the consumer handles resets elsewhere. */
  @Prop() hideClear: boolean = false;

  /** Emitted with the full next filter state whenever any control changes. */
  @Event() filterChange!: EventEmitter<RecipeFilters>;

  /** Emitted when "Clear all" is pressed, alongside an empty `filterChange`. */
  @Event() filterClear!: EventEmitter<void>;

  private get current(): RecipeFilters {
    return parseObjectProp<RecipeFilters>(this.selected) ?? {};
  }

  private update(patch: RecipeFilters) {
    const next = { ...this.current, ...patch };
    // Drop empty values so consumers can treat the payload as "active filters".
    (Object.keys(next) as (keyof RecipeFilters)[]).forEach(key => {
      if (!next[key]) {
        delete next[key];
      }
    });
    this.filterChange.emit(next);
  }

  private handleClear = () => {
    this.filterClear.emit();
    this.filterChange.emit({});
  };

  private renderSelect(
    id: string,
    labelText: string,
    options: string[],
    value: string | undefined,
    onChange: (next: string) => void,
  ) {
    return (
      <div class="control">
        <label class="label" htmlFor={id}>
          {labelText}
        </label>
        <select
          part="select"
          class="select"
          id={id}
          onChange={event => onChange((event.target as HTMLSelectElement).value)}
        >
          <option value="" selected={!value}>
            All
          </option>
          {options.map(option => (
            <option value={option} selected={value === option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  render() {
    const categories = parseArrayProp<string>(this.categories);
    const areas = parseArrayProp<string>(this.areas);
    const current = this.current;
    const activeCount = Object.keys(current).length;

    return (
      <Host>
        <section class="panel" part="panel" aria-label="Recipe filters">
          <header class="head">
            <h2 class="heading">Filters</h2>
            {!this.hideClear && activeCount > 0 && (
              <button type="button" class="clear" onClick={this.handleClear}>
                Clear all ({activeCount})
              </button>
            )}
          </header>

          <div class="controls">
            {categories.length > 0 &&
              this.renderSelect('filter-category', 'Category', categories, current.category, next =>
                this.update({ category: next }),
              )}

            {areas.length > 0 &&
              this.renderSelect('filter-area', 'Cuisine', areas, current.area, next =>
                this.update({ area: next }),
              )}
          </div>

          <slot />
        </section>
      </Host>
    );
  }
}
