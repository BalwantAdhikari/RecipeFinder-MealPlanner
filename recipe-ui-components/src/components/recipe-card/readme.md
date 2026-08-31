# recipe-card



<!-- Auto Generated Below -->


## Overview

A single recipe tile: image, title, a category/area meta row, and a favorite
toggle.

The whole card is the navigation target. Rather than putting a click handler
on the `article` — which is invisible to keyboards and screen readers — the
title is a real button and an absolutely positioned overlay extends its hit
area over the card. The favorite toggle and anything slotted into `actions`
sit above that overlay, so they stay independently clickable.

## Properties

| Property     | Attribute     | Description                                                                                                                                     | Type               | Default     |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| `compact`    | `compact`     | Renders a denser card with the meta row hidden.                                                                                                 | `boolean`          | `false`     |
| `isFavorite` | `is-favorite` | Whether this recipe is currently in the user's favorites.                                                                                       | `boolean`          | `false`     |
| `recipe`     | `recipe`      | The recipe to display. Accepts either an object (set as a DOM property) or a JSON string (set as an attribute), so it works from any framework. | `Recipe \| string` | `undefined` |


## Events

| Event            | Description                                                                                                                                  | Type                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `favoriteToggle` | Emitted when the favorite button is activated. The payload carries the *requested* next state; the consumer owns the actual favorites store. | `CustomEvent<{ recipeId: string; isFavorite: boolean; }>` |
| `viewDetails`    | Emitted when the user asks to open the full recipe.                                                                                          | `CustomEvent<{ recipeId: string; }>`                      |


## Slots

| Slot        | Description                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"actions"` | Controls rendered in the card footer, e.g. "Add to meal plan". The footer is omitted entirely when nothing is slotted in, so a card with no consumer actions has no empty strip at the bottom.           |
| `"badge"`   | Overlaid on the top-left of the image. Use for a source or dietary badge.                                                                                                                                |
| `"rating"`  | Rendered at the right of the meta row, opposite the category. Intended for `<recipe-rating>` or a review count. This library's data source has no rating field, so the slot is the only way to show one. |


## Shadow Parts

| Part         | Description                         |
| ------------ | ----------------------------------- |
| `"card"`     | The outer card container.           |
| `"category"` | The category label in the meta row. |
| `"favorite"` | The favorite toggle button.         |
| `"image"`    | The recipe image.                   |
| `"title"`    | The recipe title heading.           |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
