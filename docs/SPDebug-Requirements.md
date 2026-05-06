# SPDebug - Application Debug Layer Requirements

> **Status:** Draft - foundational decisions locked
> **Version:** 0.2.0
> **Last Updated:** May 5, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Goals and Non-Goals](#goals-and-non-goals)
3. [Prime Directive: Disabled Cost and Coupling](#prime-directive-disabled-cost-and-coupling)
4. [Core Concepts](#core-concepts)
5. [Activation and Visibility](#activation-and-visibility)
6. [State Ownership](#state-ownership)
7. [Memory, Limits, and Persistence Budget](#memory-limits-and-persistence-budget)
8. [Debug Data Types](#debug-data-types)
9. [Trace Lifecycle and Identity](#trace-lifecycle-and-identity)
10. [Logger Integration](#logger-integration)
11. [Multi-Site Logger Integration](#multi-site-logger-integration)
12. [Production Support Sessions](#production-support-sessions)
13. [Panel UX](#panel-ux)
14. [Search, Copy, and Export](#search-copy-and-export)
15. [Security and Redaction](#security-and-redaction)
16. [API Proposal](#api-proposal)
17. [Hook Contracts](#hook-contracts)
18. [File Structure](#file-structure)
19. [Implementation Phases](#implementation-phases)
20. [Open Product Questions](#open-product-questions)

---

## Overview

`SPDebug` is a reusable debug layer for SPFx Toolkit consumers. It provides a hidden, opt-in runtime and lazily-loaded panel that applications can use to inspect app state, trace workflows, collect logs, measure timings, and export a redacted support session.

The feature is not limited to debugging `spfx-toolkit`. Consuming applications must be able to use it for their own domain-specific debugging without rebuilding a special debug version of the app.

### Example Use Cases

- A developer enables `?isDebug=true`, opens the panel, and inspects current app state while testing.
- A production user hits an intermittent issue. Support asks them to enable debug mode, reproduce the issue, export a Markdown trace, and send it to developers.
- A workflow starts in a component, continues through hooks/utilities/services, touches multiple SharePoint sites, and resumes through correlation grouping after a refresh.
- Toolkit internals feed the debug panel through the existing logger bridge without importing the debug package.

---

## Goals and Non-Goals

### Goals

1. **Reusable application debug layer** - Any consuming app can publish custom diagnostics.
2. **Hidden until needed** - No visible UI and near-zero disabled runtime work.
3. **Production-safe by default** - Query-string and shortcut activation are gated in production unless the app opts in.
4. **Cross-file tracing** - Traces can span components, hooks, services, utilities, and refreshes through correlation IDs.
5. **Built-in renderers** - Logs, JSON, tables, timers, workflows, metrics, and errors render cleanly.
6. **Leverage existing logger** - `SPContext.logger` and site loggers can feed the panel through sinks.
7. **Non-blocking UI** - The panel docks right or bottom and does not take over the application.
8. **Copy/export friendly** - Debug data can be copied as snippets or exported as Markdown/JSON/CSV.

### Non-Goals

- Replacing browser DevTools.
- Capturing network traffic automatically outside explicit app/toolkit instrumentation.
- Persisting sensitive data without redaction.
- Rendering arbitrary React debug widgets in v1.
- Automatically uploading debug sessions to a server.
- Adding new runtime dependencies.
- Importing `SPDebug` from toolkit components in v1.

---

## Prime Directive: Disabled Cost and Coupling

Bundle size is critical. Disabled consumers must not pay for the debug panel or rich debug runtime unless they import it.

### No-Coupling Rule

Toolkit components must not import:

- `utilities/debug`
- `components/debug`
- `components/SPDebugPanel`

Toolkit internals publish v1 diagnostics only through existing logger calls:

```typescript
SPContext.logger.info('Form validation failed', {
  component: 'SPDynamicForm',
  invalidFields: ['Accounts', 'EffectiveDate'],
});
```

`SPDebug` attaches to logger sinks at runtime and renders those entries if the consuming app imports and enables the debug layer.

### Consequences

- Rich debug types such as `SPDebug.json`, `SPDebug.table`, and `SPDebug.startTrace` are available to application code.
- Toolkit components are limited to log-shaped diagnostics in v1.
- Phase 4 integration is an audit of existing toolkit logger calls, not direct `SPDebug` instrumentation.
- Panel UI must be lazy-loaded and excluded from the main bundle until `panelVisible === true`.

---

## Core Concepts

### Capture

Runtime collection of entries, snapshots, timers, and traces. Capture runs only when `captureEnabled === true`.

### Panel

Lazily-loaded docked UI surface for viewing, searching, copying, and exporting captured data. Panel visibility is independent from capture.

### Session

A bookmarked support/debug window over captured data:

```typescript
{
  id: 'ses_abc123',
  label: 'User reported save failure',
  startedAt: '2026-05-05T17:42:18.000Z',
  endedAt: null,
  note: 'Clicked Save twice; second click hung.'
}
```

### Entry

Timestamped chronological item: log, event, json, table, timer, metric, or error.

### Snapshot

Latest value for a key. Snapshots live separately from the timeline and replace by key.

```typescript
SPDebug.set('App/SelectedAccount', account);
```

### Trace / Workflow

A correlated sequence of steps that can be appended from multiple files.

```typescript
const trace = SPDebug.startTrace('Document publish', {
  source: 'App/Publish',
  correlationId: documentId,
});

SPDebug.step(trace.traceId, 'Validate metadata');
SPDebug.step(trace.traceId, 'Submit to SharePoint');
SPDebug.endTrace(trace.traceId);
```

### Source

Entries should use an `Area/Detail` convention for filtering and export grouping:

- `Toolkit/SPDynamicForm`
- `App/SaveButton`
- `User/FormActions`
- `Service/ClaimsApi`
- `Site/hr`

The convention is documented but not enforced. Sources without `/` group under `Other`.

---

## Activation and Visibility

Debug is disabled by default.

### State Split

| State | Meaning |
|-------|---------|
| `captureEnabled` | Runtime accepts and stores debug data. |
| `panelVisible` | Panel chunk is loaded and rendered. |

Closing the panel must not stop capture. Capture can run silently during a support session.

### Activation Methods

| Method | Requirement |
|--------|-------------|
| Provider prop | `enabled?: boolean` tri-state. `false` is hard off, `true` is force on, `undefined` defers. |
| Programmatic API | `SPDebug.enable()` / `SPDebug.disable()` when allowed by provider policy. |
| Query string | `?isDebug=true`, `?isDebug=1`, `?debug=true`, `?debug=1`; configurable. |
| Session storage | Sticky within current tab when `persistence.mode === 'session'`. |
| Keyboard shortcut | Defaults documented below; configurable or disableable. |

### Precedence

Highest wins:

1. `enabled={false}` provider kill switch.
2. `enabled={true}` provider force-on.
3. Programmatic enable/disable, last call wins within the tab.
4. Current-page query string.
5. Session storage.
6. Default off.

### Production Gating

```tsx
<SPDebugProvider
  allowInProduction={false}
  allowProgrammaticInProduction={false}
/>
```

Defaults:

- `allowInProduction: false`
- `allowProgrammaticInProduction: false`

When production is detected and `allowInProduction === false`, query-string, session-storage, and shortcut activation are ignored. Programmatic activation is also ignored unless `allowProgrammaticInProduction === true` or `enabled={true}` is provided by application code.

Applications that need production support debugging must explicitly opt in and can wrap the provider with their own auth/token/group checks.

### Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+D` | Toggle `panelVisible`. |
| `Ctrl+Alt+Shift+D` | Toggle `captureEnabled`. |

These ship as defaults but must be configurable because host apps may already use them.

---

## State Ownership

Use a singleton external store backed by Zustand. `SPDebugProvider` is bootstrap-only.

### Requirements

- `SPDebug.*` works from React and non-React code.
- Multiple SPFx webparts on the same page share one debug store and one panel.
- The first mounted provider claims primary ownership and performs side effects.
- Additional providers no-op their bootstrap to avoid duplicate logger sinks and shortcuts.
- If the primary provider unmounts, the next mounted provider may claim primary ownership.
- Tests get `SPDebug.reset()` for isolation.

### Provider Responsibilities

- Apply activation rules.
- Apply config and limits.
- Attach logger sinks.
- Attach multi-site logger lifecycle.
- Bind shortcuts.
- Register page lifecycle persistence.
- Lazy-render the panel only when `panelVisible === true`.

The provider does not own debug entries in React state.

---

## Memory, Limits, and Persistence Budget

Capture must be bounded. One bad debug call must not balloon the host app.

### Default Limits

```tsx
<SPDebugProvider
  limits={{
    maxEvents: 1000,
    maxBytesInMemory: 8 * 1024 * 1024,
    maxPayloadBytes: 64 * 1024,
    persistenceMaxBytes: 2 * 1024 * 1024,
    persistenceStripPayloadOver: 8 * 1024,
  }}
/>
```

### Capture-Time Truncation

Payloads are redacted and truncated at capture time. The original full value is never retained.

Default per-payload cap: `64KB`.

Truncation behavior:

- Strings keep the first `4KB` plus a truncation marker.
- Arrays keep leading items plus a summary such as `"... 120 more items"`.
- Objects keep leading keys plus a summary such as `"... 48 more keys"`.
- Circular references are replaced with `[Circular]`.
- Functions, DOM nodes, and unsupported values are summarized.
- Error objects are normalized to safe `{ name, message, stack }` shape.

### In-Memory Ring Buffer

Evict oldest entries until both constraints are satisfied:

- `entries.length <= maxEvents`
- `estimatedBytes <= maxBytesInMemory`

Track:

- `evictedCount`
- `evictedBytes`

Exports must state when earlier entries were evicted.

### Persistence

Default persistence mode: `session`.

| Mode | Behavior |
|------|----------|
| `none` | Fresh debug state every load. |
| `session` | Survives refresh in the current tab. Default. |
| `local` | Opt-in only; survives browser restart until cleared. |
| `custom` | App-provided storage adapter. |

Persist only the newest entries that fit within `persistenceMaxBytes` (`2MB` default). Entries with payloads larger than `persistenceStripPayloadOver` (`8KB` default) persist with payload summaries. In-memory entries may still retain capped payloads.

On quota errors, drop oldest persisted entries until the payload fits and record a debug warning. Never crash the host app because persistence failed.

`maxAgeMinutes` controls how long persisted debug state is restorable on the next load. Older state is discarded.

### Refresh Behavior

On `pagehide`:

- Mark running traces as `abandoned`.
- Persist bounded state.
- Record a page-unload event when capture is enabled.

On next load:

- Restore bounded state if not expired.
- Record a session-resumed event.
- Do not continue traces by `traceId`; use correlation grouping.

### Preventing Refresh

Do not block refresh by default.

Optional:

```tsx
<SPDebugProvider
  persistence={{
    mode: 'session',
    warnBeforeUnload: true,
  }}
/>
```

Warning text:

```text
A debug session is active. Refreshing will continue the debug session, but unsaved app data may be lost.
```

### Snapshot Semantics

Snapshots are keyed latest values:

```typescript
SPDebug.set('App/CurrentItem', item);
```

Calling `set` for the same key replaces the prior snapshot and does not append to the event timeline by default.

No automatic debounce/throttle is provided in v1. High-frequency capture is the caller's responsibility.

---

## Debug Data Types

### v1 Types

| Type | Purpose | Renderer |
|------|---------|----------|
| `log` | Timestamped logger-style message | Timeline/log row |
| `event` | Structured app event with payload | Timeline/detail |
| `json` | Object snapshot or entry payload | Expandable JSON tree |
| `table` | Row/column data | Sortable DetailsList table |
| `timer` | Duration tracking | Timing list |
| `workflow` | Ordered trace steps | Step list/timeline |
| `metric` | Numeric/string value | Compact stat |
| `error` | Error with stack/context | Error card |

### Post-v1 Candidates

- Diff viewer.
- Network request tracker.
- Storage viewer.
- Feature flag viewer.
- Permissions viewer.
- Custom renderer registration.
- Floating panel mode.

---

## Trace Lifecycle and Identity

### Identity

`traceId` and `correlationId` are distinct.

| Field | Owner | Stability | Purpose |
|-------|-------|-----------|---------|
| `traceId` | Toolkit generated, e.g. `tr_abc123` | One trace instance, not stable across refresh | Internal handle for `step` / `endTrace`. |
| `correlationId` | Caller provided string/number | Stable across refresh | Groups related traces conceptually. |

After refresh, a running trace becomes `abandoned`. A new trace with the same `(name, correlationId)` can start. The panel and export group those traces by correlation ID instead of pretending the same trace continued through reload.

### Statuses

```typescript
type TraceStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'warning'
  | 'error'
  | 'abandoned';
```

### Lifecycle Rules

- `startTrace` creates a running trace and captures `startedAt`.
- `step` appends a step. Warning/error steps escalate the trace status.
- `endTrace` closes the trace as success/warning/error unless an explicit status is passed.
- `pagehide` marks running traces as `abandoned` and sets `endedAt`.
- Optional `timeoutMs` can mark a trace abandoned if no step occurs within the timeout. Default off.

### Flat v1 Model

V1 traces are flat. There is no `parentTraceId` tree model.

Sub-flows should use sibling traces with the same `correlationId`. Individual steps may include `subSteps?: Step[]` for display-only structure.

### Invalid Calls

| Call | Behavior |
|------|----------|
| `endTrace` on unknown trace | No-op + debug warning. |
| `endTrace` on already-ended trace | No-op + debug warning. |
| `step` on unknown trace | No-op + debug warning. |
| `step` after ended trace | Append step and mark trace `corrupted` with reason. |

Do not auto-start traces from unknown IDs. That masks bugs.

### Hook Contract

`useSPDebugTrace(name, correlationId)`:

- Starts a trace on mount when capture is enabled.
- Ends the trace on unmount if not already ended.
- Ends the old trace and starts a new one when `correlationId` changes.
- Requires `correlationId` to be a primitive `string` or `number`.
- Throws in dev mode for object correlation IDs; warns/ignores in production.
- Returns `{ traceId, step, warn, fail, end }`.

---

## Logger Integration

The existing logger is the only v1 bridge from toolkit internals to the debug panel.

### SimpleLogger Sink Contract

Add a sink/subscriber mechanism to `SimpleLogger` and the public logger type.

```typescript
export type LogSink = (entry: LogEntry) => void;

export interface Logger {
  addSink(sink: LogSink, options?: { replay?: boolean }): () => void;
  getEntries(): LogEntry[];
}
```

Requirements:

- `addSink` returns an unsubscribe function.
- Sink callbacks receive entries after normal logger sanitization.
- Logger entries reach `SPDebug` after `SimpleLogger` built-in sanitization. `SPDebug` redaction applies on top. Apps wanting consistent redaction across both layers should configure both, or rely on `SPDebug` stricter capture-time pass to catch what the logger missed.
- Sink errors are swallowed and optionally warned to console in dev; logging must never break the app.
- `SPDebug.attachLogger(logger)` calls `logger.addSink(sink, { replay: true })`.
- With `replay: true`, the logger atomically delivers all current entries to the sink before any new entries arrive on that same sink. No replay de-duplication is required.

### Bootstrap Buffer

`SimpleLogger` currently has a default ring buffer. When the same URL flag is present (`isDebug=true/1` or `debug=true/1`), the constructor should bump default `maxEntries` to `1000`.

This URL check must not import `SPDebug`. It is a small independent logger behavior that preserves early bootstrap logs until the provider attaches later.

### Mapping Logger Entries

- Logger entries map to `log` timeline entries.
- `error` level entries also appear in the Errors view.
- Timer entries map to `timer`.
- `entry.component` maps to `source`.
- If a source has no slash, it groups under `Other` unless the bridge supplies richer context.

### Rich Debug Content

The logger stays lightweight and message-oriented. Application code uses `SPDebug` for rich content:

```typescript
SPDebug.json('Form values', values, { source: 'App/EditForm' });
SPDebug.table('Search results', rows, { source: 'Service/Search' });
SPDebug.startTrace('Save workflow', { source: 'App/Save', correlationId });
```

---

## Multi-Site Logger Integration

The toolkit's multi-site feature creates a separate logger for each connected site. Debug v1 must auto-attach those loggers so cross-site workflows are visible.

### MultiSiteManager Requirement

Add lifecycle events:

```typescript
export interface SiteLifecycleEvent {
  type: 'added' | 'removed';
  alias?: string;
  siteUrl: string;
  logger?: Logger;
  context?: ISiteContext;
}

onSiteChange(listener: (event: SiteLifecycleEvent) => void): () => void;
```

Requirements:

- `ISiteContext` is the existing multi-site context shape from `utilities/context/types/multi-site.types.ts`.
- Emit `added` after a site connection succeeds.
- Emit `removed` when a site is disconnected or cleaned up.
- Existing connect/disconnect behavior remains unchanged.
- No import from `SPDebug`.

### SPDebug Attachment Behavior

The primary provider attaches:

- `SPContext.logger`
- All currently connected site loggers.
- Future site loggers via `SPContext.sites.onSiteChange`.

When a site is removed, the corresponding logger sink is detached.

### Site Source and Metadata

Site logger entries use:

```typescript
source = `Site/${aliasOrDerivedName}`;
metadata = {
  siteAlias,
  siteUrl,
};
```

Exports include a Site Contexts section when site metadata appears. URL redaction still applies.

There is no special cross-site trace type in v1. Application code can include site alias/URL in trace step payloads when useful.

---

## Production Support Sessions

Support sessions are user-friendly bookmarks over capture, not the capture mechanism itself.

### Support Flow

1. App team enables production debugging through provider config and its own governance.
2. Support instructs user to activate debug mode.
3. User opens the panel.
4. User starts a session and optionally labels it.
5. User reproduces the issue.
6. User stops the session and adds a note.
7. User reviews the export preview.
8. User copies or downloads the Markdown export.

### Capture vs Session

| Concept | Meaning |
|---------|---------|
| Capture | Runtime ring buffer when `captureEnabled === true`. |
| Session | `{ id, label, startedAt, endedAt?, note? }` window over captured data. |

Entries before `startedAt` are not part of the primary session. Export can include them in a clearly labeled **Pre-session context** block by default.

### Active Session Rules

- V1 supports one active session.
- Starting a session while one is active ends the prior session and starts the new one.
- UI must confirm end-and-replace.
- Programmatic `session.start()` auto-ends the previous session and records a note/event.
- Pause/resume is not in v1.
- Exporting an active session is allowed and must include an `activeAtExport` marker.

### Session Metadata

Capture:

- Session ID, label, note.
- Start/end/export time.
- Duration.
- Active-at-export marker.
- Toolkit version.
- App-provided version/build metadata.
- Browser/user agent.
- URL with redacted query/fragment.
- SharePoint context when available.
- Site contexts when multi-site entries are present.
- Event counts by type/level/source.
- Trace/correlation IDs.
- Eviction summary.
- Redaction summary.

### Review Before Export

Default:

```tsx
<SPDebugProvider
  export={{
    requireReview: 'production',
  }}
/>
```

Allowed values: `'always' | 'production' | 'never'`.

In production, the export dialog must show:

- Included counts.
- Duration.
- Error count.
- Redaction summary.
- Explicit "not redacted" warnings for display names, free text, and IDs.
- Scrollable Markdown preview.
- Cancel, Copy Markdown, Download `.md`.

---

## Panel UX

V1 uses Fluent UI only. Do not use DevExtreme in the debug panel.

### Lazy Loading

The panel UI must be a dynamic import rendered only when `panelVisible === true`.

```tsx
const Panel = React.lazy(() =>
  import(/* webpackChunkName: "spdebug-panel" */ './SPDebugPanel')
);

return panelVisible ? (
  <React.Suspense fallback={null}>
    <Panel />
  </React.Suspense>
) : null;
```

### Dock Modes

| Dock | Behavior |
|------|----------|
| `right` | Default. Resizable width `320-800px`. |
| `bottom` | Full viewport width. Resizable height `200-600px`. |

Floating mode is post-v1.

Dock mode and size persist in session storage.

### Required Features

- Launcher/pill when debug mode is enabled and panel is closed.
- Tabs: Overview, Timeline, Workflows, Snapshots, Tables, Errors, Context.
- Search across all debug data.
- Filters for level, type, area/detail source, correlation, time range, errors only.
- Copy buttons on individual entries and paths.
- Export buttons for session/full capture.
- Clear current view and clear full debug state.
- Dock switcher for right/bottom.
- Resizable panel.
- Session status: active/inactive, duration, event count.

### Components

| Feature | Implementation |
|---------|----------------|
| Shell | Fluent `Panel` for right dock or custom fixed shell if resizing conflicts. |
| Tabs | Fluent `Pivot`. |
| Toolbar | Fluent `CommandBar` or custom command row. |
| Log list | Fluent `DetailsList` with virtualization. |
| Table viewer | Fluent `DetailsList`, sortable columns. |
| JSON tree | Hand-built recursive viewer with expand/copy per path. |
| Workflow viewer | Custom step list with Fluent icons. |
| Export dialog | Fluent `Dialog`. |
| Resize handle | Custom pointer/mouse events. |

DetailsList virtualization is sufficient for v1 defaults (`1000` entries).

---

## Search, Copy, and Export

### Source Filtering

Panel source filter is two-tiered:

- Area: `Toolkit`, `App`, `User`, `Service`, `Site`, `Other`.
- Detail: observed source detail values within selected areas.

Both filters support multi-select. Search also matches the full source string.

### Search Scope

Search scans:

- Messages.
- Source/component.
- Event type.
- JSON payload text.
- Table values.
- Workflow names and steps.
- Error messages and stacks.
- Correlation IDs.
- Site aliases/URLs after redaction.

### Copy Actions

| Renderer | Copy Options |
|----------|--------------|
| Log/Event | Copy message, copy payload JSON |
| JSON | Copy object, copy selected path, copy selected value |
| Table | Copy selected rows as Markdown, CSV, JSON |
| Workflow | Copy trace as Markdown, copy trace JSON |
| Error | Copy message, copy stack, copy full error JSON |
| Session | Copy full Markdown, copy full JSON |

### Export Formats

Markdown is the primary support artifact. JSON is available for automated analysis. Table renderers also support CSV copy/export for selected rows.

Markdown export includes:

- Summary.
- Session label/note.
- Active-at-export marker.
- Redaction summary.
- Eviction summary.
- Pre-session context block when included.
- Chronological timeline.
- Entries grouped by source.
- Errors.
- Workflows grouped by correlation.
- Snapshots.
- Tables.
- Site contexts.

JSON export includes the same information as structured data.

---

## Security and Redaction

Production exports must be safe by default, but redaction cannot prove an export is fully safe. The UI must still tell users to review before sharing.

### Capture-Time Finality

Redaction happens at capture time. The unredacted value is never stored, persisted, or exported.

Changing redaction config affects future entries only. If the app captured too much, the user must clear debug state and reproduce.

### Default Key Redaction

Case-insensitive substring match against object keys:

```text
password
token
authorization
cookie
secret
key
accessToken
refreshToken
clientSecret
ssn
socialSecurity
dob
email
mail
emailaddress
loginname
accountname
userprincipalname
upn
userlogin
useremail
userid
aadtenantid
aaduserid
aadobjectid
aadgroupid
sid
securitytoken
sessionid
jsessionid
msal
samlassertion
idtoken
fedauth
rtfa
x-requestdigest
```

### Value Pattern Redaction

Apply to string values and replace only matching substrings:

| Pattern | Default |
|---------|---------|
| Email addresses | Redact |
| SharePoint claims login strings | Redact |
| SSN-like values | Redact |
| Credit-card-like values | Redact |
| Bearer/JWT tokens | Redact |
| Phone numbers | Off by default |

### URL Redaction

Default:

```typescript
urls: 'queryAndFragment'
```

Behavior:

- Keep protocol, origin, and path.
- Keep query parameter keys but replace values with `[redacted:url]`.
- Replace non-empty fragment with `#[redacted:url-fragment]`.

Allowed modes:

```typescript
type UrlRedactionMode = 'queryAndFragment' | 'queryOnly' | 'all' | 'none';
```

### User Names and Free Text

- Emails, login names, UPNs, and account names are redacted by default.
- User display names are kept by default because they are often needed for diagnosis.
- Apps can set `userDisplayNames: true` to redact likely display-name fields in known user object shapes.
- Unknown free-text fields are kept by default except for value-pattern redaction.
- Export summary must state that display names/free text may be visible.

### Custom Redaction Function

```typescript
export const KEEP = Symbol('SPDebugKeep');
export const REDACT = Symbol('SPDebugRedact');

type RedactFn = (
  path: string,
  value: unknown,
  defaultBehavior: 'keep' | 'redact'
) => unknown | typeof KEEP | typeof REDACT;
```

Meaning:

- `KEEP` bypasses default redaction.
- `REDACT` applies the standard redacted marker.
- Any other return value replaces the captured value.

### Redaction Summary

Every export includes:

- Keys redacted by name and counts.
- Values redacted by pattern and counts.
- URL query/fragment redaction counts.
- User display-name policy.
- Free-text policy.
- Custom rule count.
- Reminder that redaction happened at capture time.

---

## API Proposal

### Provider

```tsx
<SPDebugProvider
  enabled={undefined}
  allowInProduction={false}
  allowProgrammaticInProduction={false}
  activation={{
    queryParams: ['isDebug', 'debug'],
    shortcuts: {
      togglePanel: 'Ctrl+Alt+D',
      toggleCapture: 'Ctrl+Alt+Shift+D',
    },
  }}
  panel={{
    defaultDock: 'right',
    allowDockSwitch: true,
  }}
  persistence={{
    mode: 'session',
    maxAgeMinutes: 60,
    warnBeforeUnload: false,
  }}
  limits={{
    maxEvents: 1000,
    maxBytesInMemory: 8 * 1024 * 1024,
    maxPayloadBytes: 64 * 1024,
    persistenceMaxBytes: 2 * 1024 * 1024,
    persistenceStripPayloadOver: 8 * 1024,
  }}
  redact={{
    keys: ['claimNumber', 'accountNumber'],
    urls: 'queryAndFragment',
    userDisplayNames: false,
    phoneNumbers: false,
    custom: (path, value, defaultBehavior) => {
      if (path.endsWith('.internalNotes')) return REDACT;
      return KEEP;
    },
  }}
  export={{
    requireReview: 'production',
  }}
>
  <App />
</SPDebugProvider>
```

The provider does not require a child `<SPDebugPanel />`. Panel rendering is internal and lazy.

### Runtime API

```typescript
SPDebug.enable();
SPDebug.disable();
SPDebug.showPanel();
SPDebug.hidePanel();
SPDebug.togglePanel();
SPDebug.toggleCapture();
SPDebug.isCaptureEnabled();
SPDebug.isPanelVisible();

SPDebug.log(message, data?); // source defaults to App
SPDebug.info(source, message, data?);
SPDebug.warn(source, message, data?);
SPDebug.error(source, error, data?);
SPDebug.event(source, message, data?);

SPDebug.set(key, value, options?);
SPDebug.json(key, value, options?);
SPDebug.table(key, rows, options?);
SPDebug.metric(key, value, options?);

const timer = SPDebug.timer('Load account', { source: 'Service/Accounts' });
timer.end({ status: 'success' });

const trace = SPDebug.startTrace('Save workflow', {
  source: 'App/Save',
  correlationId,
});
SPDebug.step(trace.traceId, 'Validate form');
SPDebug.endTrace(trace.traceId);

SPDebug.session.start({
  label: 'User reported save failure',
});
SPDebug.session.stop({
  note: 'It hung after the second click.',
});
SPDebug.session.clear();

SPDebug.export.markdown(options?);
SPDebug.export.json(options?);

SPDebug.attachLogger(logger, options?);
SPDebug.reset(); // tests
```

### Source-Scoped API

```typescript
const debug = SPDebug.scope('App/SaveButton');

debug.info('Clicked', { itemId });
debug.event('Validation failed', { missingFields });
debug.json('Payload', payload);
debug.table('Selected rows', rows);
debug.metric('Selected count', rows.length);
```

### Table Options

```typescript
SPDebug.table('Selected documents', documents, {
  source: 'App/Documents',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size', format: 'fileSize' },
    { key: 'modified', label: 'Modified', format: 'dateTime' },
  ],
});
```

---

## Hook Contracts

Hooks must be safe to leave in production code.

### Disabled-State Contract

When `captureEnabled === false`, hooks must perform no redaction, serialization, truncation, object walking, or store writes.

React hooks subscribe only to:

```typescript
useDebugStore(s => s.captureEnabled);
```

They early-return from effects when disabled. They must not subscribe to entries, workflows, snapshots, or derived debug data.

Non-React `SPDebug.*` methods read `useDebugStore.getState()` and immediately return when capture is disabled.

### Closure-Pinning Footgun

Even disabled hooks may close over values passed to them. Documentation must tell app authors to pass existing references, not synthetic objects.

```typescript
// Avoid: creates a new object each render.
useSPDebugValue('snapshot', { items, selected, filter }, [items, selected, filter]);

// Prefer: pass existing references.
useSPDebugValue('items', items, [items]);
useSPDebugValue('selected', selected, [selected]);
```

### v1 Hooks

```typescript
useSPDebugValue(key, value, deps);
useSPDebugTable(key, rows, deps);
useSPDebugTimer(name, isLoading);
useSPDebugTrace(name, correlationId);
useSPDebugSession();
useSPDebugEnabled();
```

No v1 hooks:

- `useSPDebugRender`
- `useSPDebugProps`
- Public `useSPDebugStore`

### Timer Hook

`useSPDebugTimer(name, isLoading)`:

- Starts a timer when mounted with `isLoading === true`.
- Starts a new timer on `false -> true`.
- Ends and emits one timer entry on `true -> false`.
- Ends with `interrupted: true` on unmount while loading.
- Repeated loading cycles create separate timer entries.

### Trace Hook

```typescript
const trace = useSPDebugTrace('Save claim', claimId);

trace.step('Validation passed');
await saveService.save(claim, { debugTraceId: trace.traceId });
trace.end();
```

`trace.traceId` is exposed so non-React services can append steps.

---

## File Structure

Suggested structure:

```text
src/
  utilities/
    context/
      logger.ts                 # SimpleLogger.addSink
      types.ts                  # Logger sink types
      multi-site-manager.ts     # onSiteChange lifecycle
    debug/
      SPDebug.ts
      SPDebugStore.ts
      SPDebugTypes.ts
      redaction.ts
      truncate.ts
      exportMarkdown.ts
      exportJson.ts
      persistence.ts
      loggerBridge.ts
      multiSiteBridge.ts
      index.ts
  components/
    debug/
      SPDebugProvider.tsx
      SPDebugLayer.tsx
      hooks.ts
      index.ts
    SPDebugPanel/
      SPDebugPanel.tsx
      SPDebugPanel.module.scss
      components/
        DebugToolbar.tsx
        DebugLogList.tsx
        DebugJsonViewer.tsx
        DebugTableViewer.tsx
        DebugWorkflowViewer.tsx
        DebugExportDialog.tsx
        DebugResizeHandle.tsx
      index.ts
```

Package exports:

```typescript
spfx-toolkit/utilities/debug
spfx-toolkit/components/debug
```

`components/SPDebugPanel` is not a public v1 export. It is loaded internally by `SPDebugProvider` so consumers do not accidentally bypass the lazy-load boundary.

---

## Implementation Phases

### Phase 0 - Infrastructure Prerequisites

- Add `SimpleLogger.addSink(sink, { replay?: boolean })` and update `Logger` types.
- Make `SimpleLogger` bump `maxEntries` when debug URL flag is present.
- Add `MultiSiteManager.onSiteChange(listener)` and emit add/remove events.
- Add tests for sink isolation, unsubscribe, atomic replay, and site lifecycle events.

### Phase 1 - Runtime Store and Logger Bridge

- Create singleton Zustand store.
- Implement provider primary-claim behavior.
- Implement activation precedence and production gating.
- Implement `SPDebug` static facade.
- Implement base runtime methods: `log`, `info`, `warn`, `error`, `event`, panel/capture toggles, and session controls.
- Implement logger attach with atomic `addSink(..., { replay: true })`.
- Implement multi-site logger auto-attach.
- Implement bounded session persistence.

### Phase 2 - Safety Layer

- Implement capture-time redaction.
- Implement capture-time truncation.
- Implement memory caps and eviction counts.
- Implement persistence cap and quota handling.
- Implement Markdown/JSON export with redaction and eviction summaries.

### Phase 3 - Panel UI

- Add lazy-loaded Fluent-only right/bottom dock panel.
- Add launcher.
- Add Overview, Timeline, Errors, Workflows, Snapshots, Tables, Context tabs.
- Add search, two-tier source filter, level/type/correlation filters.
- Add copy actions.
- Add session start/stop/note/export flow.
- Add production review-before-export modal.

### Phase 4 - Rich Runtime Types, Traces, and Hooks

- Implement JSON/table/metric/timer APIs.
- Implement trace lifecycle, abandoned/corrupted states, correlation grouping.
- Implement v1 hooks.
- Add tests for disabled hook behavior where practical.

### Phase 5 - Toolkit Logger Audit

- Audit existing logger calls in:
  - `SPDynamicForm`
  - `VersionHistory`
  - `DocumentLink`
  - `BatchBuilder`
- Improve message/source/payload quality where useful.
- Do not import `SPDebug` from these components.

### Phase 6 - Hardening and Documentation

- Accessibility review.
- Keyboard shortcut conflict documentation.
- Mobile/bottom dock behavior.
- Usage guide examples.
- Production support runbook.
- Unit tests for redaction, persistence, export, trace correlation, and multi-site attachment.

---

## Open Product Questions

1. Should `local` persistence remain opt-in only in v1? Recommendation: yes.
2. Should default shortcuts ship enabled, or should apps opt in explicitly? Recommendation: enabled by default but configurable.
3. Should production activation support a built-in token check, or should apps own that gating? Recommendation: apps own it in v1.
