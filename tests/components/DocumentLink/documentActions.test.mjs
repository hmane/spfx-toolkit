import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { openUrlInNewTab, buildPreviewUrl } from '../../../lib/components/DocumentLink/utils/index.js';

const originalWindow = global.window;

function makeDocument(overrides = {}) {
  return {
    id: 1,
    uniqueId: 'doc-1',
    name: 'Report.docx',
    title: 'Report',
    url: 'https://contoso.sharepoint.com/sites/demo/Shared%20Documents/Report.docx',
    serverRelativeUrl: '/sites/demo/Shared Documents/Report.docx',
    size: 1024,
    fileType: 'docx',
    created: new Date('2026-01-01T00:00:00Z'),
    createdBy: { id: 1, email: '', title: '', loginName: '' },
    modified: new Date('2026-01-01T00:00:00Z'),
    modifiedBy: { id: 1, email: '', title: '', loginName: '' },
    libraryName: 'Documents',
    listId: 'list-1',
    version: '1.0',
    ...overrides,
  };
}

afterEach(() => {
  global.window = originalWindow;
});

describe('openUrlInNewTab', () => {
  test('opens one new tab without noopener features that can cause a false null return', () => {
    const openedWindow = { opener: {} };
    const calls = [];
    global.window = {
      open: (...args) => {
        calls.push(args);
        return openedWindow;
      },
      location: { href: 'about:blank' },
    };

    const document = makeDocument();
    openUrlInNewTab(buildPreviewUrl(document.url, 'view', document.serverRelativeUrl));

    assert.equal(calls.length, 1);
    assert.equal(calls[0][1], '_blank');
    assert.equal(calls[0][2], undefined);
    assert.equal(openedWindow.opener, null);
    assert.equal(global.window.location.href, 'about:blank');
  });

  test('falls back to same-tab navigation only when no window handle is returned', () => {
    global.window = {
      open: () => null,
      location: { href: 'about:blank' },
    };

    const document = makeDocument({ url: 'https://contoso.sharepoint.com/sites/demo/file.pdf' });
    openUrlInNewTab(buildPreviewUrl(document.url, 'view', document.serverRelativeUrl));

    assert.equal(global.window.location.href, 'https://contoso.sharepoint.com/sites/demo/file.pdf?web=1');
  });
});

describe('DocumentLink rendered anchor', () => {
  test('opts out of SharePoint modern-page click interception', () => {
    const source = fs.readFileSync('src/components/DocumentLink/DocumentLink.tsx', 'utf8');

    assert.match(source, /data-interception="off"/);
  });
});
