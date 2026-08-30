import { describe, it, expect } from 'vitest';
import {
	extractIngredients,
	extractInstructions,
	extractTags,
	normalizeFull,
	normalizePartial,
	type RawMealFull
} from './normalize';

/** Minimal raw record; individual tests add the fields they care about. */
function raw(over: Partial<RawMealFull> = {}): RawMealFull {
	return {
		idMeal: '52771',
		strMeal: 'Spicy Arrabiata Penne',
		strMealThumb: 'https://example.test/a.jpg',
		strCategory: 'Vegetarian',
		strArea: 'Italian',
		strTags: 'Pasta,Curry',
		strInstructions: 'Boil water.\r\nAdd pasta.',
		strYoutube: null,
		strSource: null,
		...over
	} as RawMealFull;
}

describe('extractIngredients', () => {
	it('zips ingredient and measure pairs', () => {
		const result = extractIngredients({
			strIngredient1: 'penne rigate',
			strMeasure1: '1 pound',
			strIngredient2: 'olive oil',
			strMeasure2: '1/4 cup'
		});
		expect(result).toEqual([
			{ name: 'penne rigate', measure: '1 pound' },
			{ name: 'olive oil', measure: '1/4 cup' }
		]);
	});

	it('skips null, empty and whitespace-only slots', () => {
		const result = extractIngredients({
			strIngredient1: 'salt',
			strMeasure1: '1 tsp',
			strIngredient2: '',
			strMeasure2: '',
			strIngredient3: null,
			strMeasure3: null,
			strIngredient4: '   ',
			strMeasure4: '   '
		});
		expect(result).toEqual([{ name: 'salt', measure: '1 tsp' }]);
	});

	it('omits measure when only the ingredient is present', () => {
		expect(extractIngredients({ strIngredient1: 'basil', strMeasure1: ' ' })).toEqual([
			{ name: 'basil' }
		]);
	});

	it('stops at 20 and ignores anything beyond', () => {
		const input: Record<string, string> = {};
		for (let i = 1; i <= 25; i++) input[`strIngredient${i}`] = `ing${i}`;
		expect(extractIngredients(input)).toHaveLength(20);
	});
});

describe('extractInstructions', () => {
	it('splits on CRLF and trims', () => {
		expect(extractInstructions('Boil water.\r\n  Add pasta.  \r\nDrain.')).toEqual([
			'Boil water.',
			'Add pasta.',
			'Drain.'
		]);
	});

	it('handles bare LF too', () => {
		expect(extractInstructions('One.\nTwo.')).toEqual(['One.', 'Two.']);
	});

	it('drops blank lines', () => {
		expect(extractInstructions('One.\r\n\r\n\r\nTwo.')).toEqual(['One.', 'Two.']);
	});

	it('strips leading numbering the source already includes', () => {
		// The UI numbers the list itself; without this the user sees "1. 1. Boil".
		expect(extractInstructions('1. Boil water.\r\n2) Add pasta.\r\nSTEP 3. Drain.')).toEqual([
			'Boil water.',
			'Add pasta.',
			'Drain.'
		]);
	});

	it('does not mangle a step that merely starts with a number word', () => {
		expect(extractInstructions('200g of flour, sifted.')).toEqual(['200g of flour, sifted.']);
	});

	it('returns an empty array for null or empty input', () => {
		expect(extractInstructions(null)).toEqual([]);
		expect(extractInstructions('')).toEqual([]);
		expect(extractInstructions('   ')).toEqual([]);
	});
});

describe('extractTags', () => {
	it('splits a comma-joined string', () => {
		expect(extractTags('Pasta,Curry')).toEqual(['Pasta', 'Curry']);
	});

	it('trims and drops empties', () => {
		expect(extractTags(' Pasta , , Curry ')).toEqual(['Pasta', 'Curry']);
	});

	it('returns undefined rather than an empty array when absent', () => {
		expect(extractTags(null)).toBeUndefined();
		expect(extractTags('')).toBeUndefined();
		expect(extractTags(',,')).toBeUndefined();
	});
});

describe('normalizeFull', () => {
	it('maps a complete record', () => {
		const r = normalizeFull(
			raw({ strIngredient1: 'penne', strMeasure1: '1 lb' } as Partial<RawMealFull>)
		);
		expect(r).toMatchObject({
			id: '52771',
			title: 'Spicy Arrabiata Penne',
			image: 'https://example.test/a.jpg',
			category: 'Vegetarian',
			area: 'Italian',
			tags: ['Pasta', 'Curry'],
			instructions: ['Boil water.', 'Add pasta.'],
			source: 'api'
		});
		expect(r.ingredients).toEqual([{ name: 'penne', measure: '1 lb' }]);
	});

	it('leaves optional fields undefined rather than empty strings', () => {
		const r = normalizeFull(
			raw({ strMealThumb: null, strCategory: '', strArea: '  ', strTags: null })
		);
		expect(r.image).toBeUndefined();
		expect(r.category).toBeUndefined();
		expect(r.area).toBeUndefined();
		expect(r.tags).toBeUndefined();
	});
});

describe('normalizePartial', () => {
	it('carries the requested category through, since filter.php omits it', () => {
		const r = normalizePartial(
			{ idMeal: '1', strMeal: 'Fish', strMealThumb: null, strArea: 'Japanese' },
			{ category: 'Seafood' }
		);
		expect(r).toEqual({
			id: '1',
			title: 'Fish',
			image: undefined,
			category: 'Seafood',
			area: 'Japanese',
			source: 'api'
		});
	});

	it('prefers the response area over the requested one', () => {
		const r = normalizePartial(
			{ idMeal: '1', strMeal: 'Fish', strMealThumb: null, strArea: 'Japanese' },
			{ area: 'Italian' }
		);
		expect(r.area).toBe('Japanese');
	});

	it('falls back to the requested area when the response omits it', () => {
		const r = normalizePartial(
			{ idMeal: '1', strMeal: 'Fish', strMealThumb: null },
			{ area: 'Thai' }
		);
		expect(r.area).toBe('Thai');
	});

	it('omits ingredients and instructions — those need a lookup', () => {
		const r = normalizePartial({ idMeal: '1', strMeal: 'Fish', strMealThumb: null });
		expect(r.ingredients).toBeUndefined();
		expect(r.instructions).toBeUndefined();
	});
});
