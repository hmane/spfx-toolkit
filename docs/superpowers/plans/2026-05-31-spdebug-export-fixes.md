# SPDebug Export & Download Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the SPDebug panel export include the actual captured data (table rows, entry JSON payloads, metrics, trace step data) and make download reliable, with full-fidelity JSON as a downloadable/copyable artifact and visible failure feedback.

**Architecture:** Three layers change independently. (1) `exportSession.ts` emits already-capture-truncated data into the Markdown report, with a render-row cap. (2) `clipboard.ts` `downloadText` becomes a boolean-returning, race-fixed helper. (3) `DebugExportDialog.tsx` adds JSON copy/download and an inline failure MessageBar. The lossless `export.json()` content is unchanged.

**Tech Stack:** TypeScript, React 17, Fluent UI 8 (tree-shaken imports), Node native test runner (`node --test`) against compiled `lib/` output.

---

## File Structure

- **Modify** `src/utilities/debug/exportSession.ts` — render table rows, entry payloads, a new Metrics section, and trace step data; add a `MAX_TABLE_ROWS_RENDERED` constant and two private helpers.
- **Modify** `src/components/SPDebugPanel/clipboard.ts` — `downloadText` returns `boolean`, fix the `revokeObjectURL` race, `unref` the timer so tests don't hang.
- **Modify** `src/components/SPDebugPanel/components/DebugExportDialog.tsx` — JSON copy/download buttons + inline failure MessageBar.
- **Create** `tests/utilities/debug/exportData.test.mjs` — data-inclusion assertions on `export.markdown()` + a JSON round-trip guard.
- **Create** `tests/components/SPDebugPanel/clipboard.test.mjs` — `downloadText` boolean behavior with a stubbed DOM.

**Build/test note:** tests import from `../../../lib/...` (compiled output), so every "run the test" step builds first. The single-file run command is:
`npm run build && node --test --test-reporter=spec <test-file>`

---

## Task 1: Render entry JSON payloads in grouped-by-source section

**Files:**
- Modify: `src/utilities/debug/exportSession.ts` (grouped-by-source block, currently lines 219-241)
- Test: `tests/utilities/debug/exportData.test.mjs` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/utilities/debug/exportData.test.mjs`:

```js
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SPDebug } from '../../../lib/utilities/debug/index.js';

describe('SPDebug.export — data inclusion', () => {
  beforeEach(() => SPDebug.reset());

  test('entry json payloads are rendered in grouped-by-source section', () => {
    SPDebug.enable();
    SPDebug.json('PayloadKey', { status: 'Draft', id: 42 }, { source: 'App/Save' });
    const md = SPDebug.export.markdown();
    assert.match(md, /PayloadKey/);
    assert.match(md, /"status": "Draft"/);
    assert.match(md, /"id": 42/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: FAIL — `"status": "Draft"` is not present (only the `PayloadKey` message is emitted today).

- [ ] **Step 3: Implement payload rendering**

In `src/utilities/debug/exportSession.ts`, the grouped-by-source loop currently ends each source group like this:

```typescript
      for (const entry of group.entries) {
        const dt = entry.timestamp - t0;
        const cells = [
          '| ' + dt,
          entry.level,
          entry.type,
          escapeCell(entry.message),
        ].join(' | ');
        lines.push(cells + ' |');
      }
      lines.push('');
    }
  }
```

Replace that block with (adds a payloads sub-section after the table for each source):

```typescript
      for (const entry of group.entries) {
        const dt = entry.timestamp - t0;
        const cells = [
          '| ' + dt,
          entry.level,
          entry.type,
          escapeCell(entry.message),
        ].join(' | ');
        lines.push(cells + ' |');
      }
      lines.push('');
      const withData = group.entries.filter((en) => en.data !== undefined);
      for (const en of withData) {
        const dt = en.timestamp - t0;
        lines.push('**+' + dt + 'ms · ' + escapeCell(en.message) + '**');
        lines.push('');
        lines.push('```json');
        lines.push(safeJson(en.data));
        lines.push('```');
        lines.push('');
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utilities/debug/exportSession.ts tests/utilities/debug/exportData.test.mjs
git commit -m "fix(spdebug): render entry json payloads in markdown export"
```

---

## Task 2: Render table rows (provided + inferred columns) with a row cap

**Files:**
- Modify: `src/utilities/debug/exportSession.ts` (module constant + helpers near top; Tables block, currently lines 266-287)
- Test: `tests/utilities/debug/exportData.test.mjs` (append)

- [ ] **Step 1: Write the failing tests**

Append inside the `describe(...)` block in `tests/utilities/debug/exportData.test.mjs`:

```js
  test('table rows are rendered as a markdown table using provided columns', () => {
    SPDebug.enable();
    SPDebug.table(
      'Results',
      [{ id: 1, title: 'Alpha' }, { id: 2, title: 'Beta' }],
      {
        source: 'Service/Search',
        columns: [{ key: 'id', label: 'ID' }, { key: 'title', label: 'Title' }],
      }
    );
    const md = SPDebug.export.markdown();
    assert.match(md, /\| ID \| Title \|/);
    assert.match(md, /\| 1 \| Alpha \|/);
    assert.match(md, /\| 2 \| Beta \|/);
  });

  test('table rows render with inferred columns when none provided', () => {
    SPDebug.enable();
    SPDebug.table('Rows', [{ name: 'x', count: 5 }]);
    const md = SPDebug.export.markdown();
    assert.match(md, /\| name \| count \|/);
    assert.match(md, /\| x \| 5 \|/);
  });

  test('large tables are capped with a "more rows" marker', () => {
    SPDebug.enable();
    const rows = Array.from({ length: 60 }, (_, i) => ({ i }));
    SPDebug.table('Big', rows);
    const md = SPDebug.export.markdown();
    assert.match(md, /… 10 more rows — see JSON export for full data/);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: FAIL — the three new tests fail (only the summary row `| Results | Service/Search | 2 |` is emitted today; no row data).

- [ ] **Step 3: Add the constant and helpers**

In `src/utilities/debug/exportSession.ts`, immediately after the imports (before `function snapshotState`), add:

```typescript
/** Max table rows rendered inline in the Markdown report. Full data is in the JSON export. */
const MAX_TABLE_ROWS_RENDERED = 50;
```

Then, just after the `safeJson` helper definition, add these two private helpers:

```typescript
function tableColumnsFor(
  tbl: SPDebugTable
): ReadonlyArray<{ key: string; label: string }> | null {
  if (tbl.columns && tbl.columns.length > 0) {
    return tbl.columns.map((c) => ({ key: c.key, label: c.label || c.key }));
  }
  const first = tbl.rows.find(
    (r) => r !== null && typeof r === 'object' && !Array.isArray(r)
  );
  if (first) {
    return Object.keys(first as Record<string, unknown>).map((k) => ({ key: k, label: k }));
  }
  return null;
}

function pushTableRows(lines: string[], tbl: SPDebugTable): void {
  lines.push(
    '### ' +
      escapeCell(tbl.key) +
      '   _(' +
      tbl.source +
      ' · ' +
      tbl.rows.length +
      ' rows · ' +
      fmtBytes(tbl.bytes) +
      ')_'
  );
  lines.push('');
  const cols = tableColumnsFor(tbl);
  const shown = tbl.rows.slice(0, MAX_TABLE_ROWS_RENDERED);
  if (cols) {
    lines.push('| ' + cols.map((c) => escapeCell(c.label)).join(' | ') + ' |');
    lines.push('|' + cols.map(() => '---').join('|') + '|');
    for (const row of shown) {
      const r = (row !== null && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      lines.push('| ' + cols.map((c) => escapeCell(r[c.key])).join(' | ') + ' |');
    }
  } else {
    lines.push('```json');
    lines.push(safeJson(shown));
    lines.push('```');
  }
  if (tbl.rows.length > MAX_TABLE_ROWS_RENDERED) {
    lines.push('');
    lines.push(
      '_… ' +
        (tbl.rows.length - MAX_TABLE_ROWS_RENDERED) +
        ' more rows — see JSON export for full data_'
    );
  }
  lines.push('');
}
```

- [ ] **Step 4: Render the detail sections after the summary table**

In the Tables block (`// ---- 7. Tables ----`), the summary table currently ends with:

```typescript
    }
    lines.push('');
  }
```

Replace that closing with (keeps the summary table, then renders per-table detail):

```typescript
    }
    lines.push('');
    for (const tbl of e.tables) pushTableRows(lines, tbl);
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: PASS (all tests in the file)

- [ ] **Step 6: Run the existing export tests to confirm no regression**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/export.test.mjs tests/utilities/debug/exportPolish.test.mjs`
Expected: PASS (the summary-row assertion `| Search results | Service/Search | 3 |` still holds).

- [ ] **Step 7: Commit**

```bash
git add src/utilities/debug/exportSession.ts tests/utilities/debug/exportData.test.mjs
git commit -m "fix(spdebug): render table row data in markdown export with row cap"
```

---

## Task 3: Add a Metrics section to the Markdown export

**Files:**
- Modify: `src/utilities/debug/exportSession.ts` (insert between Tables and Workflows blocks)
- Test: `tests/utilities/debug/exportData.test.mjs` (append)

- [ ] **Step 1: Write the failing test**

Append inside the `describe(...)` block:

```js
  test('metrics section is present with values', () => {
    SPDebug.enable();
    SPDebug.metric('count', 7, { source: 'Service/Search' });
    const md = SPDebug.export.markdown();
    assert.match(md, /## Metrics/);
    assert.match(md, /\| count \| 7 \| Service\/Search \|/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: FAIL — there is no `## Metrics` section today.

- [ ] **Step 3: Implement the Metrics section**

In `src/utilities/debug/exportSession.ts`, find the start of the Workflows block:

```typescript
  // ---- 8. Workflows ----
  if (e.traces.length > 0) {
```

Insert this block immediately **before** it:

```typescript
  // ---- Metrics ----
  if (e.metrics.length > 0) {
    lines.push('## Metrics');
    lines.push('');
    lines.push('| Key | Value | Source | Updated |');
    lines.push('|---|---|---|---|');
    for (const m of e.metrics) {
      lines.push(
        '| ' +
          escapeCell(m.key) +
          ' | ' +
          escapeCell(m.value) +
          ' | ' +
          escapeCell(m.source) +
          ' | ' +
          new Date(m.updatedAt).toISOString() +
          ' |'
      );
    }
    lines.push('');
  }

```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utilities/debug/exportSession.ts tests/utilities/debug/exportData.test.mjs
git commit -m "feat(spdebug): add Metrics section to markdown export"
```

---

## Task 4: Render trace step data in the Workflows section

**Files:**
- Modify: `src/utilities/debug/exportSession.ts` (step loop in Workflows block, currently lines 315-318)
- Test: `tests/utilities/debug/exportData.test.mjs` (append)

- [ ] **Step 1: Write the failing test**

Append inside the `describe(...)` block:

```js
  test('trace step data is rendered as fenced json', () => {
    SPDebug.enable();
    const h = SPDebug.startTrace('Save', { correlationId: 'doc-1' });
    h.step('validated', { fields: 3 });
    h.end();
    const md = SPDebug.export.markdown();
    assert.match(md, /"fields": 3/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: FAIL — step data is not emitted today (only the step label).

- [ ] **Step 3: Implement step-data rendering**

In `src/utilities/debug/exportSession.ts`, the step loop currently reads:

```typescript
        for (const step of trace.steps) {
          const dt = step.timestamp - trace.startedAt;
          const status = step.status ? ' [' + step.status + ']' : '';
          lines.push('  - +' + dt + 'ms' + status + ' ' + step.label);
        }
```

Replace it with:

```typescript
        for (const step of trace.steps) {
          const dt = step.timestamp - trace.startedAt;
          const status = step.status ? ' [' + step.status + ']' : '';
          lines.push('  - +' + dt + 'ms' + status + ' ' + step.label);
          if (step.data !== undefined) {
            lines.push('    ```json');
            for (const dl of safeJson(step.data).split('\n')) lines.push('    ' + dl);
            lines.push('    ```');
          }
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/exportData.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utilities/debug/exportSession.ts tests/utilities/debug/exportData.test.mjs
git commit -m "feat(spdebug): render trace step data in markdown export"
```

---

## Task 5: Make downloadText reliable and boolean-returning

**Files:**
- Modify: `src/components/SPDebugPanel/clipboard.ts` (`downloadText`)
- Test: `tests/components/SPDebugPanel/clipboard.test.mjs` (create), `tests/utilities/debug/exportData.test.mjs` (append round-trip guard)

- [ ] **Step 1: Write the failing tests**

Create `tests/components/SPDebugPanel/clipboard.test.mjs`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { downloadText } from '../../../lib/components/SPDebugPanel/clipboard.js';

describe('downloadText', () => {
  test('returns false when document is undefined', () => {
    const prevDoc = globalThis.document;
    if ('document' in globalThis) delete globalThis.document;
    const ok = downloadText('f.md', 'hi', 'text/markdown');
    assert.equal(ok, false);
    if (prevDoc !== undefined) globalThis.document = prevDoc;
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

    const ok = downloadText('spdebug.json', '{}', 'application/json');
    assert.equal(ok, true);
    assert.equal(clicked, true);
    assert.equal(anchor.download, 'spdebug.json');

    globalThis.document = prevDoc;
    globalThis.URL = prevURL;
    globalThis.Blob = prevBlob;
  });
});
```

Also append this regression guard inside the `describe(...)` block of `tests/utilities/debug/exportData.test.mjs`:

```js
  test('export.json round-trips through JSON.stringify', () => {
    SPDebug.enable();
    SPDebug.set('a', { nested: { x: 1 } });
    SPDebug.table('t', [{ id: 1 }]);
    SPDebug.metric('m', 5);
    const out = SPDebug.export.json();
    const parsed = JSON.parse(JSON.stringify(out));
    assert.equal(parsed.snapshots.length, 1);
    assert.equal(parsed.tables.length, 1);
    assert.equal(parsed.metrics.length, 1);
  });
```

- [ ] **Step 2: Run tests to verify the failing one fails**

Run: `npm run build && node --test --test-reporter=spec tests/components/SPDebugPanel/clipboard.test.mjs`
Expected: FAIL on "creates an anchor, clicks it, and returns true" — current `downloadText` returns `void` (`undefined`), so `assert.equal(ok, true)` fails. (The round-trip guard in `exportData.test.mjs` is expected to PASS already — it guards the JSON download added in Task 6.)

- [ ] **Step 3: Update downloadText**

In `src/components/SPDebugPanel/clipboard.ts`, replace the entire `downloadText` function:

```typescript
/** Trigger a download for a `text/markdown`/`application/json` blob. */
export function downloadText(filename: string, text: string, mime: string): void {
  if (typeof document === 'undefined') return;
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    /* swallow — never break the host app */
  }
}
```

with:

```typescript
/**
 * Trigger a download for a `text/markdown`/`application/json` blob.
 * Returns `true` on success, `false` if the environment can't download or the
 * browser blocked it. Never throws — host apps must stay safe.
 */
export function downloadText(filename: string, text: string, mime: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke well after the browser has started the download. Revoking on a
    // 0ms timeout can race the download in some browsers. `unref` keeps Node
    // test runs from hanging on the pending timer.
    const timer = setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (timer && typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run build && node --test --test-reporter=spec tests/components/SPDebugPanel/clipboard.test.mjs tests/utilities/debug/exportData.test.mjs`
Expected: PASS (all). The run should exit promptly (no 4s hang) thanks to `unref`.

- [ ] **Step 5: Commit**

```bash
git add src/components/SPDebugPanel/clipboard.ts tests/components/SPDebugPanel/clipboard.test.mjs tests/utilities/debug/exportData.test.mjs
git commit -m "fix(spdebug): make downloadText reliable and return success boolean"
```

---

## Task 6: Add JSON copy/download + failure MessageBar to the export dialog

**Files:**
- Modify: `src/components/SPDebugPanel/components/DebugExportDialog.tsx`

No unit test: the repo has no React/jsdom test harness (all tests are pure-logic). This task is verified by `npm run type-check` and `npm run build`. The JSON serializability is already guarded by the round-trip test added in Task 5.

- [ ] **Step 1: Replace the dialog implementation**

Replace the entire contents of `src/components/SPDebugPanel/components/DebugExportDialog.tsx` with:

```typescript
/**
 * Review-before-export dialog.
 *
 * Honors `export.requireReview: 'always' | 'production' | 'never'` per spec.
 * The default is `'production'`. The dialog shows counts and a Markdown
 * preview, with actions: Cancel, Copy Markdown, Download `.md`, Copy JSON,
 * Download `.json`. Copy/download failures surface in an inline MessageBar
 * rather than failing silently.
 *
 * For `requireReview === 'never'` we still let the user open the dialog from
 * the toolbar (they clicked Export); we just skip the disclosure block.
 */

import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { SPDebug } from '../../../utilities/debug';
import type { ExportedSession } from '../../../utilities/debug/exportSession';
import { writeToClipboard, downloadText } from '../clipboard';

export interface DebugExportDialogProps {
  hidden: boolean;
  reviewRequired: boolean;
  onDismiss: () => void;
}

function fmtCounts(json: ExportedSession): string {
  return [
    `${json.entries.length} entries`,
    `${json.evictionSummary.evictedCount} evicted`,
    `${json.snapshots.length} snapshots`,
    `${json.tables.length} tables`,
    `${json.metrics.length} metrics`,
    `${json.traces.length} workflows`,
  ].join(' · ');
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function timestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export const DebugExportDialog: React.FC<DebugExportDialogProps> = ({
  hidden,
  reviewRequired,
  onDismiss,
}) => {
  const [json, setJson] = React.useState<ExportedSession | null>(null);
  const [markdown, setMarkdown] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hidden) return;
    setJson(SPDebug.export.json());
    setMarkdown(SPDebug.export.markdown());
    setError(null);
  }, [hidden]);

  const copyFailMsg = 'Copy failed — your browser blocked clipboard access. Select the preview text and copy manually.';
  const downloadFailMsg = 'Download was blocked by the browser — use Copy instead.';

  const handleCopyMarkdown = async (): Promise<void> => {
    if (!markdown) return;
    const ok = await writeToClipboard(markdown);
    setError(ok ? null : copyFailMsg);
  };
  const handleDownloadMarkdown = (): void => {
    if (!markdown) return;
    const ok = downloadText('spdebug-' + timestampForFilename() + '.md', markdown, 'text/markdown');
    setError(ok ? null : downloadFailMsg);
  };
  const handleCopyJson = async (): Promise<void> => {
    if (!json) return;
    const ok = await writeToClipboard(safeStringify(json));
    setError(ok ? null : copyFailMsg);
  };
  const handleDownloadJson = (): void => {
    if (!json) return;
    const ok = downloadText('spdebug-' + timestampForFilename() + '.json', safeStringify(json), 'application/json');
    setError(ok ? null : downloadFailMsg);
  };

  return (
    <Dialog
      hidden={hidden}
      onDismiss={onDismiss}
      modalProps={{ isBlocking: true }}
      dialogContentProps={{
        type: DialogType.normal,
        title: reviewRequired ? 'Review before sharing' : 'Export debug session',
        subText: reviewRequired
          ? 'This export contains diagnostic data from the current debug session. Review the preview before sharing externally.'
          : 'Copy or download the current session as Markdown or JSON.',
      }}
      maxWidth={720}
    >
      {json && (
        <Stack tokens={{ childrenGap: 8 }}>
          {error && (
            <MessageBar
              messageBarType={MessageBarType.warning}
              onDismiss={() => setError(null)}
            >
              {error}
            </MessageBar>
          )}
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            {fmtCounts(json)}
          </Text>
          <pre
            className="spdebug-export-preview"
            style={{
              maxHeight: 320,
              overflow: 'auto',
              fontSize: 12,
              background: '#faf9f8',
              padding: 8,
              border: '1px solid #edebe9',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {markdown}
          </pre>
        </Stack>
      )}
      <DialogFooter>
        <DefaultButton text="Cancel" onClick={onDismiss} />
        <DefaultButton iconProps={{ iconName: 'Copy' }} text="Copy Markdown" onClick={handleCopyMarkdown} />
        <DefaultButton iconProps={{ iconName: 'Copy' }} text="Copy JSON" onClick={handleCopyJson} />
        <DefaultButton iconProps={{ iconName: 'Download' }} text="Download .md" onClick={handleDownloadMarkdown} />
        <PrimaryButton iconProps={{ iconName: 'Download' }} text="Download .json" onClick={handleDownloadJson} />
      </DialogFooter>
    </Dialog>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS (no TypeScript errors).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SPDebugPanel/components/DebugExportDialog.tsx
git commit -m "feat(spdebug): add JSON copy/download and failure feedback to export dialog"
```

---

## Task 7: Full verification

- [ ] **Step 1: Run the full debug test suite**

Run: `npm run build && node --test --test-reporter=spec tests/utilities/debug/ tests/components/SPDebugPanel/`
Expected: PASS — all existing and new tests green.

- [ ] **Step 2: Validate the library build**

Run: `npm run validate`
Expected: PASS.

- [ ] **Step 3: Manual smoke (optional, in a consuming web part)**

Open the debug panel, capture some `set`/`json`/`table`/`metric`/`startTrace` data, open Export, and confirm: the Markdown preview shows table rows, JSON payloads, a Metrics section, and trace step data; all four Copy/Download buttons work; a blocked download shows the warning MessageBar.

---

## Self-Review Notes

- **Spec coverage:** §1 Markdown data → Tasks 1-4; §2 robust download → Task 5; §3 dialog MD+JSON+MessageBar → Task 6; §4 cap reuse → `MAX_TABLE_ROWS_RENDERED` constant (Task 2) + capture-time `maxPayloadBytes` (existing, no new knob). All covered.
- **Type consistency:** `downloadText` returns `boolean` (Task 5) and is consumed as a boolean in the dialog (Task 6). `writeToClipboard` already returns `boolean`. `pushTableRows`/`tableColumnsFor` names are used consistently within Task 2.
- **No placeholders:** every code step shows full code; every run step shows the exact command and expected result.
