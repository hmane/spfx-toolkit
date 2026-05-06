/**
 * Isolation regression test.
 *
 * Per `docs/SPDebug-Requirements.md` "Prime Directive: Disabled Cost and
 * Coupling", toolkit components and utilities must NOT import:
 *
 *   - `utilities/debug`
 *   - `components/debug`
 *   - `components/SPDebugPanel`
 *
 * The only v1 bridge from toolkit internals to SPDebug is the logger sink.
 * If a future change accidentally imports the debug runtime from a
 * non-debug surface, this test fails fast.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO_ROOT, 'src');

// Folders that ARE allowed to import the debug runtime — they ARE the runtime.
const ALLOWED_DEBUG_OWNERS = [
  path.join(SRC, 'utilities', 'debug'),
  path.join(SRC, 'components', 'debug'),
  path.join(SRC, 'components', 'SPDebugPanel'),
];

const SCANNED_DIRS = [
  path.join(SRC, 'components'),
  path.join(SRC, 'utilities'),
  path.join(SRC, 'hooks'),
];

const FORBIDDEN_PATTERNS = [
  /\bfrom\s+['"][^'"]*\butilities\/debug(\b|\/)/,
  /\bfrom\s+['"][^'"]*\bcomponents\/debug(\b|\/)/,
  /\bfrom\s+['"][^'"]*\bcomponents\/SPDebugPanel(\b|\/)/,
  /\brequire\(\s*['"][^'"]*\butilities\/debug(\b|\/)/,
  /\brequire\(\s*['"][^'"]*\bcomponents\/debug(\b|\/)/,
  /\brequire\(\s*['"][^'"]*\bcomponents\/SPDebugPanel(\b|\/)/,
];

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

async function isDir(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === '__tests__') {
        continue;
      }
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SOURCE_EXTS.has(ext)) yield full;
    }
  }
}

function isInsideAllowedOwner(file) {
  return ALLOWED_DEBUG_OWNERS.some((root) => file.startsWith(root + path.sep));
}

describe('isolation: toolkit surface does not import the debug runtime', () => {
  test('no forbidden imports from any non-debug source file', async () => {
    const violations = [];
    for (const root of SCANNED_DIRS) {
      if (!(await isDir(root))) continue;
      for await (const file of walk(root)) {
        if (isInsideAllowedOwner(file)) continue;
        const text = await readFile(file, 'utf8');
        for (const re of FORBIDDEN_PATTERNS) {
          const m = text.match(re);
          if (m) {
            violations.push({
              file: path.relative(REPO_ROOT, file),
              snippet: m[0],
            });
            break;
          }
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      'Toolkit components/utilities/hooks must not import utilities/debug, ' +
        'components/debug, or components/SPDebugPanel. Use SPContext.logger ' +
        'and the logger sink bridge instead. Violations:\n' +
        violations.map((v) => '  - ' + v.file + ': ' + v.snippet).join('\n')
    );
  });

  test('package.json does not export components/SPDebugPanel', async () => {
    const pkg = JSON.parse(
      await readFile(path.join(REPO_ROOT, 'package.json'), 'utf8')
    );
    const exportKeys = Object.keys(pkg.exports || {});
    const offenders = exportKeys.filter((k) =>
      /SPDebugPanel/i.test(k)
    );
    assert.deepEqual(
      offenders,
      [],
      'components/SPDebugPanel is not a public v1 export per spec.'
    );
  });
});
