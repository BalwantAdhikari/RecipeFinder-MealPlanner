import { describe, it, expect, vi } from 'vitest';
import { parseObjectProp, parseArrayProp, debounce } from './utils';

describe('parseObjectProp', () => {
  it('passes objects through untouched', () => {
    const input = { id: '1', title: 'Soup' };
    expect(parseObjectProp(input)).toBe(input);
  });

  it('parses a JSON string', () => {
    expect(parseObjectProp<{ id: string }>('{"id":"42"}')).toEqual({ id: '42' });
  });

  it('returns undefined for empty and nullish input', () => {
    expect(parseObjectProp(undefined)).toBeUndefined();
    expect(parseObjectProp(null)).toBeUndefined();
    expect(parseObjectProp('')).toBeUndefined();
  });

  it('returns undefined rather than throwing on malformed JSON', () => {
    expect(parseObjectProp('{not json')).toBeUndefined();
  });
});

describe('parseArrayProp', () => {
  it('parses a JSON array string', () => {
    expect(parseArrayProp<string>('["Beef","Chicken"]')).toEqual(['Beef', 'Chicken']);
  });

  it('passes arrays through', () => {
    expect(parseArrayProp(['a'])).toEqual(['a']);
  });

  it('collapses non-array values to an empty array', () => {
    expect(parseArrayProp('{"id":"1"}')).toEqual([]);
    expect(parseArrayProp(undefined)).toEqual([]);
    expect(parseArrayProp('nope')).toEqual([]);
  });
});

describe('debounce', () => {
  it('invokes once with the latest args after the delay', async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced('a');
    debounced('b');
    debounced('c');
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');

    vi.useRealTimers();
  });

  it('cancel prevents a pending invocation', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced('a');
    debounced.cancel();
    vi.advanceTimersByTime(500);

    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
