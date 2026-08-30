import { describe, it, expect } from 'vitest';
import {
	emptyDraft,
	filledIngredients,
	filledInstructions,
	isValidImageUrl,
	validateDraft,
	isValid,
	draftToRecipe,
	recipeToDraft,
	LIMITS,
	type RecipeDraft
} from './validation';

/** A draft that passes, so each test can invalidate exactly one thing. */
function goodDraft(over: Partial<RecipeDraft> = {}): RecipeDraft {
	return {
		title: 'Lentil Soup',
		category: 'Soup',
		area: 'India',
		image: 'https://example.test/soup.jpg',
		tags: 'quick, vegan',
		ingredients: [{ name: 'lentils', measure: '200 g' }],
		instructions: ['Rinse lentils.', 'Simmer 25 minutes.'],
		...over
	};
}

describe('emptyDraft', () => {
	it('starts with one blank row of each repeatable field', () => {
		const d = emptyDraft();
		expect(d.ingredients).toHaveLength(1);
		expect(d.instructions).toHaveLength(1);
	});

	it('is not valid on its own', () => {
		expect(isValid(validateDraft(emptyDraft()))).toBe(false);
	});
});

describe('filledIngredients', () => {
	it('drops blank rows and trims', () => {
		expect(
			filledIngredients([
				{ name: '  lentils ', measure: ' 200 g ' },
				{ name: '', measure: '' },
				{ name: '   ', measure: 'x' }
			])
		).toEqual([{ name: 'lentils', measure: '200 g' }]);
	});

	it('omits an empty measure rather than storing a blank string', () => {
		expect(filledIngredients([{ name: 'salt', measure: '  ' }])).toEqual([{ name: 'salt' }]);
	});

	it('keeps a row with a name but no measure field at all', () => {
		expect(filledIngredients([{ name: 'salt' }])).toEqual([{ name: 'salt' }]);
	});
});

describe('filledInstructions', () => {
	it('drops blanks and trims', () => {
		expect(filledInstructions([' Boil. ', '', '   ', 'Serve.'])).toEqual(['Boil.', 'Serve.']);
	});
});

describe('isValidImageUrl', () => {
	it('accepts http and https', () => {
		expect(isValidImageUrl('http://example.test/a.jpg')).toBe(true);
		expect(isValidImageUrl('https://example.test/a.jpg')).toBe(true);
	});

	it('accepts blank, since the image is optional', () => {
		expect(isValidImageUrl('')).toBe(true);
		expect(isValidImageUrl('   ')).toBe(true);
	});

	it('rejects a bare path or hostname — src needs an absolute URL', () => {
		expect(isValidImageUrl('/images/a.jpg')).toBe(false);
		expect(isValidImageUrl('example.test/a.jpg')).toBe(false);
	});

	it('rejects javascript: — it would be an XSS vector in an img src', () => {
		expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
	});

	it('rejects data: to keep localStorage small', () => {
		expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
	});

	it('rejects malformed input', () => {
		expect(isValidImageUrl('http://')).toBe(false);
		expect(isValidImageUrl('::::')).toBe(false);
	});
});

describe('validateDraft', () => {
	it('accepts a complete draft', () => {
		expect(validateDraft(goodDraft())).toEqual({});
	});

	it('requires a title', () => {
		expect(validateDraft(goodDraft({ title: '   ' })).title).toMatch(/required/i);
	});

	it('rejects an over-long title', () => {
		const errors = validateDraft(goodDraft({ title: 'x'.repeat(LIMITS.titleMax + 1) }));
		expect(errors.title).toMatch(/under/i);
	});

	it('requires a category', () => {
		expect(validateDraft(goodDraft({ category: '' })).category).toMatch(/category/i);
	});

	it('requires at least one ingredient', () => {
		const errors = validateDraft(goodDraft({ ingredients: [{ name: '', measure: '' }] }));
		expect(errors.ingredients).toMatch(/at least one/i);
	});

	it('requires at least one instruction step', () => {
		expect(validateDraft(goodDraft({ instructions: ['  '] })).instructions).toMatch(
			/at least one/i
		);
	});

	it('rejects an over-long step', () => {
		const errors = validateDraft(
			goodDraft({ instructions: ['x'.repeat(LIMITS.instructionMax + 1)] })
		);
		expect(errors.instructions).toMatch(/under/i);
	});

	it('rejects a bad image URL but allows a blank one', () => {
		expect(validateDraft(goodDraft({ image: 'not a url' })).image).toBeDefined();
		expect(validateDraft(goodDraft({ image: '' })).image).toBeUndefined();
	});

	it('reports every invalid field at once, not just the first', () => {
		const errors = validateDraft({
			title: '',
			category: '',
			area: '',
			image: 'nope',
			tags: '',
			ingredients: [],
			instructions: []
		});
		expect(Object.keys(errors).sort()).toEqual([
			'category',
			'image',
			'ingredients',
			'instructions',
			'title'
		]);
	});

	it('does not require area or tags', () => {
		expect(validateDraft(goodDraft({ area: '', tags: '' }))).toEqual({});
	});
});

describe('draftToRecipe', () => {
	it('trims, splits tags and drops blank rows', () => {
		const r = draftToRecipe(
			goodDraft({
				title: '  Lentil Soup  ',
				tags: ' quick , , vegan ',
				ingredients: [
					{ name: ' lentils ', measure: ' 200 g ' },
					{ name: '', measure: '' }
				],
				instructions: [' Rinse. ', '']
			})
		);
		expect(r.title).toBe('Lentil Soup');
		expect(r.tags).toEqual(['quick', 'vegan']);
		expect(r.ingredients).toEqual([{ name: 'lentils', measure: '200 g' }]);
		expect(r.instructions).toEqual(['Rinse.']);
	});

	it('uses undefined rather than empty strings for optional fields', () => {
		const r = draftToRecipe(goodDraft({ area: '', image: '', tags: '' }));
		expect(r.area).toBeUndefined();
		expect(r.image).toBeUndefined();
		expect(r.tags).toBeUndefined();
	});
});

describe('recipeToDraft', () => {
	it('round-trips through draftToRecipe', () => {
		const original = draftToRecipe(goodDraft());
		const back = draftToRecipe(recipeToDraft({ ...original, title: original.title }));
		expect(back).toEqual(original);
	});

	it('joins tags for a single text input', () => {
		expect(recipeToDraft({ title: 'x', tags: ['a', 'b'] }).tags).toBe('a, b');
	});

	it('supplies one blank row when the recipe has none', () => {
		const d = recipeToDraft({ title: 'x' });
		expect(d.ingredients).toEqual([{ name: '', measure: '' }]);
		expect(d.instructions).toEqual(['']);
	});

	it('turns a missing measure into an empty string for the input', () => {
		const d = recipeToDraft({ title: 'x', ingredients: [{ name: 'salt' }] });
		expect(d.ingredients[0].measure).toBe('');
	});
});
