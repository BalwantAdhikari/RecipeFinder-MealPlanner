# recipe-rating



<!-- Auto Generated Below -->


## Overview

A star rating, usable either as a read-only display or an input.

When `readonly` is false the stars form a radio group so keyboard users can
pick a value with arrow keys, matching native radio semantics.

## Properties

| Property   | Attribute  | Description                                            | Type      | Default    |
| ---------- | ---------- | ------------------------------------------------------ | --------- | ---------- |
| `label`    | `label`    | Accessible label for the group.                        | `string`  | `'Rating'` |
| `max`      | `max`      | Number of stars to render.                             | `number`  | `5`        |
| `readonly` | `readonly` | When true the stars are display-only and emit nothing. | `boolean` | `false`    |
| `value`    | `value`    | Current rating. Clamped to `0..max`.                   | `number`  | `0`        |


## Events

| Event  | Description                                                         | Type                              |
| ------ | ------------------------------------------------------------------- | --------------------------------- |
| `rate` | Emitted when the user picks a rating. Never fires while `readonly`. | `CustomEvent<{ value: number; }>` |


## Slots

| Slot | Description                                    |
| ---- | ---------------------------------------------- |
|      | Rendered after the stars, e.g. a review count. |


## Shadow Parts

| Part       | Description           |
| ---------- | --------------------- |
| `"rating"` | The outer container.  |
| `"star"`   | Each individual star. |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
