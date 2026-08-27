# recipe-filter-panel



<!-- Auto Generated Below -->


## Overview

Category and cuisine filters for the recipe list.

Fully controlled: the component never holds selection state of its own. It
emits `filterChange` with the complete next filter object, so the consumer's
store stays the single source of truth.

## Properties

| Property     | Attribute    | Description                                                              | Type                      | Default     |
| ------------ | ------------ | ------------------------------------------------------------------------ | ------------------------- | ----------- |
| `areas`      | `areas`      | Available cuisines/areas. Accepts an array or a JSON string.             | `string \| string[]`      | `undefined` |
| `categories` | `categories` | Available categories. Accepts an array or a JSON string.                 | `string \| string[]`      | `undefined` |
| `hideClear`  | `hide-clear` | Hides the "Clear all" button when the consumer handles resets elsewhere. | `boolean`                 | `false`     |
| `selected`   | `selected`   | Currently active filters. Accepts an object or a JSON string.            | `RecipeFilters \| string` | `undefined` |


## Events

| Event          | Description                                                             | Type                         |
| -------------- | ----------------------------------------------------------------------- | ---------------------------- |
| `filterChange` | Emitted with the full next filter state whenever any control changes.   | `CustomEvent<RecipeFilters>` |
| `filterClear`  | Emitted when "Clear all" is pressed, alongside an empty `filterChange`. | `CustomEvent<void>`          |


## Slots

| Slot | Description                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------- |
|      | Default slot rendered below the built-in selects. Use for additional filters such as a max-time slider. |


## Shadow Parts

| Part       | Description          |
| ---------- | -------------------- |
| `"panel"`  | The outer container. |
| `"select"` | Each select element. |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
