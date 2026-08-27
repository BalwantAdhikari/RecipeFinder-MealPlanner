# recipe-card



<!-- Auto Generated Below -->


## Overview

A single recipe tile: image, title, category/area meta, and a favorite toggle.

## Properties

| Property     | Attribute     | Description                                                                                                                                     | Type               | Default     |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| `compact`    | `compact`     | Renders a denser card with the description and meta row hidden.                                                                                 | `boolean`          | `false`     |
| `isFavorite` | `is-favorite` | Whether this recipe is currently in the user's favorites.                                                                                       | `boolean`          | `false`     |
| `recipe`     | `recipe`      | The recipe to display. Accepts either an object (set as a DOM property) or a JSON string (set as an attribute), so it works from any framework. | `Recipe \| string` | `undefined` |


## Events

| Event            | Description                                                                                                                                  | Type                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `favoriteToggle` | Emitted when the favorite button is activated. The payload carries the *requested* next state; the consumer owns the actual favorites store. | `CustomEvent<{ recipeId: string; isFavorite: boolean; }>` |
| `viewDetails`    | Emitted when the user asks to open the full recipe.                                                                                          | `CustomEvent<{ recipeId: string; }>`                      |


## Slots

| Slot        | Description                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `"actions"` | Extra controls rendered in the card footer, beside the "View recipe" button. Use for consumer-specific actions such as "Add to meal plan". |
| `"badge"`   | Overlaid on the top-left of the image. Use for a source or dietary badge.                                                                  |


## Shadow Parts

| Part      | Description               |
| --------- | ------------------------- |
| `"card"`  | The outer card container. |
| `"image"` | The recipe image.         |
| `"title"` | The recipe title heading. |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
