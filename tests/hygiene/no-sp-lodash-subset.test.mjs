import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const FORBIDDEN_IMPORTS = [
  {
    name: '@microsoft/sp-lodash-subset',
    reason: 'use src/utilities/internal/isEqual instead',
  },
  {
    name: '@microsoft/sp-loader',
    reason: 'avoid indirectly forcing @microsoft/sp-lodash-subset in form customizers',
  },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

test('no source file references SPFx framework libraries that trigger sp-lodash-subset loading', () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const content = readFileSync(file, 'utf8');
    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (content.includes(forbidden.name)) {
        offenders.push(`${file}: ${forbidden.name} (${forbidden.reason})`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'These src files still reference libraries that can trigger @microsoft/sp-lodash-subset:\n' +
      offenders.join('\n')
  );
});
