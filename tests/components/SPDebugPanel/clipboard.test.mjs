import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { downloadText } from '../../../lib/components/SPDebugPanel/clipboard.js';

describe('downloadText', () => {
  test('returns false when document is undefined', () => {
    const hadDoc = 'document' in globalThis;
    const prevDoc = globalThis.document;
    if (hadDoc) delete globalThis.document;
    const ok = downloadText('f.md', 'hi', 'text/markdown');
    assert.equal(ok, false);
    if (hadDoc) globalThis.document = prevDoc;
  });

  test('creates an anchor, clicks it, and returns true', () => {
    let clicked = false;
    const anchor = { href: '', download: '', style: {}, click() { clicked = true; } };
    const prevDoc = globalThis.document;
    const prevURL = globalThis.URL;
    const prevBlob = globalThis.Blob;

    globalThis.document = {
      createElement: () => anchor,
      body: { appendChild() {}, removeChild() {} },
    };
    globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
    globalThis.Blob = class { constructor() {} };

    try {
      const ok = downloadText('spdebug.json', '{}', 'application/json');
      assert.equal(ok, true);
      assert.equal(clicked, true);
      assert.equal(anchor.download, 'spdebug.json');
    } finally {
      globalThis.document = prevDoc;
      globalThis.URL = prevURL;
      globalThis.Blob = prevBlob;
    }
  });
});
