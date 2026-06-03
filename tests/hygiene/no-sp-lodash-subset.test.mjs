import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const NEEDLE = '@microsoft/sp-lodash-subset';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

test('no source file references @microsoft/sp-lodash-subset (zero SPFx framework runtime imports)', () => {
  const offenders = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes(NEEDLE));
  assert.deepEqual(
    offenders,
    [],
    `These src files still reference ${NEEDLE} (use ../utilities/internal/isEqual instead):\n` +
      offenders.join('\n')
  );
});
