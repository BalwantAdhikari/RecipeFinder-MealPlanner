/**
 * Live integration check against the real TheMealDB.
 * Kept out of the repo test suite: it needs network and would make CI flaky.
 */
import { describe, it, expect } from 'vitest';
import { discover, lookupById, listCategories, searchByName } from './themealdb';

const f = globalThis.fetch;

describe('live TheMealDB', () => {
	it('searchByName returns normalized full records', async () => {
		const r = await searchByName(f, 'arrabiata');
		expect(r).toHaveLength(1);
		expect(r[0].title).toBe('Spicy Arrabiata Penne');
		expect(r[0].ingredients!.length).toBeGreaterThan(3);
		expect(r[0].instructions!.length).toBeGreaterThan(1);
		expect(r[0].source).toBe('api');
	});

	it('empty query gives the default browse set', async () => {
		const r = await discover(f, '', {});
		expect(r.length).toBeGreaterThan(10);
	});

	it('no-match returns an empty array, not null', async () => {
		expect(await searchByName(f, 'zzzzqqqnope')).toEqual([]);
	});

	it('single category filter works and carries the category through', async () => {
		const r = await discover(f, '', { category: 'Seafood' });
		expect(r.length).toBeGreaterThan(10);
		expect(r.every((x) => x.category === 'Seafood')).toBe(true);
	});

	it('category + area intersects correctly (API cannot do both)', async () => {
		const [cat, area, both] = await Promise.all([
			discover(f, '', { category: 'Seafood' }),
			discover(f, '', { area: 'Italian' }),
			discover(f, '', { category: 'Seafood', area: 'Italian' })
		]);
		const expected = new Set(
			cat.map((c) => c.id).filter((id) => new Set(area.map((a) => a.id)).has(id))
		);
		expect(new Set(both.map((b) => b.id))).toEqual(expected);
		expect(both.length).toBeGreaterThan(0);
		expect(both.every((b) => b.category === 'Seafood' && b.area === 'Italian')).toBe(true);
	});

	it('query + filter narrows in memory', async () => {
		const r = await discover(f, 'chicken', { area: 'Japanese' });
		expect(r.every((x) => x.area === 'Japanese')).toBe(true);
	});

	it('lookupById returns full detail; unknown id returns null', async () => {
		const r = await lookupById(f, '52771');
		expect(r?.title).toBe('Spicy Arrabiata Penne');
		expect(await lookupById(f, '999999')).toBeNull();
	});

	it('listCategories returns 14 sorted categories', async () => {
		const c = await listCategories(f);
		expect(c).toHaveLength(14);
		expect(c).toEqual([...c].sort((a, b) => a.localeCompare(b)));
	});
});
