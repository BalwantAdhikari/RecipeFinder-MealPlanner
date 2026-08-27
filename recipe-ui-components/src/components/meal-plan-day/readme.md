# meal-plan-day



<!-- Auto Generated Below -->


## Overview

One day column of the weekly meal plan, with a breakfast/lunch/dinner slot.

Each empty slot is a drop target and a click target, so a consumer can wire
either drag-and-drop or a picker dialog off the same `addMealRequest` event.

## Properties

| Property           | Attribute   | Description                                                    | Type                      | Default     |
| ------------------ | ----------- | -------------------------------------------------------------- | ------------------------- | ----------- |
| `addLabel`         | `add-label` | Label shown on the affordance for an empty meal slot.          | `string`                  | `'+ Add'`   |
| `day` _(required)_ | `day`       | Day label, e.g. `Monday`.                                      | `string`                  | `undefined` |
| `isToday`          | `is-today`  | Highlights the column as the current day.                      | `boolean`                 | `false`     |
| `meals`            | `meals`     | Meals assigned to this day. Accepts an array or a JSON string. | `PlannedMeal[] \| string` | `undefined` |


## Events

| Event            | Description                                                                    | Type                                                              |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `addMealRequest` | Emitted when an empty slot is activated, asking the consumer to open a picker. | `CustomEvent<{ day: string; slot: MealSlot; }>`                   |
| `mealDrop`       | Emitted when a recipe is dropped onto a slot. Carries the dragged id.          | `CustomEvent<{ day: string; slot: MealSlot; recipeId: string; }>` |
| `removeMeal`     | Emitted when the user removes a planned meal.                                  | `CustomEvent<{ day: string; slot: MealSlot; recipeId: string; }>` |


## Slots

| Slot       | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| `"footer"` | Rendered below the slot list, e.g. a per-day nutrition summary. |


## Shadow Parts

| Part     | Description          |
| -------- | -------------------- |
| `"day"`  | The outer container. |
| `"slot"` | Each meal slot row.  |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
