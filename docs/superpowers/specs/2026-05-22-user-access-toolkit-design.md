# User Access Toolkit — Design Spec

**Date:** 2026-05-22
**Status:** Draft, pending user review
**Audience:** Implementers (next session writes the implementation plan)

---

## 1. Problem & Goals

### Problem

During UAT and operational rollout, two distinct audiences struggle with SharePoint user/group/permission information:

1. **Business users** can't self-diagnose access issues. They don't know what site groups they belong to, what their effective permission level is, or what they can/can't do on a given list. Today they file tickets or ask admins.
2. **Site admins** waste time on routine investigations and edits. Common pain points:
   - "What can user X see on this site?" — requires manually walking through SP UI.
   - "Why can user A see X but user B can't?" — currently requires opening two browser sessions and eyeballing.
   - "Add user X to these 20+ groups" — clicking each group's membership page is slow and error-prone.

### Goals

Ship a set of reusable components, hooks, and a service from `spfx-toolkit` so the consuming **reusable web parts** project can compose admin/UAT web parts without re-implementing user-and-group logic for each site.

The toolkit ships:

- A self-service **"My Access"** surface for business users (UAT pages).
- An **admin** surface with **Browse / Compare / Manage groups** tabs.
- A reusable **service + hooks layer** so the same web parts repo can build custom variants without re-coding SP calls.
- Add-on hooks/components for adjacent needs (group members listing, broken-inheritance audit, CSV export, permission gating).

### Non-goals (deferred, not dropped)

- Cross-site comparison (SPContext multi-site is single-site scope here).
- Audit log / activity feed (needs SP audit data; large scope).
- Empty/orphaned group cleanup (niche).
- Snapshot/versioned access records (no current compliance ask).
- A new SPDebugPanel pane (separate dev concern; not required for these audiences).

---

## 2. Approach

**Approach C — Two surfaces, shared core, admin tabs.**

- A **shared core** (service + hooks + types) lives under `src/utilities/userAccess/` and `src/hooks/`. No React in the service; no SP calls in the hooks.
- A small **end-user surface** (`MyAccessView`) — read-only, friendly voice, drops onto UAT and landing pages.
- A single **admin surface** (`UserAccessAdmin`) with internal tabs for Browse / Compare / Manage groups. One import for admins; bundles stay separate from UAT pages.
- **Add-ons** (`<GroupMembersList>`, `useBrokenInheritanceLists`, `accessExportToCsv`, `<RequirePermission>` / `useHasPermission`) ship in the same release so the consuming web parts repo doesn't have to come back to the toolkit for adjacent needs.

Approach A (four standalone components) was rejected because every admin page would need to wire four components — easy to miss one. Approach B (single `mode`-switched component) was rejected because UAT pages would bundle all admin code.

---

## 3. Scope — features in v1

All four user-facing features are in v1:

1. **My Access view** (self, read-only).
2. **User Admin — Browse** (admin picks any user, read-only inspection).
3. **Permission Comparison** (two users, side-by-side diff).
4. **Bulk Group Membership Editor** (one user, many groups, batched apply).

Add-ons in v1:

5. **`<RequirePermission>` + `useHasPermission`** — gate admin controls.
6. **`useGroupMembers` + `<GroupMembersList>`** — "who's in this group?" widget.
7. **`useBrokenInheritanceLists`** — site-wide audit hook.
8. **`accessExportToCsv`** — utility for exporting access data / diffs.

### Loading model — progressive disclosure (CRITICAL)

The default open of any user-inspection view loads only Level 1. Deeper data is fetched on user action.

- **Level 1 (auto, on open):** Groups the user belongs to + lists/libraries where the user (directly or via a group they're in) has been **explicitly granted permissions** (i.e., appears in role assignments of a list with broken inheritance from the web). Implementation is a two-step scan: (1) one site-wide call `sp.web.lists.filter("HasUniqueRoleAssignments eq true").select(...)()` to enumerate broken-inheritance lists, (2) one batched fetch of role assignments across those lists. The total cost is bounded by the count of unique-role lists, which is typically small but is NOT zero — there is a site-wide enumeration step. **Implementation spike must validate that the `HasUniqueRoleAssignments eq true` server-side filter is honored in the target tenant**; if a tenant rejects or silently mis-evaluates the filter, the fallback is to enumerate visible lists with `HasUniqueRoleAssignments` in `$select` and filter client-side. Choose at runtime per call; do not maintain a permanent client-side branch.
- **Level 2 (user picks a list):** Effective permissions for that user on the chosen list.
- **Level 3 (user enters an item ID):** Effective permissions on that specific list item.

This rule forbids any "enumerate every list and call effective-permission APIs per list per user" implementation. The default cost is one site-wide list call plus one batched role-assignment fetch.

### What the toolkit can and cannot explain

The toolkit displays **matched SharePoint role assignments** — i.e., entries in `RoleAssignments` on the web/list/item where the principal is the user OR a SharePoint group the user belongs to. It does NOT claim to explain "complete effective permission causality." Sources we cannot resolve from SP REST:

- Entra ID security groups used as principals (we see the group, but cannot expand its membership through SP).
- Sharing links (anonymous, "anyone with link", flexible-link system principals).
- App-only / Azure AD app grants.
- Tenant-level / hub-permission overlays.

The UI labels its rows accordingly (e.g., "Granted via SharePoint group: Site Members"), and the comparison view notes when the diff cannot fully account for an observed difference.

---

## 4. Module Layout

```
src/
├── utilities/
│   └── userAccess/                       # NEW — shared core (no React)
│       ├── userAccessService.ts          # All SP calls (uses SPContext.sp + native PnP batching)
│       ├── userAccessCache.ts            # window-level cache (per existing toolkit pattern)
│       ├── userAccessDiff.ts             # pure diff function (testable, no SP)
│       ├── userAccessExport.ts           # accessExportToCsv (pure, no SP)
│       ├── brokenInheritance.ts          # site-wide audit backing functions
│       ├── types.ts                      # IUserAccessLevel1, IListPermission, IAccessDiff, etc.
│       └── index.ts
│
├── hooks/                                # additions to existing folder
│   ├── useUserAccess.ts
│   ├── useEffectiveListPermission.ts
│   ├── useEffectiveItemPermission.ts
│   ├── useSiteGroups.ts
│   ├── useGroupMembers.ts
│   ├── useGroupMembershipEditor.ts
│   ├── useUserAccessComparison.ts
│   ├── useHasPermission.ts
│   ├── useBrokenInheritanceLists.ts
│   └── index.ts (extended)
│
└── components/
    └── userAccess/                       # NEW component folder
        ├── MyAccessView/
        ├── UserAccessAdmin/
        │   ├── UserAccessAdmin.tsx
        │   └── tabs/
        │       ├── BrowseTab.tsx
        │       ├── CompareTab.tsx
        │       └── ManageGroupsTab.tsx
        ├── primitives/
        │   ├── PermissionLevelBadge/
        │   ├── UserGroupChips/
        │   ├── DirectPermissionsTable/
        │   └── RequirePermission/
        ├── GroupMembersList/
        └── index.ts
```

### Boundaries

1. **Service has no React.** A non-React consumer (a job script, custom web part code) can call `userAccessService.getUserAccessLevel1(login)` directly.
2. **Hooks have no SP calls.** Hooks orchestrate service calls + React state only. Easier to reason about and easier to swap the data source later.
3. **Reused, not duplicated:**
   - `SPContext` — required initialized; service uses `SPContext.sp` and `SPContext.logger`.
   - Native PnP batching (`sp.batched(props?)` / `sp.web.batched(props?)`, or the exported `createBatch(base, props?)` — all from `@pnp/sp/batching`). Used for bulk group ops and parallel role-assignment fetches. The existing `BatchBuilder` is **not** used here: it only supports list-item create/update/delete via `ListOperationBuilder` and does not cover `siteGroups.getById(...).users.add/removeByLoginName(...)` or batched role-assignment reads. We deliberately do not extend `BatchBuilder` for this feature — keeping its surface focused on list-item ops.
   - `PermissionHelper` — reused for richer permission semantics on lists (e.g., `userHasSpecificPermission(listName, permissionKind)`); the lightweight `useHasPermission` gate calls `sp.web.currentUserHasPermissions(PermissionKind.X)` directly because the helper has no current-user-on-web wrapper.
   - `<UserPersona>`, `<GroupViewer>` — reused inside surfaces for rendering people and groups.
   - `<ErrorBoundary>` — wrapped internally around the admin surface.

### Dependencies (all existing peer deps — zero new packages)

`@pnp/sp`, `@pnp/spfx-controls-react` (PeoplePicker), `@pnp/logging`, `@fluentui/react` (tree-shaken imports only), `react`/`react-dom`.

---

## 5. Service Layer — `userAccessService`

**Shape:** static class object, mirroring `SPContext` / `PermissionHelper` patterns. All methods accept `login: string | 'current'`.

### Methods

```typescript
// Level 1
getUserAccessLevel1(login): Promise<IUserAccessLevel1>
  // returns { user, siteGroups[], directListPermissions[] }
  // - user: resolved ISiteUser (ensureUser if needed)
  // - siteGroups: groups this user belongs to
  // - directListPermissions: lists with broken inheritance where user OR
  //   any of their groups appears in role assignments.
  //   Implementation: site-wide enumeration via
  //     sp.web.lists.filter("HasUniqueRoleAssignments eq true").select("Id","Title","Hidden")()
  //   then one PnP batch (sp.batched()) fetching RoleAssignments
  //   (with Member, RoleDefinitionBindings) for each unique-role list.

// Level 2 (on demand)
getEffectiveListPermission(login, listRef): Promise<IListPermission>
  // listRef: { id?: string; title?: string }
  // role assignments granted to user (direct or via group) +
  // a derived PermissionLevel summary (Owner/Member/Visitor/Custom).

// Level 3 (on demand)
getEffectiveItemPermission(login, listRef, itemId): Promise<IItemPermission>

// Comparison
diffUserAccess(loginA, loginB): Promise<IAccessDiff>
  // 2× getUserAccessLevel1 + pure userAccessDiff()

// Bulk group editor
getAllSiteGroups(): Promise<ISiteGroup[]>
addUserToGroups(login, groupIds[]): Promise<IBulkResult>
removeUserFromGroups(login, groupIds[]): Promise<IBulkResult>
  // Both use native PnP batching via sp.batched() (NOT BatchBuilder).
  // Each enqueues one sp.web.siteGroups.getById(id).users.add(loginName)
  // or .removeByLoginName(loginName) call into the batch.
  // IBulkResult = { succeeded: number[], failed: Array<{groupId, error}> }
  // Partial failures are returned, NOT thrown.

// Add-ons
listsWithBrokenInheritance(): Promise<IListWithUniqueRoles[]>
getGroupMembers(groupRef: { id?, name? }): Promise<ISiteUser[]>
```

### Caching

Window-level, namespaced by key `__spfx_toolkit_user_access_cache__` (same pattern as `PermissionHelper` and `ManageAccess`).

| Cache entry | TTL |
|---|---|
| Per-login Level 1 result | 5 min |
| Per-login user resolution + group memberships | 5 min |
| Per-(login, listId) Level 2 | 2 min |
| Per-(login, listId, itemId) Level 3 | 1 min |
| `getAllSiteGroups()` | 10 min |
| `listsWithBrokenInheritance()` | 5 min |

`addUserToGroups` / `removeUserFromGroups` invalidate the affected user's Level-1 and group-membership entries on success.

### Error model

Custom `UserAccessError extends Error` with `{ code, login?, listRef?, itemId? }`. Codes:

- `USER_NOT_FOUND`
- `LIST_NOT_FOUND`
- `ITEM_NOT_FOUND`
- `ACCESS_DENIED`
- `NETWORK_ERROR`
- `UNKNOWN`

All methods log via `SPContext.logger` on entry, exit, and failure. Bulk methods **never throw on partial failure** — per-group results land in `IBulkResult.failed`.

### Login normalization

People-picker output formats vary (`i:0#.f|membership|foo@x.com` vs. email vs. UPN). Service normalizes to the user's `LoginName` at the boundary so cache keys are stable. Reuses the resolution approach from `spUpdater`'s recent membership-email fix (commit `2010c4e`).

---

## 6. Hooks Layer

### Conventions

All hooks share a uniform shape so consumers learn one mental model:

- Return: `{ data, loading, error, refresh, ...extras }`
- `error: UserAccessError | null` (never a thrown promise React can't catch)
- `refresh()` busts the cache for that hook's key and re-fetches
- **Null-arg → idle.** If a required arg is `null`/`undefined`, the hook does nothing (no fetch, no error). Caller controls when to load. This drives the drill-down UX.
- **Error contract is uniform.** Service methods may throw on programmer error (e.g., uninitialized `SPContext`). Hooks **catch** these and return them as `error: UserAccessError({ code: 'UNKNOWN', cause })` — the hook contract is "never throws to render". This split keeps non-React service callers from silently swallowing wiring bugs while keeping React rendering safe.

### Read hooks

```typescript
useUserAccess(login: string | 'current' | null)
  → { data: IUserAccessLevel1 | null, loading, error, refresh }

useEffectiveListPermission(login, listRef: { id?, title? } | null)
  → { data: IListPermission | null, loading, error, refresh }

useEffectiveItemPermission(login, listRef, itemId: number | null)
  → { data: IItemPermission | null, loading, error, refresh }
```

### Site-level hooks

```typescript
useSiteGroups()
  → { groups: ISiteGroup[], loading, error, refresh }
  // cached 10 min, shared across components

useGroupMembers(groupRef: { id?, name? } | null)
  → { members: ISiteUser[], loading, error, refresh }

useBrokenInheritanceLists()
  → { lists: IListWithUniqueRoles[], loading, error, refresh }
```

### Comparison

```typescript
useUserAccessComparison(loginA, loginB)
  → { diff: IAccessDiff | null, loading, error, refresh, userA, userB }
  // Internally: 2× useUserAccess + memoized diff via userAccessDiff().
  // Reuses both users' Level-1 caches.
```

### Bulk-edit state machine

```typescript
useGroupMembershipEditor(
  login: string | null,
  managePermission: PermissionKind = PermissionKind.ManageWeb
)
  → {
      allGroups: ISiteGroup[],
      currentMembership: Set<number>,     // server truth
      pendingMembership: Set<number>,     // what the UI shows
      pendingAdds: number[],               // derived
      pendingRemoves: number[],            // derived
      isDirty: boolean,
      toggle(groupId): void,
      reset(): void,
      apply(): Promise<IBulkResult>,       // re-checks `managePermission` before dispatch
      applying: boolean,
      lastResult: IBulkResult | null,      // partial-success here
      error,
    }
```

`UserAccessAdmin` passes its `managePermission` prop into this hook so the UI gate and the apply-time re-check use the same `PermissionKind`. Consumers building custom UIs should pass whatever kind matches their `<RequirePermission>` wrapper.

Why this shape:

- Two `Set<number>` (current vs. pending) is the cleanest mental model for a checkbox list. `toggle()` flips a bit; everything else is derived.
- UI can show "+3 groups, −1 group" before Apply from `pendingAdds.length` / `pendingRemoves.length`.
- `apply()` resolves the diff, calls `addUserToGroups` and `removeUserFromGroups`, invalidates user-access cache, and refreshes `currentMembership` from the server (so partial failures resolve correctly).
- Partial failures land on `lastResult`, not `error`. `error` is reserved for full failures (network, auth).

### Gate

```typescript
import { PermissionKind } from '@pnp/sp/security';

useHasPermission(kind: PermissionKind = PermissionKind.ManageWeb)
  → { allowed: boolean, loading, error }
  // Backed by sp.web.currentUserHasPermissions(kind).
  // SPPermissionLevel (the display-name enum: Full Control / Edit / Read / ...) is
  // intentionally NOT used here — ManageWeb is a permission bit, not a display level.
  // For list/item-scoped specific-permission checks, callers can use the existing
  // PermissionHelper.userHasSpecificPermission(listName, permissionKind) instead.
```

---

## 7. UI Components

### Primitives (shared across surfaces, exported individually)

**`<PermissionLevelBadge level="Owner"|"Member"|"Visitor"|"Custom"|"None" />`**
Small Fluent pill, color-coded. Optional `tooltip` prop. Pure, no SP calls.

**`<UserGroupChips user groups onChipClick? />`**
Horizontal chip row. Each chip's hover renders the existing `<GroupViewer>` (no duplication). `onChipClick` enables parent drill-down.

**`<DirectPermissionsTable lists={IDirectListPermission[]} onListClick?(listRef) />`**
Compact table: list title, permission level (badge), source ("Direct" or "Via {group}"). `onListClick` triggers Level-2 drill-down. Empty state copy provided.

**`<RequirePermission kind={PermissionKind.ManageWeb} fallback?>{children}</RequirePermission>`**
Wraps `useHasPermission`. Takes a `PermissionKind` (from `@pnp/sp/security`), default `PermissionKind.ManageWeb`. While `loading`, renders a Fluent `Shimmer` placeholder. While `!allowed`, renders `fallback ?? null`. Used by `UserAccessAdmin` to gate write tabs; also exported standalone.

### `<MyAccessView />` — self-service surface

**Props:** `{ className?, title?, showRefresh?, onError? }` — deliberately small. Targets `'current'` user.

**Layout (top → bottom):**

1. Header: `<UserPersona currentUser>` + plain-English summary ("You're a Member of this site.").
2. Groups card: `<UserGroupChips>`.
3. Direct list permissions card: `<DirectPermissionsTable>`. Empty-state copy: "You don't have any list-specific permissions beyond your group memberships."
4. Drill-down panel (collapsed by default): list/library picker → on select shows `<PermissionLevelBadge>` + role detail. Optional item-id input → effective item permission.
5. Refresh button bound to `useUserAccess.refresh()`.

**Voice:** business-friendly. Never says "role assignment", "principal", or "broken inheritance". Uses "permissions" and "groups".

### `<UserAccessAdmin />` — admin surface

**Props:**

```typescript
{
  className?: string;
  title?: string;
  managePermission?: PermissionKind;  // default PermissionKind.ManageWeb
  allowBrowse?: boolean;              // default false
  onError?: (error: UserAccessError) => void;
}
```

**Gating model:**

- The component shell **always renders** (header, Pivot chrome) — no full "not authorized" replacement. This matters for embed scenarios where the consumer's layout depends on the chrome being visible.
- **Browse tab** and **Compare tab** are visible if `allowBrowse === true` **OR** the current user has `managePermission`. Default `allowBrowse = false` means non-admins see no other users' data unless the consuming web part deliberately opts them in.
- **Manage Groups tab** is always gated by `<RequirePermission kind={managePermission}>`. Never shown to users without it, regardless of `allowBrowse`.
- A tab that is gated-out is **hidden from the Pivot** (not greyed-out), so the UI doesn't advertise capabilities the user can't use.
- If the user has access to no tabs, an inline "You don't have access to any user-admin features on this site" message replaces the Pivot. This is the only "not authorized" surface; the shell stays.

**Layout:** Fluent `Pivot` with up to three tabs (filtered by the gating model above).

**Tab 1 — Browse**

- `<PeoplePicker>` at top (single select).
- Below: same body as `<MyAccessView>` for the picked user, but with technical labels (no plain-English copy). Drill-down is the same flow.
- Empty state when no user picked: prompt + recent-users hint (last 5 picked, persisted to `localStorage`).

**Tab 2 — Compare**

- Two `<PeoplePicker>` side-by-side.
- Below: 3-column diff grid: **Only A** | **Common** | **Only B**. Each column has subsections "Groups" and "Matched list role assignments".
- Header shows counts (e.g., "Only Mary: 3 groups, 1 list").
- "Export CSV" button → `accessExportToCsv(diff)` → triggers download.
- Backed by `useUserAccessComparison`. **Level-1 only** by default — the grid compares groups and matched role assignments from each user's `IUserAccessLevel1`. It does NOT eagerly fetch effective permission masks for shared lists; that would break the progressive-disclosure rule.
- Each row in "Matched list role assignments" has a "Compare permissions" affordance that fires Level-2 fetches (`useEffectiveListPermission` for both users) for that one list. Only then is `unexplainedDifference` computed and surfaced — when masks differ but the visible assignments don't account for it. Optional drill-into-item works the same way at Level 3.

**Tab 3 — Manage groups** (gated by `<RequirePermission kind={managePermission}>`)

- `<PeoplePicker>` + group filter `SearchBox`.
- Scrollable checkbox list of ALL site groups (from `useSiteGroups`). Each row: checkbox, group name, member count.
- Sticky footer: "**+3 added, −1 removed.** [Reset] [Apply]"
- Apply opens a confirmation `Dialog` listing exact changes; on confirm → `editor.apply()`.
- Result UI: success toast for full success; inline `MessageBar` per failed group on partial failure.
- Virtualized list once group count > 50 (Fluent `List` with `getPageSpecification`).

### `<GroupMembersList />` — add-on standalone

**Props:** `{ groupRef: { id?, name? }, className?, showSearch?, maxHeight?, onMemberClick? }`
Renders `<UserPersona>` rows with a search filter. Backed by `useGroupMembers`. Empty/loading states. No write actions.

### Reused (no duplication)

- `<UserPersona>` for every person rendered.
- `<GroupViewer>` for group hover tooltips inside `<UserGroupChips>`.
- `<ErrorBoundary>` wrapped internally around `<UserAccessAdmin>` so consumers don't need to.

---

## 8. Permission Gating, Errors, Edge Cases

### Permission gating — defense in depth

Three layers, each catching different mistakes:

1. **UI gate** — `<RequirePermission kind={PermissionKind.ManageWeb}>` hides write surfaces. Prevents the *option* from appearing.
2. **Hook gate** — `useGroupMembershipEditor.apply()` re-checks `sp.web.currentUserHasPermissions(managePermission)` immediately before dispatch (where `managePermission` is the hook's second argument, default `PermissionKind.ManageWeb`). On failure, resolves with an `IBulkResult` where every operation is `failed: { error: 'ACCESS_DENIED' }`. Catches direct hook invocation and keeps the apply-time check aligned with whatever `PermissionKind` the consuming UI uses for its `<RequirePermission>` wrapper.
3. **Server gate** — SharePoint itself rejects unauthorized adds/removes; surfaced through `IBulkResult.failed[]`. The toolkit doesn't pretend to be the security boundary; SP is.

**Read-surface gating:**

- `<MyAccessView>` is always available — a user inspecting their **own** access needs no extra permission.
- Inside `<UserAccessAdmin>`, **Browse** and **Compare** require either `allowBrowse === true` (consuming web part's explicit opt-in) OR the current user holds `managePermission` (default `PermissionKind.ManageWeb`). Reading other users' group memberships and role assignments may surface information the tenant or site policy intends to keep restricted; the toolkit defaults to "show only to people with manage rights" and forces the consuming web part to opt-in for broader audiences.
- **Manage Groups** is always gated by `managePermission`, regardless of `allowBrowse`.

### Error UX

| Error code | UX |
|---|---|
| `USER_NOT_FOUND` | Friendly message: "We couldn't find this user on this site." People picker should prevent this. |
| `LIST_NOT_FOUND` | Inline `MessageBar`; dropdown refreshes. Stale dropdown case. |
| `ITEM_NOT_FOUND` | Inline validation under the item-id input. |
| `ACCESS_DENIED` | Show an inline "You don't have access" message inside the affected pane (shell + chrome remain). Offer "Reload" only when caused by a session change. |
| `NETWORK_ERROR` | Retry button on affected card; auto-retry once with 500ms backoff before surfacing. |
| `UNKNOWN` | Generic error card with "Copy diagnostic" button (logs go to `SPContext.logger` and to clipboard JSON). |

Components are wrapped in `<ErrorBoundary>` internally so a render-time bug doesn't blank the whole web part.

### Edge cases — explicit decisions

- **External / guest users.** `ensureUser(login)` is called before any operation. If the login can't be resolved, return `USER_NOT_FOUND`. We don't try to invite anyone.
- **Deleted users.** Stale role assignments to deleted users are filtered out of `getDirectListPermissions` (skip if `user.Deleted` or `user.IsHiddenInUI`). Never shown in diff results.
- **Deleted/renamed groups.** `getAllSiteGroups` is the source of truth. Memberships referencing a now-deleted group are dropped from `currentMembership` with a one-line warning logged.
- **Hidden lists.** `listsWithBrokenInheritance` and Level-1 scan **exclude** `Hidden = true` lists by default. Opt-in via `userAccessService.config.includeHiddenLists = true`.
- **"Limited Access" noise.** SharePoint adds "Limited Access" automatically when a user has access to a child. Filter `Limited Access` from displayed permission levels — not actionable, confuses users.
- **Many groups (20–50+).** `useSiteGroups` cache is 10 min so the picker doesn't refetch. Manage tab uses a virtualized list once group count > 50.
- **Concurrent edits.** Bulk-edit doesn't take a lock. On Apply, re-fetch `currentMembership` first and re-derive `pendingAdds`/`pendingRemoves` from the fresh server state — so if someone else added the user to a group while the dialog was open, we don't redundantly re-add. If a pending *remove* targets a group the user is no longer in (someone else already removed them), the operation is dropped before dispatch and reported in `IBulkResult.succeeded` (idempotent no-op). No error is surfaced for either case.
- **Bulk atomicity.** SP $batch is not transactional. We batch into one request but partial success is real, surfaced via `IBulkResult`. Confirmation dialog warns "Some changes may succeed while others fail."
- **No SPContext.** The service layer throws synchronously if `SPContext` isn't initialized — that's a programmer wiring error and should surface loudly to the developer. Hooks **catch** this and expose it as `error: UserAccessError({ code: 'UNKNOWN' })` so a missing-context bug never escapes a `useEffect`-style fetch into React's error boundary. Non-React service callers still see the throw.

- **Source coverage limits.** As called out in Section 3, the toolkit explains permissions in terms of **matched SharePoint role assignments** only. Entra ID security groups (used as principals), sharing links, app-only grants, and tenant-level overlays are not expanded. The `unexplainedDifference: true` annotation appears **only inside a Level-2 or Level-3 drill-down**, where effective permission masks for both users are actually fetched — not on the Compare tab's default Level-1 diff. The default Compare view shows only "matched SharePoint role assignments differ here"; the admin must click into a specific list (Level 2) or item (Level 3) to see a mask comparison and the `unexplainedDifference` flag if it applies. This preserves the progressive-disclosure guarantee.
- **Login format variation.** Service normalizes to `LoginName` at the boundary so cache keys are stable.

---

## 9. Exports & Documentation

### `package.json` additions

The toolkit uses explicit per-path `exports`. New entries:

```jsonc
"./utilities/userAccess":                         { ... lib/utilities/userAccess/index.* },
"./components/userAccess/MyAccessView":           { ... },
"./components/userAccess/UserAccessAdmin":        { ... },
"./components/userAccess/GroupMembersList":       { ... },
"./components/userAccess/PermissionLevelBadge":   { ... },
"./components/userAccess/UserGroupChips":         { ... },
"./components/userAccess/DirectPermissionsTable": { ... },
"./components/userAccess/RequirePermission":      { ... }
```

Hooks ride the existing `./hooks` export — added to `src/hooks/index.ts`. No per-hook export path (consistent with existing `useLocalStorage`, `useViewport`).

### Documentation

- Add an entry per importable unit to `docs/Importing-Components.md` (the authoritative reference per `CLAUDE.md`). One row per component/primitive/hook/utility with the exact copy-paste import path.
- README per surface component:
  - `src/components/userAccess/MyAccessView/README.md`
  - `src/components/userAccess/UserAccessAdmin/README.md`
  - `src/components/userAccess/GroupMembersList/README.md`
- Top-level `src/components/userAccess/README.md` explaining the read-vs-write split and which surface to pick.
- Short note in `CLAUDE.md`'s "Available Components" table.

### What does NOT change

- **Zero new peer dependencies.** Everything uses existing peer deps.
- **No path aliases.** Source uses relative imports per `CLAUDE.md`.
- **No modifications to `BatchBuilder`, `PermissionHelper`, `SPContext`, `ManageAccess`.** We consume them.
- **No new build scripts.** `npm run validate` already enforces required index files; new folders need `index.ts`.

---

## 10. Open Questions

None at this time. All decisions resolved during brainstorming.

---

## 11. Acceptance Criteria

A consuming web part can:

1. `import { MyAccessView } from 'spfx-toolkit/components/userAccess/MyAccessView'` and drop it on a UAT page; business user sees their groups + direct permissions without filing a ticket.
2. `import { UserAccessAdmin } from 'spfx-toolkit/components/userAccess/UserAccessAdmin'` and drop it on an admin page; admin can pick any user, compare two users, and bulk-edit one user's group memberships across 20+ groups in one batch.
3. `import { useUserAccess } from 'spfx-toolkit/hooks'` and build a custom UI on top of the same data layer without re-implementing SP calls.
4. `import { userAccessService } from 'spfx-toolkit/utilities/userAccess'` and call methods directly from non-React code.

Bundle expectations:

- `MyAccessView` page bundle does NOT include the bulk-edit code or PeoplePicker (separate import).
- Each primitive imports independently.

Behavioral:

- Default open of any inspection view fetches only Level 1 (one site-wide list call + one PnP batch of role-assignment reads).
- Bulk apply uses native PnP batching (`sp.batched()`), not `BatchBuilder`, and surfaces partial failures without throwing.
- Non-`ManageWeb` users see Browse/Compare inside `<UserAccessAdmin>` **only when** the consuming web part sets `allowBrowse={true}`. Manage Groups is hidden from them regardless.
- Hooks never throw to render: a missing `SPContext` surfaces as `error: UserAccessError({ code: 'UNKNOWN' })`.
- `useHasPermission` and `<RequirePermission>` take `PermissionKind` (from `@pnp/sp/security`), not `SPPermissionLevel`.
- Comparison view is Level-1 only by default. `unexplainedDifference: true` is only computed and surfaced after an explicit per-list (Level-2) or per-item (Level-3) drill-down for both users.
