import { Component, Prop, State, Watch, Event, EventEmitter, Method, h, Host } from '@stencil/core';
import { debounce } from '../../utils/utils';

/**
 * A debounced search input for recipe queries.
 *
 * Keystrokes are coalesced so a consumer can wire `searchChange` straight to an
 * API call without throttling on their side. Submitting the form (Enter) or
 * pressing the search button flushes immediately.
 *
 * @slot filters - Rendered to the right of the input, inside the same bar. Use
 * for a filter toggle or sort control.
 * @slot hint - Rendered between the input and the submit button. Intended for a
 * keyboard-shortcut hint. Kept as a slot rather than a prop because the right
 * text depends on the user's platform (⌘K vs Ctrl K), which the consumer knows
 * and this component does not.
 *
 * @part field - The text input element.
 * @part submit - The search button.
 */
@Component({
  tag: 'recipe-search-bar',
  styleUrl: 'recipe-search-bar.css',
  shadow: true,
})
export class RecipeSearchBar {
  /** Current query. Treated as the initial value and on external resets. */
  @Prop() value: string = '';

  /** Placeholder text for the input. */
  @Prop() placeholder: string = 'Search recipes…';

  /** Milliseconds to wait after the last keystroke before emitting. */
  @Prop() debounceMs: number = 300;

  /** Accessible label for the input, used when no visible label is present. */
  @Prop() label: string = 'Search recipes';

  /**
   * Renders the submit control as a round icon button instead of a labelled
   * one. The accessible name is unchanged either way — the label is visually
   * replaced by the icon, not removed.
   */
  @Prop() iconSubmit: boolean = false;

  /** Emitted after the debounce interval, or immediately on submit. */
  @Event() searchChange!: EventEmitter<{ query: string }>;

  /** Emitted when the clear button empties a non-empty query. */
  @Event() searchClear!: EventEmitter<void>;

  @State() private draft: string = '';

  private emit!: ((query: string) => void) & { cancel: () => void };

  componentWillLoad() {
    this.draft = this.value ?? '';
    this.emit = debounce((query: string) => this.searchChange.emit({ query }), this.debounceMs);
  }

  disconnectedCallback() {
    this.emit?.cancel();
  }

  @Watch('value')
  onValueChange(next: string) {
    // Keep the visible input in sync when the consumer resets the query.
    if ((next ?? '') !== this.draft) {
      this.draft = next ?? '';
    }
  }

  /** Imperatively focus the input, e.g. after opening a search overlay. */
  @Method()
  async setFocus(): Promise<void> {
    this.inputEl?.focus();
  }

  private inputEl?: HTMLInputElement;

  private handleInput = (event: Event) => {
    this.draft = (event.target as HTMLInputElement).value;
    this.emit(this.draft);
  };

  private handleSubmit = (event: Event) => {
    event.preventDefault();
    this.emit.cancel();
    this.searchChange.emit({ query: this.draft });
  };

  private handleClear = () => {
    const wasEmpty = this.draft === '';
    this.draft = '';
    this.emit.cancel();
    if (!wasEmpty) {
      this.searchClear.emit();
      this.searchChange.emit({ query: '' });
    }
    this.inputEl?.focus();
  };

  render() {
    return (
      <Host>
        <form class="bar" role="search" onSubmit={this.handleSubmit}>
          {/* Inline SVG, not 🔍: the emoji renders as a tofu box on any system
              without an emoji font, which is exactly what it did in headless
              Chromium on Linux. Same reasoning as the card's heart. */}
          <svg
            class="icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>

          <input
            part="field"
            class="field"
            type="search"
            ref={el => (this.inputEl = el)}
            value={this.draft}
            placeholder={this.placeholder}
            aria-label={this.label}
            autocomplete="off"
            onInput={this.handleInput}
          />

          {this.draft !== '' && (
            <button
              type="button"
              class="clear"
              aria-label="Clear search"
              onClick={this.handleClear}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}

          <slot name="hint" />

          <slot name="filters" />

          <button
            part="submit"
            type="submit"
            class={{ 'submit': true, 'submit--icon': this.iconSubmit }}
            aria-label={this.iconSubmit ? 'Search' : undefined}
          >
            {this.iconSubmit ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </Host>
    );
  }
}
