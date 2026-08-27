# recipe-search-bar



<!-- Auto Generated Below -->


## Overview

A debounced search input for recipe queries.

Keystrokes are coalesced so a consumer can wire `searchChange` straight to an
API call without throttling on their side. Submitting the form (Enter) or
pressing the search button flushes immediately.

## Properties

| Property      | Attribute     | Description                                                            | Type     | Default             |
| ------------- | ------------- | ---------------------------------------------------------------------- | -------- | ------------------- |
| `debounceMs`  | `debounce-ms` | Milliseconds to wait after the last keystroke before emitting.         | `number` | `300`               |
| `label`       | `label`       | Accessible label for the input, used when no visible label is present. | `string` | `'Search recipes'`  |
| `placeholder` | `placeholder` | Placeholder text for the input.                                        | `string` | `'Search recipes…'` |
| `value`       | `value`       | Current query. Treated as the initial value and on external resets.    | `string` | `''`                |


## Events

| Event          | Description                                                    | Type                              |
| -------------- | -------------------------------------------------------------- | --------------------------------- |
| `searchChange` | Emitted after the debounce interval, or immediately on submit. | `CustomEvent<{ query: string; }>` |
| `searchClear`  | Emitted when the clear button empties a non-empty query.       | `CustomEvent<void>`               |


## Methods

### `setFocus() => Promise<void>`

Imperatively focus the input, e.g. after opening a search overlay.

#### Returns

Type: `Promise<void>`




## Slots

| Slot        | Description                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `"filters"` | Rendered to the right of the input, inside the same bar. Use for a filter toggle or sort control. |


## Shadow Parts

| Part       | Description             |
| ---------- | ----------------------- |
| `"field"`  | The text input element. |
| `"submit"` | The search button.      |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
