import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('ensureDevExtremeListSelection registers the DevExtreme List selection decorator', () => {
  const registryPath = require.resolve('devextreme/cjs/ui/list/ui.list.edit.decorator_registry');
  const selectionPath = require.resolve('devextreme/ui/list/modules/selection');
  const decoratorPath = require.resolve('devextreme/cjs/ui/list/ui.list.edit.decorator.selection');

  delete require.cache[selectionPath];
  delete require.cache[decoratorPath];
  delete require.cache[registryPath];

  const registry = require('devextreme/cjs/ui/list/ui.list.edit.decorator_registry');
  assert.equal(registry.registry.selection, undefined);

  const { ensureDevExtremeListSelection } = require('../../../lib/utilities/devextreme/ensureListSelection.js');
  ensureDevExtremeListSelection();

  assert.equal(typeof registry.registry.selection.default, 'function');
});
