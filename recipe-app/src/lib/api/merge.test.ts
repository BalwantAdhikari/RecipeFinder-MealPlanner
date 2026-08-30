import { describe, it, expect } from 'vitest';
import { filterLocal, mergeResults } from './merge';
import type { Recipe } from 'recipe-ui-components';

const mine: Recipe[] = [
	{ id: 'user-1', title: 'Grandma Lentil Soup', category: 'Soup', area: 'India', source: 'user' },
	{ id: 'user-2', title: 'Quick Pasta Bake', category: 'Pasta', area: 'Italian', source: 'user' }
];

describe('filterLocal', () => {
	it('matches the title case-insensitively', () => {
		expect(filterLocal(mine, 'pasta', {}).map((r) => r.id)).toEqual(['user-2']);
		expect(filterLocal(mine, 'PASTA', {}).map((r) => r.id)).toEqual(['user-2']);
	});

	it('matches on a substring, like the API does', () => {
		expect(filterLocal(mine, 'lentil', {}).map((r) => r.id)).toEqual(['user-1']);
	});

	it('returns everything for an empty or whitespace query', () => {
		expect(filterLocal(mine, '', {})).toHaveLength(2);
		expect(filterLocal(mine, '   ', {})).toHaveLength(2);
	});

	it('applies category and area filters', () => {
		expect(filterLocal(mine, '', { category: 'Soup' }).map((r) => r.id)).toEqual(['user-1']);
		expect(filterLocal(mine, '', { area: 'Italian' }).map((r) => r.id)).toEqual(['user-2']);
	});

	it('requires all criteria to hold at once', () => {
		expect(filterLocal(mine, 'pasta', { category: 'Soup' })).toEqual([]);
		expect(filterLocal(mine, 'pasta', { category: 'Pasta', area: 'Italian' })).toHaveLength(1);
	});
});

describe('mergeResults', () => {
	const remote: Recipe[] = [
		{ id: '52771', title: 'Spicy Arrabiata Penne', source: 'api' },
		{ id: '52772', title: 'Teriyaki Chicken', source: 'api' }
	];

	it('puts user recipes first', () => {
		expect(mergeResults(mine, remote).map((r) => r.id)).toEqual([
			'user-1',
			'user-2',
			'52771',
			'52772'
		]);
	});

	it('de-duplicates by id, preferring the local copy', () => {
		const clash: Recipe[] = [{ id: 'user-1', title: 'Remote version', source: 'api' }];
		const merged = mergeResults(mine, clash);
		expect(merged).toHaveLength(2);
		expect(merged.find((r) => r.id === 'user-1')?.title).toBe('Grandma Lentil Soup');
	});

	it('handles either side being empty', () => {
		expect(mergeResults([], remote)).toHaveLength(2);
		expect(mergeResults(mine, [])).toHaveLength(2);
		expect(mergeResults([], [])).toEqual([]);
	});
});
