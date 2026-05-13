/**
 * Console usage guard.
 *
 * Runtime package code should publish diagnostics through SPContext.logger so
 * entries can flow into SPDebug via the logger bridge. A few bootstrap/debug
 * internals are allowed to write to console directly because they are the
 * logging/debug implementation or run before a logger can exist.
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

const ALLOWED_FILES = new Set([
  path.join(SRC, 'utilities', 'debug', 'SPDebug.ts'),
  path.join(SRC, 'utilities', 'context', 'modules', 'logger.ts'),
  path.join(SRC, 'utilities', 'context', 'core', 'context-manager.ts'),
]);

const SCANNED_DIRS = [
  path.join(SRC, 'components'),
  path.join(SRC, 'utilities'),
  path.join(SRC, 'hooks'),
];

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const CONSOLE_RE = /\bconsole\.(log|debug|info|warn|error)\s*\(/g;

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
    } else if (entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (match) => '\n'.repeat(match.split('\n').length - 1))
    .replace(/^\s*\/\/.*$/gm, '');
}

function lineForOffset(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

describe('isolation: package source uses SPContext.logger instead of console', () => {
  test('no direct console calls outside logger/debug bootstrap allowlist', async () => {
    const violations = [];

    for (const root of SCANNED_DIRS) {
      if (!(await isDir(root))) continue;

      for await (const file of walk(root)) {
        if (ALLOWED_FILES.has(file)) continue;

        const text = await readFile(file, 'utf8');
        const stripped = stripComments(text);
        let match;
        while ((match = CONSOLE_RE.exec(stripped)) !== null) {
          violations.push(`${path.relative(REPO_ROOT, file)}:${lineForOffset(stripped, match.index)}`);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      'Use SPContext.logger for package diagnostics. Direct console calls found:\n' +
        violations.map((v) => '  - ' + v).join('\n')
    );
  });
});
