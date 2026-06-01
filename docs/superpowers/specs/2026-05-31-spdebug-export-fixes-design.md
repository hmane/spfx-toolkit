# SPDebug Export & Download — Fixes and Targeted Enhancements

**Date:** 2026-05-31
**Status:** Approved (design)
**Scope:** Fix the two reported export bugs in the SPDebug panel and add the enhancements that fall out of the same code paths.

## Problem

The SPDebug panel's export/download is broken in two ways:

1. **Download does not work.** The "Download .md" action silently fails. `downloadText` ([src/components/SPDebugPanel/clipboard.ts](../../../src/components/SPDebugPanel/clipboard.ts)) swallows all errors and calls `URL.revokeObjectURL` on a `setTimeout(…, 0)`, which can revoke the blob URL before the browser begins the download. The user gets zero feedback when it fails.
2. **Markdown export omits the actual data.** In [src/utilities/debug/exportSession.ts](../../../src/utilities/debug/exportSession.ts):
   - The **Tables** section emits only `Key | Source | Rows | Bytes | Updated` — the row data itself is never written.
   - The **Timeline** and **grouped-by-source** sections emit only `message`, never an entry's `data` payload. Anything captured via `SPDebug.json()` shows only its key.
   - Only **Snapshots** (`set`) render their value.
   - There is **no Metrics section** in Markdown at all.

The structured `export.json()` is lossless, but there is no way to download it — only Markdown.

## Goals

- Make download reliable, and surface failures instead of swallowing them.
- Make the Markdown report include the actual captured data (tables, entry payloads, metrics, trace step data), with size caps so it stays pasteable on a support ticket.
- Make full-fidelity JSON a first-class downloadable/copyable artifact alongside Markdown.

## Non-goals

- Broader debug-panel overhaul (UI, filtering, new capture types).
- New configuration surfaces for the export cap (reuse existing limits).
- Changing what `export.json()` already contains (it is already lossless).

## Design

### 1. Markdown export — emit captured data ([exportSession.ts](../../../src/utilities/debug/exportSession.ts))

Captured values are already byte-capped at capture time via `prepareForCapture(maxPayloadBytes)`. So "inline with size caps" means emitting the already-truncated values plus a render-volume guard so a single large table cannot bloat the report.

- **Tables (§7):** after the existing summary row, render each table's actual rows.
  - If `columns` are provided, render a markdown table using them (respecting `label`/`key`).
  - Otherwise infer column keys from the first row's object keys.
  - Cap rendered rows at a module constant `MAX_TABLE_ROWS_RENDERED` (default `50`); when exceeded, append `_… N more rows — see JSON export for full data_`.
  - Non-object rows fall back to a fenced JSON block.
- **Entry payloads:** in the grouped-by-source section, when an entry has `data`, emit a fenced ` ```json ` block beneath that entry's row (value already capture-truncated). The compact Timeline table stays message-only so both lenses remain useful.
- **Metrics:** add a new section — `| Key | Value | Source | Updated |`.
- **Trace step data:** include `step.data` as a small fenced JSON block when present.

`exportJson()` content is unchanged.

### 2. Robust download ([clipboard.ts](../../../src/components/SPDebugPanel/clipboard.ts))

- `downloadText` returns `boolean` (success). Keep the no-throw guarantee, but report failure to the caller.
- Fix the revoke race: revoke the object URL on a longer delay (~4000ms) instead of `setTimeout(…, 0)`.
- `writeToClipboard` already returns `boolean`; wire its result through to the dialog.

### 3. Export dialog — MD + JSON, copy & download ([DebugExportDialog.tsx](../../../src/components/SPDebugPanel/components/DebugExportDialog.tsx))

- Build the JSON string via `safeJson(SPDebug.export.json())`; download as `spdebug-<ts>.json` with mime `application/json`.
- Four actions plus Cancel: **Copy Markdown · Download .md · Copy JSON · Download .json**. Five footer buttons is dense at 720px; group the two JSON actions (or use two compact rows) so it stays readable.
  - **Fallback (deferred):** if the footer is too cramped in practice, switch to a segmented Markdown/JSON toggle with a single Copy + Download pair. Implement the explicit four-action layout first.
- Add an inline `MessageBar` (warning) shown only on copy/download failure, e.g. *"Download was blocked by the browser — use Copy instead."* Cleared when the dialog reopens (the existing `hidden` effect resets state).

### 4. Cap configuration

No new config knob. Inline data reuses the already-resolved `limits.maxPayloadBytes` (applied at capture). Table-row rendering volume uses the module-level `MAX_TABLE_ROWS_RENDERED` constant.

## Testing

- `exportMarkdown` unit tests:
  - Table rows render with provided `columns`.
  - Table rows render with inferred keys when `columns` absent.
  - Row cap enforced with the "N more rows" marker.
  - Entry `data` rendered as fenced JSON in the grouped-by-source section.
  - New Metrics section present with values.
  - Trace step `data` rendered when present.
- `downloadText` returns `false` when `document` is undefined or blob creation throws; returns `true` on the happy path.
- Dialog tests: failure path renders the `MessageBar`; the JSON download button produces valid parseable JSON.

## Affected files

- `src/utilities/debug/exportSession.ts` — table rows, entry payloads, metrics section, trace step data, row cap.
- `src/components/SPDebugPanel/clipboard.ts` — `downloadText` returns boolean, fix revoke race.
- `src/components/SPDebugPanel/components/DebugExportDialog.tsx` — JSON copy/download, failure MessageBar.
- Tests alongside the above.
