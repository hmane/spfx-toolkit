import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseSource,
  emptyFilters,
  entryMatches,
  filterEntries,
  shouldRequireReview,
  loadPanelPrefs,
  savePanelPrefs,
  clampRightWidth,
  clampBottomHeight,
  formatDuration,
  formatBytes,
  relTime,
  DEFAULT_PANEL_PREFS,
  PREFS_STORAGE_KEY,
  RIGHT_WIDTH_MIN,
  RIGHT_WIDTH_MAX,
  BOTTOM_HEIGHT_MIN,
  BOTTOM_HEIGHT_MAX,
} from '../../../lib/components/SPDebugPanel/panelLogic.js';

function makeEntry(overrides = {}) {
  return {
    id: 'e_' + Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    type: 'log',
    level: 'info',
    source: 'App/Save',
    message: 'clicked',
    data: undefined,
    bytes: 0,
    ...overrides,
  };
}

describe('parseSource', () => {
  test('splits on first slash', () => {
    assert.deepEqual(parseSource('Toolkit/SPDynamicForm'), {
      area: 'Toolkit',
      detail: 'SPDynamicForm',
    });
  });
  test('keeps deeper detail intact', () => {
    assert.deepEqual(parseSource('App/Save/Button'), {
      area: 'App',
      detail: 'Save/Button',
    });
  });
  test('no slash → Other / source', () => {
    assert.deepEqual(parseSource('LoneSource'), { area: 'Other', detail: 'LoneSource' });
  });
  test('empty string is handled', () => {
    assert.deepEqual(parseSource(''), { area: 'Other', detail: '' });
  });
});

describe('entryMatches', () => {
  test('empty filters match everything', () => {
    assert.equal(entryMatches(makeEntry(), emptyFilters()), true);
  });
  test('search matches message', () => {
    const f = { ...emptyFilters(), search: 'click' };
    assert.equal(entryMatches(makeEntry({ message: 'clicked' }), f), true);
    assert.equal(entryMatches(makeEntry({ message: 'opened' }), f), false);
  });
  test('search is case-insensitive and scans source', () => {
    const f = { ...emptyFilters(), search: 'TOOLKIT' };
    assert.equal(
      entryMatches(makeEntry({ source: 'Toolkit/SPDynamicForm', message: 'x' }), f),
      true
    );
  });
  test('search scans payload data', () => {
    const f = { ...emptyFilters(), search: 'invoice-42' };
    assert.equal(
      entryMatches(makeEntry({ data: { id: 'invoice-42' }, message: 'x' }), f),
      true
    );
  });
  test('level filter matches selected levels', () => {
    const f = { ...emptyFilters(), levels: ['warn', 'error'] };
    assert.equal(entryMatches(makeEntry({ level: 'warn' }), f), true);
    assert.equal(entryMatches(makeEntry({ level: 'info' }), f), false);
  });
  test('type filter matches selected types', () => {
    const f = { ...emptyFilters(), types: ['error'] };
    assert.equal(entryMatches(makeEntry({ type: 'error' }), f), true);
    assert.equal(entryMatches(makeEntry({ type: 'log' }), f), false);
  });
  test('area filter matches by parsed area', () => {
    const f = { ...emptyFilters(), areas: ['Site'] };
    assert.equal(entryMatches(makeEntry({ source: 'Site/hr' }), f), true);
    assert.equal(entryMatches(makeEntry({ source: 'App/Save' }), f), false);
  });
  test('errorsOnly keeps only error level OR error type', () => {
    const f = { ...emptyFilters(), errorsOnly: true };
    assert.equal(entryMatches(makeEntry({ level: 'info', type: 'log' }), f), false);
    assert.equal(entryMatches(makeEntry({ level: 'error', type: 'log' }), f), true);
    assert.equal(entryMatches(makeEntry({ level: 'info', type: 'error' }), f), true);
  });
  test('multiple filters AND together', () => {
    const f = { ...emptyFilters(), levels: ['error'], areas: ['App'] };
    assert.equal(entryMatches(makeEntry({ level: 'error', source: 'App/X' }), f), true);
    assert.equal(entryMatches(makeEntry({ level: 'error', source: 'Site/hr' }), f), false);
    assert.equal(entryMatches(makeEntry({ level: 'info', source: 'App/X' }), f), false);
  });
});

describe('filterEntries', () => {
  test('returns matching subset', () => {
    const entries = [
      makeEntry({ level: 'info', message: 'a' }),
      makeEntry({ level: 'warn', message: 'b' }),
      makeEntry({ level: 'error', message: 'c' }),
    ];
    const out = filterEntries(entries, { ...emptyFilters(), errorsOnly: true });
    assert.equal(out.length, 1);
    assert.equal(out[0].message, 'c');
  });
});

describe('shouldRequireReview', () => {
  test('always → true regardless of env', () => {
    assert.equal(shouldRequireReview('always', 'dev'), true);
    assert.equal(shouldRequireReview('always', 'prod'), true);
    assert.equal(shouldRequireReview('always', undefined), true);
  });
  test('never → false regardless of env', () => {
    assert.equal(shouldRequireReview('never', 'dev'), false);
    assert.equal(shouldRequireReview('never', 'prod'), false);
  });
  test('production → true only in prod', () => {
    assert.equal(shouldRequireReview('production', 'dev'), false);
    assert.equal(shouldRequireReview('production', 'uat'), false);
    assert.equal(shouldRequireReview('production', 'prod'), true);
    assert.equal(shouldRequireReview('production', undefined), false);
  });
});

describe('clamping', () => {
  test('right width clamps to spec range', () => {
    assert.equal(clampRightWidth(0), RIGHT_WIDTH_MIN);
    assert.equal(clampRightWidth(99999), RIGHT_WIDTH_MAX);
    assert.equal(clampRightWidth(500), 500);
  });
  test('bottom height clamps to spec range', () => {
    assert.equal(clampBottomHeight(0), BOTTOM_HEIGHT_MIN);
    assert.equal(clampBottomHeight(99999), BOTTOM_HEIGHT_MAX);
    assert.equal(clampBottomHeight(300), 300);
  });
  test('NaN falls back to default', () => {
    assert.equal(clampRightWidth(NaN), DEFAULT_PANEL_PREFS.rightWidth);
    assert.equal(clampBottomHeight(NaN), DEFAULT_PANEL_PREFS.bottomHeight);
  });
});

describe('formatters', () => {
  test('formatDuration', () => {
    assert.equal(formatDuration(450), '450ms');
    assert.equal(formatDuration(1500), '1s');
    assert.equal(formatDuration(75 * 1000), '1m 15s');
  });
  test('formatBytes', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(2048), '2.0 KB');
    assert.match(formatBytes(2 * 1024 * 1024), /^2\.00 MB$/);
  });
  test('relTime', () => {
    const t0 = 1_000_000;
    assert.equal(relTime(1_000_500, t0), '+500ms');
    assert.match(relTime(1_002_500, t0), /^\+2\.50s$/);
  });
});

describe('panel prefs persistence', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = globalThis.window;
    const map = new Map();
    globalThis.window = {
      sessionStorage: {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, v),
        removeItem: (k) => map.delete(k),
      },
    };
  });
  afterEach(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });

  test('returns defaults when nothing is stored', () => {
    assert.deepEqual(loadPanelPrefs(), DEFAULT_PANEL_PREFS);
  });

  test('round-trip save → load', () => {
    const next = {
      dock: 'bottom',
      rightWidth: 600,
      bottomHeight: 280,
      selectedTab: 'settings',
    };
    savePanelPrefs(next);
    assert.deepEqual(loadPanelPrefs(), next);
  });

  test('clamps absurd persisted sizes on load', () => {
    globalThis.window.sessionStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ dock: 'right', rightWidth: 99999, bottomHeight: 5, selectedTab: 'x' })
    );
    const got = loadPanelPrefs();
    assert.equal(got.rightWidth, RIGHT_WIDTH_MAX);
    assert.equal(got.bottomHeight, BOTTOM_HEIGHT_MIN);
    assert.equal(got.selectedTab, DEFAULT_PANEL_PREFS.selectedTab);
  });

  test('migrates old tab names to simplified groups', () => {
    globalThis.window.sessionStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ dock: 'right', rightWidth: 600, bottomHeight: 300, selectedTab: 'tables' })
    );
    assert.equal(loadPanelPrefs().selectedTab, 'data');

    globalThis.window.sessionStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ dock: 'right', rightWidth: 600, bottomHeight: 300, selectedTab: 'context' })
    );
    assert.equal(loadPanelPrefs().selectedTab, 'settings');

    globalThis.window.sessionStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ dock: 'right', rightWidth: 600, bottomHeight: 300, selectedTab: 'errors' })
    );
    assert.equal(loadPanelPrefs().selectedTab, 'console');
  });

  test('falls back to defaults if storage holds garbage', () => {
    globalThis.window.sessionStorage.setItem(PREFS_STORAGE_KEY, 'not json');
    assert.deepEqual(loadPanelPrefs(), DEFAULT_PANEL_PREFS);
  });

  test('savePanelPrefs is silent if sessionStorage throws', () => {
    globalThis.window = {
      sessionStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
        removeItem: () => {},
      },
    };
    assert.doesNotThrow(() => savePanelPrefs(DEFAULT_PANEL_PREFS));
  });

  test('loadPanelPrefs is silent if sessionStorage throws', () => {
    globalThis.window = {
      sessionStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {},
        removeItem: () => {},
      },
    };
    assert.deepEqual(loadPanelPrefs(), DEFAULT_PANEL_PREFS);
  });
});
