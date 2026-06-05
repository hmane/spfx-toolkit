import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('legacy and asset package exports resolve for consumers', () => {
  const exportedPaths = [
    'spfx-toolkit/package.json',
    'spfx-toolkit/lib/utilities/batchBuilder',
    'spfx-toolkit/lib/components/VersionHistory/VersionHistory.css',
    'spfx-toolkit/utilities/context/pnpImports/core',
  ];

  for (const specifier of exportedPaths) {
    assert.doesNotThrow(() => require.resolve(specifier), specifier);
  }
});

