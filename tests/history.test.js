import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage in Node environment
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
};

import { addToHistory, getHistory, HISTORY_KEY, MAX_HISTORY } from '../admin/history.js';

beforeEach(() => {
  // Clear storage before each test
  delete storage[HISTORY_KEY];
});

describe('link history', () => {
  it('addToHistory stores entry and getHistory returns it', () => {
    addToHistory({ url: 'http://x.com?d=abc', candidateName: 'Jane', districtKey: 'raleigh-nc', generatedAt: 1000 });
    const h = getHistory();
    expect(h[0].candidateName).toBe('Jane');
  });

  it('addToHistory persists to localStorage', () => {
    addToHistory({ url: 'http://x.com?d=abc', candidateName: 'Jane', districtKey: 'raleigh-nc', generatedAt: 1000 });
    const raw = storage[HISTORY_KEY];
    expect(raw).toContain('Jane');
  });

  it('newer entries appear first (newest-first ordering)', () => {
    addToHistory({ url: 'http://x.com?d=1', candidateName: 'Alice', districtKey: 'raleigh-nc', generatedAt: 1000 });
    addToHistory({ url: 'http://x.com?d=2', candidateName: 'Bob', districtKey: 'el-paso-tx', generatedAt: 2000 });
    expect(getHistory()[0].candidateName).toBe('Bob');
  });

  it('caps history at MAX_HISTORY (50) entries', () => {
    for (let i = 0; i < 51; i++) {
      addToHistory({ url: `http://x.com?d=${i}`, candidateName: `Candidate ${i}`, districtKey: 'raleigh-nc', generatedAt: i });
    }
    expect(getHistory().length).toBe(MAX_HISTORY);
  });

  it('getHistory returns empty array when localStorage is empty', () => {
    expect(getHistory()).toEqual([]);
  });
});
