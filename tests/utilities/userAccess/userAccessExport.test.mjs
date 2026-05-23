// tests/utilities/userAccess/userAccessExport.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { accessExportToCsv } from '../../../lib/utilities/userAccess/userAccessExport.js';

const user = (id, title, email) => ({ id, loginName: `${title}@x`, title, email });
const group = (id, title) => ({ id, loginName: `g-${id}`, title });
const list = (id, title) => ({ id, title, hidden: false });

describe('accessExportToCsv — Level 1 payload', () => {
  test('produces a CSV with sections for groups and direct list permissions', () => {
    const payload = {
      user: user(1, 'Alice', 'alice@x.com'),
      siteGroups: [group(10, 'Owners'), group(20, 'Members')],
      directListPermissions: [
        {
          list: list('L1', 'Docs'),
          source: 'Direct',
          roleDefinitions: [{ id: 1, name: 'Edit' }],
          permissionLevel: 'Member',
        },
      ],
    };
    const { filename, content } = accessExportToCsv(payload);
    assert.match(filename, /^user-access-alice@x-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.match(content, /^# User: Alice/m);
    assert.match(content, /^# Site Groups$/m);
    assert.match(content, /Owners/);
    assert.match(content, /Members/);
    assert.match(content, /^# Direct List Permissions$/m);
    assert.match(content, /Docs.*Direct.*Member/);
  });

  test('quotes fields containing commas or quotes', () => {
    const payload = {
      user: user(1, 'A, B', 'q"@x.com'),
      siteGroups: [],
      directListPermissions: [],
    };
    const { content } = accessExportToCsv(payload);
    assert.match(content, /"A, B"/);
    assert.match(content, /"q""@x.com"/);
  });
});

describe('accessExportToCsv — IAccessDiff payload', () => {
  test('produces three section blocks: Only A / Common / Only B', () => {
    const diff = {
      userA: user(1, 'Alice', 'a@x.com'),
      userB: user(2, 'Bob', 'b@x.com'),
      common: { groups: [group(20, 'Members')], directListPermissions: [] },
      onlyA: { groups: [group(10, 'Owners')], directListPermissions: [] },
      onlyB: { groups: [group(30, 'Visitors')], directListPermissions: [] },
    };
    const { filename, content } = accessExportToCsv(diff);
    assert.match(filename, /^user-access-diff-alice@x-vs-bob@x-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.match(content, /^# Only Alice — Groups$/m);
    assert.match(content, /^# Common — Groups$/m);
    assert.match(content, /^# Only Bob — Groups$/m);
    assert.match(content, /Owners/);
    assert.match(content, /Members/);
    assert.match(content, /Visitors/);
  });
});
