# User Access Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `userAccess` module (shared service + 9 hooks + 4 surfaces + 4 primitives + 4 add-ons) so the consuming SPFx web parts repo can compose UAT-self-service ("My Access") and admin (Browse / Compare / Manage groups) features without re-implementing user/group/permission logic for each site.

**Architecture:** Single subsystem, two surfaces over a shared core. The core (`src/utilities/userAccess/`) holds pure logic + an SP-touching service; hooks (`src/hooks/*.ts`) are thin React adapters; UI components (`src/components/userAccess/`) compose hooks and Fluent UI. Progressive-disclosure loading (Level 1 / 2 / 3), native PnP batching (not `BatchBuilder`), and `PermissionKind`-based gating throughout. Spec: [`docs/superpowers/specs/2026-05-22-user-access-toolkit-design.md`](../specs/2026-05-22-user-access-toolkit-design.md).

**Tech Stack:** TypeScript 4.7+, React 17, `@pnp/sp` (PnPjs v3) with `@pnp/sp/batching`, `@fluentui/react@8.106` (tree-shaken imports), `@pnp/spfx-controls-react` (PeoplePicker), Node.js built-in test runner (`node:test`) for unit tests. **Zero new peer deps.**

**Testing convention (read first):**
- The toolkit's existing tests are all `node:test` ESM `.mjs` files under `tests/` that import from **`lib/`** (post-build), not `src/`. Pattern: `import { test, describe } from 'node:test'; import assert from 'node:assert/strict';`
- TDD loop here: write test → `npm run build` → `npm test -- <pattern>` → implement → `npm run build` → `npm test -- <pattern>`.
- Heavy testing on **pure** functions (diff, export, reducer, cache keys). SP-touching service methods get smoke-level tests with mocked PnP. React components and hooks have **no automated tests** (matches existing `ManageAccess`, `UserPersona`, etc.); each such task has a **Manual verification** step instead.
- Run a single test file: `npm test -- tests/utilities/userAccess/userAccessDiff.test.mjs` (the `--` forwards args to `node --test`).

**Commit style:** Match existing repo: `feat(userAccess): ...`, `test(userAccess): ...`, `docs(userAccess): ...`. Co-author trailer per `CLAUDE.md`.

---

## File Structure

### Pure logic (`src/utilities/userAccess/` — no React, no SP imports)
- `types.ts` — `IUserAccessLevel1`, `IListPermission`, `IItemPermission`, `IAccessDiff`, `ISiteGroup`, `ISiteUser`, `IDirectListPermission`, `IListWithUniqueRoles`, `IBulkResult`, `IBulkResultItem`, `IUserAccessConfig`.
- `UserAccessError.ts` — custom `Error` subclass with `{ code, login?, listRef?, itemId?, cause? }`.
- `loginNormalization.ts` — `normalizeLoginForCacheKey(input: string): string`.
- `cacheKeys.ts` — pure key builders (`level1Key`, `level2Key`, `level3Key`, `siteGroupsKey`, `groupMembersKey`).
- `userAccessDiff.ts` — `diffUserAccess(a: IUserAccessLevel1, b: IUserAccessLevel1): IAccessDiff`.
- `userAccessExport.ts` — `accessExportToCsv(payload: IUserAccessLevel1 | IAccessDiff): { filename: string; content: string }`.
- `membershipReducer.ts` — pure reducer `(state, action) => state` for `useGroupMembershipEditor`.
- `bulkResult.ts` — `emptyBulkResult()`, `mergeBulkResults(...)`, `isFullSuccess(r)`, `isFullFailure(r)`.

### SP-touching (`src/utilities/userAccess/` — uses `SPContext.sp`)
- `userAccessCache.ts` — window-level cache (namespaced `__spfx_toolkit_user_access_cache__`), per-entry TTL.
- `brokenInheritance.ts` — `getListsWithUniqueRoleAssignments(sp)` with server-side filter + client-side fallback.
- `userAccessService.ts` — public service object: all methods listed in spec §5.
- `index.ts` — re-exports the public surface.

### Hooks (`src/hooks/` — each its own file, added to existing folder)
- `useUserAccess.ts`, `useEffectiveListPermission.ts`, `useEffectiveItemPermission.ts`, `useSiteGroups.ts`, `useGroupMembers.ts`, `useGroupMembershipEditor.ts`, `useUserAccessComparison.ts`, `useHasPermission.ts`, `useBrokenInheritanceLists.ts`. Update `src/hooks/index.ts`.

### Components (`src/components/userAccess/`)
- `primitives/PermissionLevelBadge/{PermissionLevelBadge.tsx,PermissionLevelBadge.types.ts,PermissionLevelBadge.css,index.ts}`
- `primitives/RequirePermission/{RequirePermission.tsx,RequirePermission.types.ts,index.ts}`
- `primitives/UserGroupChips/{UserGroupChips.tsx,UserGroupChips.types.ts,UserGroupChips.css,index.ts}`
- `primitives/DirectPermissionsTable/{DirectPermissionsTable.tsx,DirectPermissionsTable.types.ts,DirectPermissionsTable.css,index.ts}`
- `MyAccessView/{MyAccessView.tsx,MyAccessView.types.ts,MyAccessView.css,index.ts,README.md}`
- `UserAccessAdmin/{UserAccessAdmin.tsx,UserAccessAdmin.types.ts,UserAccessAdmin.css,index.ts,README.md,tabs/{BrowseTab.tsx,CompareTab.tsx,ManageGroupsTab.tsx}}`
- `GroupMembersList/{GroupMembersList.tsx,GroupMembersList.types.ts,GroupMembersList.css,index.ts,README.md}`
- `index.ts`, `README.md`

### Wiring
- `package.json` — add 8 new `exports` entries.
- `docs/Importing-Components.md` — append rows for every new importable unit.
- `CLAUDE.md` — append entries to "Available Components" and "Custom Hooks" tables.
- `tests/utilities/userAccess/` — new test folder.

---

## Task Map

| # | Task | Phase |
|---|---|---|
| 1 | Types + `UserAccessError` | 0 — Pure |
| 2 | `loginNormalization` (TDD) | 0 — Pure |
| 3 | `cacheKeys` (TDD) | 0 — Pure |
| 4 | `userAccessDiff` (TDD) | 0 — Pure |
| 5 | `userAccessExport` / CSV (TDD) | 0 — Pure |
| 6 | `bulkResult` helpers (TDD) | 0 — Pure |
| 7 | `membershipReducer` (TDD) | 0 — Pure |
| 8 | `userAccessCache` (window-level) | 1 — Service |
| 9 | `brokenInheritance` (filter + fallback) | 1 — Service |
| 10 | `userAccessService` read methods (Level 1/2/3) | 1 — Service |
| 11 | `userAccessService` write methods (bulk group ops) | 1 — Service |
| 12 | `userAccessService` add-ons + barrel | 1 — Service |
| 13 | `useHasPermission` | 2 — Hooks |
| 14 | `useUserAccess` | 2 — Hooks |
| 15 | `useEffectiveListPermission` + `useEffectiveItemPermission` | 2 — Hooks |
| 16 | `useSiteGroups` + `useGroupMembers` + `useBrokenInheritanceLists` | 2 — Hooks |
| 17 | `useUserAccessComparison` | 2 — Hooks |
| 18 | `useGroupMembershipEditor` | 2 — Hooks |
| 19 | Hooks barrel | 2 — Hooks |
| 20 | `PermissionLevelBadge` | 3 — Primitives |
| 21 | `RequirePermission` | 3 — Primitives |
| 22 | `UserGroupChips` | 3 — Primitives |
| 23 | `DirectPermissionsTable` | 3 — Primitives |
| 24 | `MyAccessView` | 4 — Surfaces |
| 25 | `UserAccessAdmin` shell + gating | 4 — Surfaces |
| 26 | `BrowseTab` | 4 — Surfaces |
| 27 | `CompareTab` | 4 — Surfaces |
| 28 | `ManageGroupsTab` | 4 — Surfaces |
| 29 | `GroupMembersList` | 4 — Surfaces |
| 30 | `package.json` exports + `docs/Importing-Components.md` + `CLAUDE.md` | 5 — Wiring |
| 31 | READMEs (4) | 5 — Wiring |
| 32 | Final build + validate + manual verification matrix | 5 — Wiring |

---

## Phase 0 — Pure Logic Foundation

### Task 1: Types + `UserAccessError`

**Files:**
- Create: `src/utilities/userAccess/types.ts`
- Create: `src/utilities/userAccess/UserAccessError.ts`

- [ ] **Step 1: Write `types.ts`**

```typescript
// src/utilities/userAccess/types.ts
export type LoginInput = string | 'current';
export type ListRef = { id?: string; title?: string };

export interface ISiteUser {
  id: number;
  loginName: string;
  title: string;
  email?: string;
  isHiddenInUI?: boolean;
  deleted?: boolean;
}

export interface ISiteGroup {
  id: number;
  loginName: string;
  title: string;
  description?: string;
  ownerTitle?: string;
}

export interface IRoleDefinitionRef {
  id: number;
  name: string;
}

export interface IListWithUniqueRoles {
  id: string;
  title: string;
  hidden: boolean;
}

export type PermissionLevelLabel =
  | 'Owner'
  | 'Member'
  | 'Visitor'
  | 'Custom'
  | 'None';

export interface IDirectListPermission {
  list: IListWithUniqueRoles;
  /** "Direct" if granted to the user themselves, otherwise the group title that conveyed it. */
  source: 'Direct' | { viaGroupId: number; viaGroupTitle: string };
  roleDefinitions: IRoleDefinitionRef[];
  /** Derived label for badge display. */
  permissionLevel: PermissionLevelLabel;
}

export interface IUserAccessLevel1 {
  user: ISiteUser;
  siteGroups: ISiteGroup[];
  directListPermissions: IDirectListPermission[];
}

export interface IListPermission {
  list: IListWithUniqueRoles;
  permissionLevel: PermissionLevelLabel;
  /** Permission mask bits derived from the role definitions, as decimal strings. */
  permissionMask: { high: string; low: string };
  /** Matched role assignments (direct + via groups) that contributed. */
  matchedAssignments: Array<{
    principal: { type: 'user' | 'group'; id: number; title: string };
    roleDefinitions: IRoleDefinitionRef[];
  }>;
}

export interface IItemPermission extends IListPermission {
  itemId: number;
}

export interface IBulkResultItem {
  groupId: number;
  success: boolean;
  error?: string;
  /** True when the operation was a no-op because server state already matched intent. */
  idempotent?: boolean;
}

export interface IBulkResult {
  succeeded: number[];
  failed: Array<{ groupId: number; error: string }>;
  items: IBulkResultItem[];
}

export interface IAccessDiffSection {
  groups: ISiteGroup[];
  directListPermissions: IDirectListPermission[];
}

export interface IAccessDiff {
  userA: ISiteUser;
  userB: ISiteUser;
  common: IAccessDiffSection;
  onlyA: IAccessDiffSection;
  onlyB: IAccessDiffSection;
}

export interface IUserAccessConfig {
  /** Default false. When true, Level-1 scan and `listsWithBrokenInheritance` include hidden lists. */
  includeHiddenLists?: boolean;
}
```

- [ ] **Step 2: Write `UserAccessError.ts`**

```typescript
// src/utilities/userAccess/UserAccessError.ts
import type { ListRef } from './types';

export type UserAccessErrorCode =
  | 'USER_NOT_FOUND'
  | 'LIST_NOT_FOUND'
  | 'ITEM_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface IUserAccessErrorContext {
  login?: string;
  listRef?: ListRef;
  itemId?: number;
  cause?: unknown;
}

export class UserAccessError extends Error {
  public readonly code: UserAccessErrorCode;
  public readonly login?: string;
  public readonly listRef?: ListRef;
  public readonly itemId?: number;
  public readonly cause?: unknown;

  constructor(
    code: UserAccessErrorCode,
    message: string,
    context: IUserAccessErrorContext = {}
  ) {
    super(message);
    this.name = 'UserAccessError';
    this.code = code;
    this.login = context.login;
    this.listRef = context.listRef;
    this.itemId = context.itemId;
    this.cause = context.cause;
    Object.setPrototypeOf(this, UserAccessError.prototype);
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utilities/userAccess/types.ts src/utilities/userAccess/UserAccessError.ts
git commit -m "$(cat <<'EOF'
feat(userAccess): add core types and UserAccessError

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `loginNormalization` (TDD)

**Files:**
- Create: `src/utilities/userAccess/loginNormalization.ts`
- Create: `tests/utilities/userAccess/loginNormalization.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utilities/userAccess/loginNormalization.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLoginForCacheKey } from '../../../lib/utilities/userAccess/loginNormalization.js';

describe('normalizeLoginForCacheKey', () => {
  test('lowercases and trims plain email', () => {
    assert.equal(
      normalizeLoginForCacheKey('  Alice@Contoso.com  '),
      'alice@contoso.com'
    );
  });

  test('preserves claim format but lowercases', () => {
    assert.equal(
      normalizeLoginForCacheKey('i:0#.f|membership|Alice@Contoso.com'),
      'i:0#.f|membership|alice@contoso.com'
    );
  });

  test('returns "current" sentinel unchanged', () => {
    assert.equal(normalizeLoginForCacheKey('current'), 'current');
  });

  test('throws on empty string', () => {
    assert.throws(() => normalizeLoginForCacheKey(''), /empty login/i);
  });

  test('throws on null/undefined', () => {
    // @ts-expect-error testing runtime guard
    assert.throws(() => normalizeLoginForCacheKey(null), /invalid login/i);
    // @ts-expect-error testing runtime guard
    assert.throws(() => normalizeLoginForCacheKey(undefined), /invalid login/i);
  });
});
```

- [ ] **Step 2: Build and run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/loginNormalization.test.mjs`
Expected: build fails OR test fails with "Cannot find module" (file doesn't exist yet).

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/loginNormalization.ts

/**
 * Produces a stable cache key from a login string.
 *
 * Why: PeoplePicker may return claims-format strings, plain emails, or UPNs
 * for the same identity. Cache keys must collide for the same user, so we
 * lowercase and trim. The actual API-bound LoginName comes from
 * `sp.web.ensureUser(input)` — this helper is for cache keys only.
 */
export function normalizeLoginForCacheKey(input: string | 'current'): string {
  if (input === null || input === undefined) {
    throw new Error('Invalid login: null/undefined');
  }
  if (typeof input !== 'string') {
    throw new Error('Invalid login: not a string');
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid login: empty login');
  }
  return trimmed.toLowerCase();
}
```

- [ ] **Step 4: Build and run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/loginNormalization.test.mjs`
Expected: 5/5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/loginNormalization.ts tests/utilities/userAccess/loginNormalization.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add loginNormalization for stable cache keys

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `cacheKeys` (TDD)

**Files:**
- Create: `src/utilities/userAccess/cacheKeys.ts`
- Create: `tests/utilities/userAccess/cacheKeys.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utilities/userAccess/cacheKeys.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
  groupMembersKey,
  brokenInheritanceKey,
} from '../../../lib/utilities/userAccess/cacheKeys.js';

describe('cacheKeys', () => {
  test('level1Key normalizes login casing', () => {
    assert.equal(
      level1Key('Alice@Contoso.com'),
      level1Key('alice@contoso.com')
    );
  });

  test('level2Key includes listRef id when provided', () => {
    assert.equal(
      level2Key('a@x.com', { id: 'ABC-123' }),
      'l2:a@x.com:id=ABC-123'
    );
  });

  test('level2Key falls back to title when id absent', () => {
    assert.equal(
      level2Key('a@x.com', { title: 'Documents' }),
      'l2:a@x.com:title=Documents'
    );
  });

  test('level2Key throws if neither id nor title is provided', () => {
    assert.throws(() => level2Key('a@x.com', {}), /listRef/i);
  });

  test('level3Key includes itemId', () => {
    assert.equal(
      level3Key('a@x.com', { id: 'L1' }, 42),
      'l3:a@x.com:id=L1:item=42'
    );
  });

  test('siteGroupsKey is constant', () => {
    assert.equal(siteGroupsKey(), 'siteGroups');
  });

  test('groupMembersKey uses id when present, else name', () => {
    assert.equal(groupMembersKey({ id: 5 }), 'groupMembers:id=5');
    assert.equal(
      groupMembersKey({ name: 'Site Owners' }),
      'groupMembers:name=Site Owners'
    );
  });

  test('brokenInheritanceKey is constant', () => {
    assert.equal(brokenInheritanceKey(), 'brokenInheritance');
  });
});
```

- [ ] **Step 2: Build + run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/cacheKeys.test.mjs`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/cacheKeys.ts
import { normalizeLoginForCacheKey } from './loginNormalization';
import type { ListRef } from './types';

function listRefSegment(ref: ListRef): string {
  if (ref.id) return `id=${ref.id}`;
  if (ref.title) return `title=${ref.title}`;
  throw new Error('listRef: provide id or title');
}

export function level1Key(login: string): string {
  return `l1:${normalizeLoginForCacheKey(login)}`;
}

export function level2Key(login: string, listRef: ListRef): string {
  return `l2:${normalizeLoginForCacheKey(login)}:${listRefSegment(listRef)}`;
}

export function level3Key(
  login: string,
  listRef: ListRef,
  itemId: number
): string {
  return `l3:${normalizeLoginForCacheKey(login)}:${listRefSegment(listRef)}:item=${itemId}`;
}

export function siteGroupsKey(): string {
  return 'siteGroups';
}

export function groupMembersKey(ref: { id?: number; name?: string }): string {
  if (typeof ref.id === 'number') return `groupMembers:id=${ref.id}`;
  if (ref.name) return `groupMembers:name=${ref.name}`;
  throw new Error('groupRef: provide id or name');
}

export function brokenInheritanceKey(): string {
  return 'brokenInheritance';
}
```

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/cacheKeys.test.mjs`
Expected: 8/8 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/cacheKeys.ts tests/utilities/userAccess/cacheKeys.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add cacheKeys helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `userAccessDiff` (TDD)

**Files:**
- Create: `src/utilities/userAccess/userAccessDiff.ts`
- Create: `tests/utilities/userAccess/userAccessDiff.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utilities/userAccess/userAccessDiff.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { diffUserAccess } from '../../../lib/utilities/userAccess/userAccessDiff.js';

const user = (id, title) => ({ id, loginName: `${title}@x`, title });
const group = (id, title) => ({ id, loginName: `g-${id}`, title });
const list = (id, title) => ({ id, title, hidden: false });
const dlp = (listId, groupId, level = 'Member') => ({
  list: list(listId, `List-${listId}`),
  source: groupId ? { viaGroupId: groupId, viaGroupTitle: `G-${groupId}` } : 'Direct',
  roleDefinitions: [{ id: 1073741828, name: level }],
  permissionLevel: level,
});

describe('diffUserAccess', () => {
  test('common groups land in common; unique groups in onlyA/onlyB', () => {
    const a = {
      user: user(1, 'Alice'),
      siteGroups: [group(10, 'Owners'), group(20, 'Members')],
      directListPermissions: [],
    };
    const b = {
      user: user(2, 'Bob'),
      siteGroups: [group(20, 'Members'), group(30, 'Visitors')],
      directListPermissions: [],
    };

    const d = diffUserAccess(a, b);
    assert.deepEqual(d.common.groups.map(g => g.id), [20]);
    assert.deepEqual(d.onlyA.groups.map(g => g.id), [10]);
    assert.deepEqual(d.onlyB.groups.map(g => g.id), [30]);
    assert.equal(d.userA.id, 1);
    assert.equal(d.userB.id, 2);
  });

  test('direct list permissions are bucketed by listId + source identity', () => {
    const sameViaOwners = dlp('L1', 10, 'Owner');
    const sameViaOwners2 = dlp('L1', 10, 'Owner');
    const onlyA = dlp('L1', 20, 'Member');
    const onlyB = dlp('L2', 10, 'Owner');
    const a = { user: user(1, 'A'), siteGroups: [], directListPermissions: [sameViaOwners, onlyA] };
    const b = { user: user(2, 'B'), siteGroups: [], directListPermissions: [sameViaOwners2, onlyB] };
    const d = diffUserAccess(a, b);
    assert.equal(d.common.directListPermissions.length, 1);
    assert.equal(d.common.directListPermissions[0].list.id, 'L1');
    assert.equal(d.onlyA.directListPermissions.length, 1);
    assert.equal(d.onlyA.directListPermissions[0].list.id, 'L1');
    assert.equal(d.onlyB.directListPermissions.length, 1);
    assert.equal(d.onlyB.directListPermissions[0].list.id, 'L2');
  });

  test('empty inputs yield empty diff', () => {
    const a = { user: user(1, 'A'), siteGroups: [], directListPermissions: [] };
    const b = { user: user(2, 'B'), siteGroups: [], directListPermissions: [] };
    const d = diffUserAccess(a, b);
    assert.deepEqual(d.common.groups, []);
    assert.deepEqual(d.onlyA.groups, []);
    assert.deepEqual(d.onlyB.groups, []);
    assert.deepEqual(d.common.directListPermissions, []);
  });
});
```

- [ ] **Step 2: Build + run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/userAccessDiff.test.mjs`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/userAccessDiff.ts
import type {
  IAccessDiff,
  IDirectListPermission,
  ISiteGroup,
  IUserAccessLevel1,
} from './types';

function partitionById<T extends { id: number | string }>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  idOf: (item: T) => string
): { common: T[]; onlyA: T[]; onlyB: T[] } {
  const aMap = new Map(a.map(x => [idOf(x), x]));
  const bMap = new Map(b.map(x => [idOf(x), x]));
  const common: T[] = [];
  const onlyA: T[] = [];
  const onlyB: T[] = [];
  for (const [k, v] of aMap) {
    if (bMap.has(k)) common.push(v);
    else onlyA.push(v);
  }
  for (const [k, v] of bMap) {
    if (!aMap.has(k)) onlyB.push(v);
  }
  return { common, onlyA, onlyB };
}

function groupKey(g: ISiteGroup): string {
  return `g:${g.id}`;
}

function dlpKey(d: IDirectListPermission): string {
  const sourceKey =
    d.source === 'Direct' ? 'direct' : `via:${d.source.viaGroupId}`;
  return `l:${d.list.id}|s:${sourceKey}|lvl:${d.permissionLevel}`;
}

export function diffUserAccess(
  a: IUserAccessLevel1,
  b: IUserAccessLevel1
): IAccessDiff {
  const groups = partitionById(a.siteGroups, b.siteGroups, groupKey);
  const dlp = partitionById(
    a.directListPermissions as ReadonlyArray<IDirectListPermission & { id: number }>,
    b.directListPermissions as ReadonlyArray<IDirectListPermission & { id: number }>,
    dlpKey as unknown as (i: IDirectListPermission & { id: number }) => string
  );
  return {
    userA: a.user,
    userB: b.user,
    common: { groups: groups.common, directListPermissions: dlp.common },
    onlyA: { groups: groups.onlyA, directListPermissions: dlp.onlyA },
    onlyB: { groups: groups.onlyB, directListPermissions: dlp.onlyB },
  };
}
```

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/userAccessDiff.test.mjs`
Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/userAccessDiff.ts tests/utilities/userAccess/userAccessDiff.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add pure userAccessDiff function

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `userAccessExport` (TDD)

**Files:**
- Create: `src/utilities/userAccess/userAccessExport.ts`
- Create: `tests/utilities/userAccess/userAccessExport.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Build + run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/userAccessExport.test.mjs`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/userAccessExport.ts
import type {
  IAccessDiff,
  IAccessDiffSection,
  IDirectListPermission,
  ISiteGroup,
  ISiteUser,
  IUserAccessLevel1,
} from './types';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: ReadonlyArray<unknown>): string {
  return cells.map(csvEscape).join(',');
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localPart(email: string | undefined, fallback: string): string {
  if (!email) return fallback.toLowerCase().replace(/[^a-z0-9@.+-]/g, '');
  const at = email.indexOf('@');
  const stem = at > 0 ? email.slice(0, at) : email;
  return stem.toLowerCase().replace(/[^a-z0-9.+-]/g, '');
}

function groupsBlock(groups: ReadonlyArray<ISiteGroup>): string[] {
  const lines: string[] = [row(['Id', 'Title', 'Description'])];
  for (const g of groups) lines.push(row([g.id, g.title, g.description ?? '']));
  return lines;
}

function dlpBlock(items: ReadonlyArray<IDirectListPermission>): string[] {
  const lines: string[] = [
    row(['List Id', 'List Title', 'Source', 'Permission Level', 'Roles']),
  ];
  for (const d of items) {
    const source =
      d.source === 'Direct' ? 'Direct' : `Via ${d.source.viaGroupTitle}`;
    lines.push(
      row([
        d.list.id,
        d.list.title,
        source,
        d.permissionLevel,
        d.roleDefinitions.map(r => r.name).join('; '),
      ])
    );
  }
  return lines;
}

function level1Csv(p: IUserAccessLevel1): string {
  const parts: string[] = [];
  parts.push(`# User: ${p.user.title} <${p.user.email ?? ''}>`);
  parts.push(`# Generated: ${new Date().toISOString()}`);
  parts.push('');
  parts.push('# Site Groups');
  parts.push(...groupsBlock(p.siteGroups));
  parts.push('');
  parts.push('# Direct List Permissions');
  parts.push(...dlpBlock(p.directListPermissions));
  return parts.join('\n');
}

function sectionBlock(label: string, section: IAccessDiffSection): string[] {
  const lines: string[] = [];
  lines.push(`# ${label} — Groups`);
  lines.push(...groupsBlock(section.groups));
  lines.push('');
  lines.push(`# ${label} — Direct List Permissions`);
  lines.push(...dlpBlock(section.directListPermissions));
  lines.push('');
  return lines;
}

function diffCsv(diff: IAccessDiff): string {
  const parts: string[] = [];
  parts.push(`# Diff: ${diff.userA.title} vs ${diff.userB.title}`);
  parts.push(`# Generated: ${new Date().toISOString()}`);
  parts.push('');
  parts.push(...sectionBlock(`Only ${diff.userA.title}`, diff.onlyA));
  parts.push(...sectionBlock(`Common`, diff.common));
  parts.push(...sectionBlock(`Only ${diff.userB.title}`, diff.onlyB));
  return parts.join('\n');
}

function isDiff(p: IUserAccessLevel1 | IAccessDiff): p is IAccessDiff {
  return (p as IAccessDiff).userA !== undefined && (p as IAccessDiff).userB !== undefined;
}

export interface IExportResult {
  filename: string;
  content: string;
}

export function accessExportToCsv(
  payload: IUserAccessLevel1 | IAccessDiff
): IExportResult {
  if (isDiff(payload)) {
    return {
      filename: `user-access-diff-${localPart(payload.userA.email, payload.userA.title)}-vs-${localPart(payload.userB.email, payload.userB.title)}-${today()}.csv`,
      content: diffCsv(payload),
    };
  }
  return {
    filename: `user-access-${localPart(payload.user.email, payload.user.title)}-${today()}.csv`,
    content: level1Csv(payload),
  };
}
```

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/userAccessExport.test.mjs`
Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/userAccessExport.ts tests/utilities/userAccess/userAccessExport.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add accessExportToCsv utility

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `bulkResult` helpers (TDD)

**Files:**
- Create: `src/utilities/userAccess/bulkResult.ts`
- Create: `tests/utilities/userAccess/bulkResult.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utilities/userAccess/bulkResult.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  emptyBulkResult,
  fromItems,
  mergeBulkResults,
  isFullSuccess,
  isFullFailure,
} from '../../../lib/utilities/userAccess/bulkResult.js';

describe('bulkResult helpers', () => {
  test('emptyBulkResult is empty and fullSuccess by definition', () => {
    const r = emptyBulkResult();
    assert.deepEqual(r.succeeded, []);
    assert.deepEqual(r.failed, []);
    assert.deepEqual(r.items, []);
    assert.equal(isFullSuccess(r), true);
    assert.equal(isFullFailure(r), false);
  });

  test('fromItems separates succeeded vs. failed by item.success', () => {
    const items = [
      { groupId: 1, success: true },
      { groupId: 2, success: false, error: 'denied' },
      { groupId: 3, success: true, idempotent: true },
    ];
    const r = fromItems(items);
    assert.deepEqual(r.succeeded.sort(), [1, 3]);
    assert.deepEqual(r.failed, [{ groupId: 2, error: 'denied' }]);
    assert.equal(r.items.length, 3);
  });

  test('mergeBulkResults concatenates', () => {
    const a = fromItems([{ groupId: 1, success: true }]);
    const b = fromItems([{ groupId: 2, success: false, error: 'x' }]);
    const m = mergeBulkResults(a, b);
    assert.deepEqual(m.succeeded, [1]);
    assert.deepEqual(m.failed, [{ groupId: 2, error: 'x' }]);
    assert.equal(m.items.length, 2);
  });

  test('isFullSuccess / isFullFailure correctly classify mixed results', () => {
    const mixed = fromItems([
      { groupId: 1, success: true },
      { groupId: 2, success: false, error: 'x' },
    ]);
    assert.equal(isFullSuccess(mixed), false);
    assert.equal(isFullFailure(mixed), false);

    const allFail = fromItems([{ groupId: 1, success: false, error: 'x' }]);
    assert.equal(isFullFailure(allFail), true);
  });
});
```

- [ ] **Step 2: Build + run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/bulkResult.test.mjs`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/bulkResult.ts
import type { IBulkResult, IBulkResultItem } from './types';

export function emptyBulkResult(): IBulkResult {
  return { succeeded: [], failed: [], items: [] };
}

export function fromItems(items: ReadonlyArray<IBulkResultItem>): IBulkResult {
  const succeeded: number[] = [];
  const failed: Array<{ groupId: number; error: string }> = [];
  for (const it of items) {
    if (it.success) succeeded.push(it.groupId);
    else failed.push({ groupId: it.groupId, error: it.error ?? 'unknown' });
  }
  return { succeeded, failed, items: [...items] };
}

export function mergeBulkResults(...rs: ReadonlyArray<IBulkResult>): IBulkResult {
  const out = emptyBulkResult();
  for (const r of rs) {
    out.succeeded.push(...r.succeeded);
    out.failed.push(...r.failed);
    out.items.push(...r.items);
  }
  return out;
}

export function isFullSuccess(r: IBulkResult): boolean {
  return r.failed.length === 0;
}

export function isFullFailure(r: IBulkResult): boolean {
  return r.items.length > 0 && r.succeeded.length === 0;
}
```

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/bulkResult.test.mjs`
Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/bulkResult.ts tests/utilities/userAccess/bulkResult.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add bulkResult helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `membershipReducer` (TDD)

**Files:**
- Create: `src/utilities/userAccess/membershipReducer.ts`
- Create: `tests/utilities/userAccess/membershipReducer.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utilities/userAccess/membershipReducer.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  initMembershipState,
  membershipReducer,
  selectPendingAdds,
  selectPendingRemoves,
  selectIsDirty,
} from '../../../lib/utilities/userAccess/membershipReducer.js';

describe('membershipReducer', () => {
  test('initMembershipState seeds current and pending equally', () => {
    const s = initMembershipState([1, 2, 3]);
    assert.deepEqual([...s.currentMembership], [1, 2, 3]);
    assert.deepEqual([...s.pendingMembership], [1, 2, 3]);
    assert.equal(selectIsDirty(s), false);
  });

  test('toggle adds an absent groupId and removes a present one', () => {
    let s = initMembershipState([1, 2]);
    s = membershipReducer(s, { type: 'toggle', groupId: 3 });
    assert.equal(s.pendingMembership.has(3), true);
    assert.deepEqual(selectPendingAdds(s), [3]);
    s = membershipReducer(s, { type: 'toggle', groupId: 1 });
    assert.equal(s.pendingMembership.has(1), false);
    assert.deepEqual(selectPendingRemoves(s), [1]);
    assert.equal(selectIsDirty(s), true);
  });

  test('reset restores pending to current', () => {
    let s = initMembershipState([1, 2]);
    s = membershipReducer(s, { type: 'toggle', groupId: 3 });
    s = membershipReducer(s, { type: 'reset' });
    assert.deepEqual([...s.pendingMembership], [1, 2]);
    assert.equal(selectIsDirty(s), false);
  });

  test('setCurrent rebases both current and pending (post-refresh)', () => {
    let s = initMembershipState([1, 2]);
    s = membershipReducer(s, { type: 'toggle', groupId: 3 });
    s = membershipReducer(s, { type: 'setCurrent', current: [1, 3, 4] });
    assert.deepEqual([...s.currentMembership].sort(), [1, 3, 4]);
    assert.deepEqual([...s.pendingMembership].sort(), [1, 3, 4]);
    assert.equal(selectIsDirty(s), false);
  });

  test('selectors do not mutate state', () => {
    const s = initMembershipState([1, 2]);
    const before = [...s.pendingMembership];
    selectPendingAdds(s);
    selectPendingRemoves(s);
    assert.deepEqual([...s.pendingMembership], before);
  });
});
```

- [ ] **Step 2: Build + run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/membershipReducer.test.mjs`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/membershipReducer.ts

export interface IMembershipState {
  currentMembership: Set<number>;
  pendingMembership: Set<number>;
}

export type MembershipAction =
  | { type: 'toggle'; groupId: number }
  | { type: 'reset' }
  | { type: 'setCurrent'; current: ReadonlyArray<number> };

export function initMembershipState(
  current: ReadonlyArray<number>
): IMembershipState {
  const c = new Set(current);
  return { currentMembership: c, pendingMembership: new Set(c) };
}

export function membershipReducer(
  state: IMembershipState,
  action: MembershipAction
): IMembershipState {
  switch (action.type) {
    case 'toggle': {
      const next = new Set(state.pendingMembership);
      if (next.has(action.groupId)) next.delete(action.groupId);
      else next.add(action.groupId);
      return { ...state, pendingMembership: next };
    }
    case 'reset':
      return { ...state, pendingMembership: new Set(state.currentMembership) };
    case 'setCurrent': {
      const c = new Set(action.current);
      return { currentMembership: c, pendingMembership: new Set(c) };
    }
    default:
      return state;
  }
}

export function selectPendingAdds(s: IMembershipState): number[] {
  const out: number[] = [];
  for (const id of s.pendingMembership) {
    if (!s.currentMembership.has(id)) out.push(id);
  }
  return out;
}

export function selectPendingRemoves(s: IMembershipState): number[] {
  const out: number[] = [];
  for (const id of s.currentMembership) {
    if (!s.pendingMembership.has(id)) out.push(id);
  }
  return out;
}

export function selectIsDirty(s: IMembershipState): boolean {
  return (
    selectPendingAdds(s).length > 0 || selectPendingRemoves(s).length > 0
  );
}
```

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/membershipReducer.test.mjs`
Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/membershipReducer.ts tests/utilities/userAccess/membershipReducer.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add pure membershipReducer for bulk-edit state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Service Layer

> All Phase-1 modules import `SPContext` from `../context` and call PnP via `SPContext.sp`. Tests in this phase smoke-test only the **non-SP behavior** (cache eviction, login normalization, result aggregation); SP calls are verified manually in Phase 5's verification matrix.

### Task 8: `userAccessCache` (window-level cache)

**Files:**
- Create: `src/utilities/userAccess/userAccessCache.ts`
- Create: `tests/utilities/userAccess/userAccessCache.test.mjs`

This follows the existing `PermissionHelper.ts` window-cache pattern ([line 47](src/utilities/permissionHelper/PermissionHelper.ts#L47)) — one namespace key on `window`, per-entry TTL, no instance state.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utilities/userAccess/userAccessCache.test.mjs
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getCache,
  setCache,
  invalidatePrefix,
  clearAll,
} from '../../../lib/utilities/userAccess/userAccessCache.js';

// Stub window for the Node test environment
globalThis.window = globalThis.window || globalThis;

describe('userAccessCache', () => {
  beforeEach(() => clearAll());

  test('returns undefined when key missing', () => {
    assert.equal(getCache('missing'), undefined);
  });

  test('returns value within TTL', () => {
    setCache('k', { x: 1 }, 60_000);
    assert.deepEqual(getCache('k'), { x: 1 });
  });

  test('returns undefined when TTL has expired', async () => {
    setCache('k', { x: 1 }, 1); // 1ms TTL
    await new Promise(r => setTimeout(r, 10));
    assert.equal(getCache('k'), undefined);
  });

  test('invalidatePrefix removes matching keys only', () => {
    setCache('l1:a@x.com', 1, 60_000);
    setCache('l2:a@x.com:id=L1', 2, 60_000);
    setCache('l1:b@x.com', 3, 60_000);
    invalidatePrefix('l1:a@x.com');
    assert.equal(getCache('l1:a@x.com'), undefined);
    assert.equal(getCache('l2:a@x.com:id=L1'), 2);
    assert.equal(getCache('l1:b@x.com'), 3);
  });

  test('clearAll empties the cache', () => {
    setCache('k', 1, 60_000);
    clearAll();
    assert.equal(getCache('k'), undefined);
  });
});
```

- [ ] **Step 2: Build + run — verify failure**

Run: `npm run build && npm test -- tests/utilities/userAccess/userAccessCache.test.mjs`

- [ ] **Step 3: Implement**

```typescript
// src/utilities/userAccess/userAccessCache.ts

interface IEntry {
  value: unknown;
  expiresAt: number;
}

const CACHE_KEY = '__spfx_toolkit_user_access_cache__';

function store(): Map<string, IEntry> {
  const w = window as unknown as Record<string, Map<string, IEntry>>;
  if (!w[CACHE_KEY]) w[CACHE_KEY] = new Map();
  return w[CACHE_KEY];
}

export function getCache<T = unknown>(key: string): T | undefined {
  const entry = store().get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store().delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  store().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidate(key: string): void {
  store().delete(key);
}

export function invalidatePrefix(prefix: string): void {
  const s = store();
  for (const k of Array.from(s.keys())) {
    if (k.startsWith(prefix)) s.delete(k);
  }
}

export function clearAll(): void {
  store().clear();
}

/** Default TTLs (ms) per the spec §5. */
export const TTL = {
  level1: 5 * 60_000,
  level2: 2 * 60_000,
  level3: 1 * 60_000,
  siteGroups: 10 * 60_000,
  groupMembers: 5 * 60_000,
  brokenInheritance: 5 * 60_000,
} as const;
```

- [ ] **Step 4: Build + run — verify pass**

Run: `npm run build && npm test -- tests/utilities/userAccess/userAccessCache.test.mjs`
Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/userAccess/userAccessCache.ts tests/utilities/userAccess/userAccessCache.test.mjs
git commit -m "$(cat <<'EOF'
feat(userAccess): add window-level cache with TTLs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `brokenInheritance` (filter + client-side fallback)

**Files:**
- Create: `src/utilities/userAccess/brokenInheritance.ts`

Per spec §3, implementation must try `sp.web.lists.filter("HasUniqueRoleAssignments eq true")` server-side first, and fall back to client-side filtering if the server-side filter is rejected or returns suspicious output. No automated test (touches PnP / SPContext); verified in the manual matrix.

- [ ] **Step 1: Implement**

```typescript
// src/utilities/userAccess/brokenInheritance.ts
import { SPContext } from '../context';
import '@pnp/sp/lists';
import '@pnp/sp/webs';
import type { IListWithUniqueRoles, IUserAccessConfig } from './types';

type RawList = {
  Id: string;
  Title: string;
  Hidden: boolean;
  HasUniqueRoleAssignments?: boolean;
};

const SELECT = ['Id', 'Title', 'Hidden', 'HasUniqueRoleAssignments'] as const;

/**
 * Returns lists/libraries on the current web that have unique role assignments.
 *
 * Strategy: try a server-side $filter first (cheapest). If the filter is
 * rejected (some tenants/policies reject computed-property filters) or returns
 * data that doesn't look right, fall back to selecting the property and
 * filtering client-side. Decision is per-call: no permanent branch retained.
 */
export async function getListsWithUniqueRoleAssignments(
  config: IUserAccessConfig = {}
): Promise<IListWithUniqueRoles[]> {
  const lists = SPContext.sp.web.lists;

  let raw: RawList[];
  try {
    raw = (await lists
      .filter('HasUniqueRoleAssignments eq true')
      .select(...SELECT)()) as RawList[];

    // Sanity check: every row should actually have HasUniqueRoleAssignments=true.
    // If the server silently ignored the filter, fall back.
    const suspect = raw.some(r => r.HasUniqueRoleAssignments === false);
    if (suspect) throw new Error('server-side filter did not narrow results');
  } catch (err) {
    SPContext.logger.warn(
      'brokenInheritance: server-side filter unavailable, falling back to client-side',
      err
    );
    const all = (await lists.select(...SELECT)()) as RawList[];
    raw = all.filter(r => r.HasUniqueRoleAssignments === true);
  }

  const filtered = config.includeHiddenLists
    ? raw
    : raw.filter(r => !r.Hidden);

  return filtered.map<IListWithUniqueRoles>(r => ({
    id: r.Id,
    title: r.Title,
    hidden: r.Hidden,
  }));
}
```

- [ ] **Step 2: Build + type-check**

Run: `npm run build && npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utilities/userAccess/brokenInheritance.ts
git commit -m "$(cat <<'EOF'
feat(userAccess): add brokenInheritance scan with server-filter + client fallback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Service read methods (Level 1 / 2 / 3)

**Files:**
- Create: `src/utilities/userAccess/userAccessService.ts` (partial — read surface only; write methods added in Task 11)

- [ ] **Step 1: Implement**

```typescript
// src/utilities/userAccess/userAccessService.ts
import { SPContext } from '../context';
import '@pnp/sp/items';
import '@pnp/sp/lists';
import '@pnp/sp/security';
import '@pnp/sp/site-groups';
import '@pnp/sp/site-users';
import '@pnp/sp/webs';
import { PermissionKind } from '@pnp/sp/security';

import { getListsWithUniqueRoleAssignments } from './brokenInheritance';
import {
  brokenInheritanceKey,
  groupMembersKey,
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
} from './cacheKeys';
import { getCache, setCache, TTL } from './userAccessCache';
import { UserAccessError } from './UserAccessError';
import type {
  IDirectListPermission,
  IItemPermission,
  IListPermission,
  IListWithUniqueRoles,
  ISiteGroup,
  ISiteUser,
  IUserAccessConfig,
  IUserAccessLevel1,
  ListRef,
  LoginInput,
  PermissionLevelLabel,
} from './types';

let serviceConfig: IUserAccessConfig = {};

function logger() {
  return SPContext.logger;
}

async function ensureSiteUser(login: LoginInput): Promise<ISiteUser> {
  const sp = SPContext.sp;
  try {
    const raw: any =
      login === 'current'
        ? await sp.web.currentUser.select('Id', 'LoginName', 'Title', 'Email', 'IsHiddenInUI')()
        : await sp.web.ensureUser(login).then(r => r.data);
    return {
      id: raw.Id,
      loginName: raw.LoginName,
      title: raw.Title,
      email: raw.Email,
      isHiddenInUI: raw.IsHiddenInUI,
    };
  } catch (err) {
    throw new UserAccessError('USER_NOT_FOUND', `Cannot resolve login: ${login}`, {
      login: String(login),
      cause: err,
    });
  }
}

async function getUserSiteGroupsRaw(userId: number): Promise<ISiteGroup[]> {
  const raw: any[] = await SPContext.sp.web.siteUsers
    .getById(userId)
    .groups.select('Id', 'LoginName', 'Title', 'Description')();
  return raw.map(g => ({
    id: g.Id,
    loginName: g.LoginName,
    title: g.Title,
    description: g.Description,
  }));
}

function derivePermissionLevel(
  roleNames: ReadonlyArray<string>
): PermissionLevelLabel {
  // Filter the noisy auto-applied level
  const filtered = roleNames.filter(n => n !== 'Limited Access');
  if (filtered.length === 0) return 'None';
  if (filtered.includes('Full Control')) return 'Owner';
  if (filtered.some(n => n === 'Edit' || n === 'Contribute')) return 'Member';
  if (filtered.includes('Read')) return 'Visitor';
  return 'Custom';
}

interface IRawRoleAssignment {
  Member: {
    Id: number;
    PrincipalType: number; // 1=User, 8=SharePointGroup
    Title: string;
    LoginName?: string;
  };
  RoleDefinitionBindings: Array<{ Id: number; Name: string; Hidden?: boolean }>;
}

async function fetchListRoleAssignments(
  listId: string
): Promise<IRawRoleAssignment[]> {
  return (await SPContext.sp.web.lists
    .getById(listId)
    .roleAssignments.expand('Member', 'RoleDefinitionBindings')
    .select(
      'Member/Id',
      'Member/PrincipalType',
      'Member/Title',
      'Member/LoginName',
      'RoleDefinitionBindings/Id',
      'RoleDefinitionBindings/Name',
      'RoleDefinitionBindings/Hidden'
    )()) as IRawRoleAssignment[];
}

function matchAssignments(
  assignments: ReadonlyArray<IRawRoleAssignment>,
  user: ISiteUser,
  groupIds: Set<number>
): IRawRoleAssignment[] {
  return assignments.filter(a => {
    const m = a.Member;
    if (m.PrincipalType === 1) return m.Id === user.id;
    if (m.PrincipalType === 8) return groupIds.has(m.Id);
    return false;
  });
}

function buildDirectListPermission(
  list: IListWithUniqueRoles,
  matched: IRawRoleAssignment,
  user: ISiteUser
): IDirectListPermission {
  const isDirect = matched.Member.PrincipalType === 1 && matched.Member.Id === user.id;
  const roles = matched.RoleDefinitionBindings.filter(r => !r.Hidden);
  return {
    list,
    source: isDirect
      ? 'Direct'
      : { viaGroupId: matched.Member.Id, viaGroupTitle: matched.Member.Title },
    roleDefinitions: roles.map(r => ({ id: r.Id, name: r.Name })),
    permissionLevel: derivePermissionLevel(roles.map(r => r.Name)),
  };
}

// =========================================================================
// Public surface
// =========================================================================

export const userAccessService = {
  configure(cfg: IUserAccessConfig): void {
    serviceConfig = { ...serviceConfig, ...cfg };
  },

  async getUserAccessLevel1(login: LoginInput): Promise<IUserAccessLevel1> {
    const cacheKey = level1Key(login === 'current' ? 'current' : login);
    const cached = getCache<IUserAccessLevel1>(cacheKey);
    if (cached) return cached;

    const user = await ensureSiteUser(login);
    if (user.isHiddenInUI) {
      throw new UserAccessError('USER_NOT_FOUND', 'User hidden / deleted', {
        login: String(login),
      });
    }

    const [siteGroups, brokenLists] = await Promise.all([
      getUserSiteGroupsRaw(user.id),
      getListsWithUniqueRoleAssignments(serviceConfig),
    ]);
    const groupIdSet = new Set(siteGroups.map(g => g.id));

    // PnP batch: fetch role assignments for every broken-inheritance list in one round trip.
    const directListPermissions: IDirectListPermission[] = [];
    if (brokenLists.length > 0) {
      const [spBatch, execute] = SPContext.sp.batched();
      const promises = brokenLists.map(list =>
        (spBatch.web.lists
          .getById(list.id)
          .roleAssignments.expand('Member', 'RoleDefinitionBindings')
          .select(
            'Member/Id',
            'Member/PrincipalType',
            'Member/Title',
            'Member/LoginName',
            'RoleDefinitionBindings/Id',
            'RoleDefinitionBindings/Name',
            'RoleDefinitionBindings/Hidden'
          )() as Promise<IRawRoleAssignment[]>).then(asg => ({ list, asg }))
      );
      await execute();
      const settled = await Promise.all(promises);

      for (const { list, asg } of settled) {
        const matched = matchAssignments(asg, user, groupIdSet);
        for (const m of matched) {
          directListPermissions.push(buildDirectListPermission(list, m, user));
        }
      }
    }

    const result: IUserAccessLevel1 = {
      user,
      siteGroups,
      directListPermissions,
    };
    setCache(cacheKey, result, TTL.level1);
    logger().info('userAccess.getUserAccessLevel1', {
      login,
      groupCount: siteGroups.length,
      directPermsCount: directListPermissions.length,
    });
    return result;
  },

  async getEffectiveListPermission(
    login: LoginInput,
    listRef: ListRef
  ): Promise<IListPermission> {
    if (!listRef.id && !listRef.title) {
      throw new UserAccessError('LIST_NOT_FOUND', 'listRef requires id or title');
    }
    const cacheKey = level2Key(login === 'current' ? 'current' : login, listRef);
    const cached = getCache<IListPermission>(cacheKey);
    if (cached) return cached;

    const user = await ensureSiteUser(login);
    const list = listRef.id
      ? SPContext.sp.web.lists.getById(listRef.id)
      : SPContext.sp.web.lists.getByTitle(listRef.title!);

    let listInfo: IListWithUniqueRoles;
    try {
      const info: any = await list.select('Id', 'Title', 'Hidden')();
      listInfo = { id: info.Id, title: info.Title, hidden: info.Hidden };
    } catch (err) {
      throw new UserAccessError('LIST_NOT_FOUND', 'List not found', {
        listRef,
        cause: err,
      });
    }

    const userGroups = await getUserSiteGroupsRaw(user.id);
    const groupIds = new Set(userGroups.map(g => g.id));

    const assignments = await fetchListRoleAssignments(listInfo.id);
    const matched = matchAssignments(assignments, user, groupIds);
    const allRoles = matched.flatMap(m =>
      m.RoleDefinitionBindings.filter(r => !r.Hidden)
    );
    const permissionLevel = derivePermissionLevel(allRoles.map(r => r.Name));

    // Mask comparison
    const perms: any = await list.getUserEffectivePermissions(user.loginName);

    const result: IListPermission = {
      list: listInfo,
      permissionLevel,
      permissionMask: { high: String(perms.High), low: String(perms.Low) },
      matchedAssignments: matched.map(m => ({
        principal: {
          type: m.Member.PrincipalType === 1 ? 'user' : 'group',
          id: m.Member.Id,
          title: m.Member.Title,
        },
        roleDefinitions: m.RoleDefinitionBindings.filter(r => !r.Hidden).map(r => ({
          id: r.Id,
          name: r.Name,
        })),
      })),
    };
    setCache(cacheKey, result, TTL.level2);
    return result;
  },

  async getEffectiveItemPermission(
    login: LoginInput,
    listRef: ListRef,
    itemId: number
  ): Promise<IItemPermission> {
    if (typeof itemId !== 'number' || isNaN(itemId)) {
      throw new UserAccessError('ITEM_NOT_FOUND', 'itemId must be a number', {
        itemId,
        listRef,
      });
    }
    const cacheKey = level3Key(
      login === 'current' ? 'current' : login,
      listRef,
      itemId
    );
    const cached = getCache<IItemPermission>(cacheKey);
    if (cached) return cached;

    const user = await ensureSiteUser(login);
    const list = listRef.id
      ? SPContext.sp.web.lists.getById(listRef.id)
      : SPContext.sp.web.lists.getByTitle(listRef.title!);

    let listInfo: IListWithUniqueRoles;
    try {
      const info: any = await list.select('Id', 'Title', 'Hidden')();
      listInfo = { id: info.Id, title: info.Title, hidden: info.Hidden };
    } catch (err) {
      throw new UserAccessError('LIST_NOT_FOUND', 'List not found', {
        listRef,
        cause: err,
      });
    }

    let perms: any;
    try {
      perms = await list.items.getById(itemId).getUserEffectivePermissions(user.loginName);
    } catch (err) {
      throw new UserAccessError('ITEM_NOT_FOUND', 'Item not found or no access', {
        itemId,
        listRef,
        cause: err,
      });
    }

    // Walk role assignments on the item (only meaningful if item has unique perms)
    const item = list.items.getById(itemId);
    let matchedAssignments: IListPermission['matchedAssignments'] = [];
    try {
      const userGroups = await getUserSiteGroupsRaw(user.id);
      const groupIds = new Set(userGroups.map(g => g.id));
      const raw = (await item.roleAssignments
        .expand('Member', 'RoleDefinitionBindings')
        .select(
          'Member/Id',
          'Member/PrincipalType',
          'Member/Title',
          'Member/LoginName',
          'RoleDefinitionBindings/Id',
          'RoleDefinitionBindings/Name',
          'RoleDefinitionBindings/Hidden'
        )()) as IRawRoleAssignment[];
      const matched = matchAssignments(raw, user, groupIds);
      matchedAssignments = matched.map(m => ({
        principal: {
          type: m.Member.PrincipalType === 1 ? 'user' : 'group',
          id: m.Member.Id,
          title: m.Member.Title,
        },
        roleDefinitions: m.RoleDefinitionBindings.filter(r => !r.Hidden).map(r => ({
          id: r.Id,
          name: r.Name,
        })),
      }));
    } catch {
      // Item likely inherits — role assignments lookup is best-effort.
    }

    const allRoles = matchedAssignments.flatMap(m => m.roleDefinitions);
    const result: IItemPermission = {
      list: listInfo,
      itemId,
      permissionLevel: derivePermissionLevel(allRoles.map(r => r.name)),
      permissionMask: { high: String(perms.High), low: String(perms.Low) },
      matchedAssignments,
    };
    setCache(cacheKey, result, TTL.level3);
    return result;
  },
};
```

- [ ] **Step 2: Build + type-check**

Run: `npm run build && npm run type-check`
Expected: no errors. If `currentUser.select(...)` chain rejects on type, drop the `.select(...)` and use `currentUser()`.

- [ ] **Step 3: Commit**

```bash
git add src/utilities/userAccess/userAccessService.ts
git commit -m "$(cat <<'EOF'
feat(userAccess): add service read methods (Level 1/2/3)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Service write methods (bulk group ops)

**Files:**
- Modify: `src/utilities/userAccess/userAccessService.ts`

- [ ] **Step 1: Add the bulk group methods to the exported `userAccessService` object**

Append to the object literal (or convert to a named-export block). Show the additions:

```typescript
// Inside the userAccessService object — additional methods.

  async getAllSiteGroups(): Promise<ISiteGroup[]> {
    const key = siteGroupsKey();
    const cached = getCache<ISiteGroup[]>(key);
    if (cached) return cached;
    const raw: any[] = await SPContext.sp.web.siteGroups.select(
      'Id', 'LoginName', 'Title', 'Description', 'OwnerTitle'
    )();
    const result = raw.map<ISiteGroup>(g => ({
      id: g.Id,
      loginName: g.LoginName,
      title: g.Title,
      description: g.Description,
      ownerTitle: g.OwnerTitle,
    }));
    setCache(key, result, TTL.siteGroups);
    return result;
  },

  async addUserToGroups(
    login: LoginInput,
    groupIds: ReadonlyArray<number>
  ): Promise<import('./types').IBulkResult> {
    const { fromItems } = await import('./bulkResult');
    const { invalidatePrefix } = await import('./userAccessCache');
    const { level1Key, siteGroupsKey } = await import('./cacheKeys');
    if (groupIds.length === 0) return { succeeded: [], failed: [], items: [] };
    const user = await ensureSiteUser(login);

    const [spBatch, execute] = SPContext.sp.batched();
    const items: Array<{ groupId: number; success: boolean; error?: string }> = [];
    const promises = groupIds.map(gid =>
      spBatch.web.siteGroups
        .getById(gid)
        .users.add(user.loginName)
        .then(
          () => items.push({ groupId: gid, success: true }),
          err =>
            items.push({
              groupId: gid,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
        )
    );
    await execute();
    await Promise.all(promises);

    invalidatePrefix(level1Key(login === 'current' ? 'current' : login));
    invalidatePrefix(siteGroupsKey()); // member counts changed
    return fromItems(items);
  },

  async removeUserFromGroups(
    login: LoginInput,
    groupIds: ReadonlyArray<number>
  ): Promise<import('./types').IBulkResult> {
    const { fromItems } = await import('./bulkResult');
    const { invalidatePrefix } = await import('./userAccessCache');
    const { level1Key, siteGroupsKey } = await import('./cacheKeys');
    if (groupIds.length === 0) return { succeeded: [], failed: [], items: [] };
    const user = await ensureSiteUser(login);

    const [spBatch, execute] = SPContext.sp.batched();
    const items: Array<{ groupId: number; success: boolean; error?: string; idempotent?: boolean }> = [];
    const promises = groupIds.map(gid =>
      spBatch.web.siteGroups
        .getById(gid)
        .users.removeByLoginName(user.loginName)
        .then(
          () => items.push({ groupId: gid, success: true }),
          err =>
            items.push({
              groupId: gid,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
        )
    );
    await execute();
    await Promise.all(promises);

    invalidatePrefix(level1Key(login === 'current' ? 'current' : login));
    invalidatePrefix(siteGroupsKey());
    return fromItems(items);
  },
```

Replace the dynamic `await import(...)` calls above with static top-of-file imports if linting prefers; the dynamic form here exists only so the snippet is self-contained when reviewing this task in isolation.

- [ ] **Step 2: Move imports to the top of the file**

Add to the top imports of `userAccessService.ts`:

```typescript
import { fromItems } from './bulkResult';
import { invalidate, invalidatePrefix } from './userAccessCache';
```

And remove the `await import(...)` calls inside the methods.

- [ ] **Step 3: Build + type-check**

Run: `npm run build && npm run type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utilities/userAccess/userAccessService.ts
git commit -m "$(cat <<'EOF'
feat(userAccess): add bulk group membership ops via PnP batched()

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Service add-ons + barrel

**Files:**
- Modify: `src/utilities/userAccess/userAccessService.ts`
- Create: `src/utilities/userAccess/index.ts`

- [ ] **Step 1: Add `diffUserAccess`, `listsWithBrokenInheritance`, `getGroupMembers` to the service**

```typescript
// Inside userAccessService — additional methods.

  async diffUserAccess(
    loginA: LoginInput,
    loginB: LoginInput
  ): Promise<import('./types').IAccessDiff> {
    const { diffUserAccess } = await import('./userAccessDiff');
    const [a, b] = await Promise.all([
      this.getUserAccessLevel1(loginA),
      this.getUserAccessLevel1(loginB),
    ]);
    return diffUserAccess(a, b);
  },

  async listsWithBrokenInheritance(): Promise<IListWithUniqueRoles[]> {
    const key = brokenInheritanceKey();
    const cached = getCache<IListWithUniqueRoles[]>(key);
    if (cached) return cached;
    const result = await getListsWithUniqueRoleAssignments(serviceConfig);
    setCache(key, result, TTL.brokenInheritance);
    return result;
  },

  async getGroupMembers(ref: { id?: number; name?: string }): Promise<ISiteUser[]> {
    const key = groupMembersKey(ref);
    const cached = getCache<ISiteUser[]>(key);
    if (cached) return cached;
    const group = ref.id
      ? SPContext.sp.web.siteGroups.getById(ref.id)
      : SPContext.sp.web.siteGroups.getByName(ref.name!);
    const raw: any[] = await group.users.select(
      'Id', 'LoginName', 'Title', 'Email', 'IsHiddenInUI'
    )();
    const result = raw.map<ISiteUser>(u => ({
      id: u.Id,
      loginName: u.LoginName,
      title: u.Title,
      email: u.Email,
      isHiddenInUI: u.IsHiddenInUI,
    }));
    setCache(key, result, TTL.groupMembers);
    return result;
  },
```

Move the `await import('./userAccessDiff')` to a top-level import.

- [ ] **Step 2: Create the barrel**

```typescript
// src/utilities/userAccess/index.ts
export { userAccessService } from './userAccessService';
export { UserAccessError } from './UserAccessError';
export type { UserAccessErrorCode } from './UserAccessError';
export { diffUserAccess } from './userAccessDiff';
export { accessExportToCsv } from './userAccessExport';
export type { IExportResult } from './userAccessExport';
export {
  emptyBulkResult,
  fromItems,
  mergeBulkResults,
  isFullSuccess,
  isFullFailure,
} from './bulkResult';
export {
  initMembershipState,
  membershipReducer,
  selectPendingAdds,
  selectPendingRemoves,
  selectIsDirty,
} from './membershipReducer';
export type { IMembershipState, MembershipAction } from './membershipReducer';
export {
  level1Key,
  level2Key,
  level3Key,
  siteGroupsKey,
  groupMembersKey,
  brokenInheritanceKey,
} from './cacheKeys';
export { normalizeLoginForCacheKey } from './loginNormalization';
export { getListsWithUniqueRoleAssignments } from './brokenInheritance';
export {
  getCache,
  setCache,
  invalidate,
  invalidatePrefix,
  clearAll,
  TTL,
} from './userAccessCache';
export type {
  IAccessDiff,
  IAccessDiffSection,
  IBulkResult,
  IBulkResultItem,
  IDirectListPermission,
  IItemPermission,
  IListPermission,
  IListWithUniqueRoles,
  IRoleDefinitionRef,
  ISiteGroup,
  ISiteUser,
  IUserAccessConfig,
  IUserAccessLevel1,
  ListRef,
  LoginInput,
  PermissionLevelLabel,
} from './types';
```

- [ ] **Step 3: Build + type-check + validate**

Run: `npm run build && npm run type-check && npm run validate`
Expected: no errors; validation passes (no missing index files).

- [ ] **Step 4: Commit**

```bash
git add src/utilities/userAccess/userAccessService.ts src/utilities/userAccess/index.ts
git commit -m "$(cat <<'EOF'
feat(userAccess): finish service add-ons + add module barrel

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Hooks

> All hooks follow the same shape (spec §6). They never throw to render; service errors are caught and surfaced as `error: UserAccessError`. Null arg → idle (no fetch).
>
> **No automated tests for hooks** — matches existing toolkit convention (`useLocalStorage`, `useViewport` have no tests). React-rendering correctness is verified in Phase 5 via the manual verification matrix and the consuming web part dev loop.

### Common hook helper (used by every hook)

When implementing each hook, factor out this internal helper at the top of the first hook you build, then re-use:

```typescript
// Local to each hook (or extracted to src/hooks/_useAsyncResource.ts if duplicated)
// NOTE: Keep this private to the hooks folder; don't export.
import * as React from 'react';
import { UserAccessError } from '../utilities/userAccess';

interface IAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: UserAccessError | null;
}

function toUserAccessError(err: unknown): UserAccessError {
  if (err instanceof UserAccessError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new UserAccessError('UNKNOWN', msg, { cause: err });
}
```

After Task 14 implements the first hook, extract this to `src/hooks/_useAsyncResource.ts` and re-use.

---

### Task 13: `useHasPermission`

**Files:**
- Create: `src/hooks/useHasPermission.ts`

- [ ] **Step 1: Implement**

```typescript
// src/hooks/useHasPermission.ts
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import '@pnp/sp/security';
import '@pnp/sp/webs';
import { SPContext } from '../utilities/context';
import { UserAccessError } from '../utilities/userAccess';

export interface IUseHasPermissionResult {
  allowed: boolean;
  loading: boolean;
  error: UserAccessError | null;
}

export function useHasPermission(
  kind: PermissionKind = PermissionKind.ManageWeb
): IUseHasPermissionResult {
  const [state, setState] = React.useState<IUseHasPermissionResult>({
    allowed: false,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const ok: boolean = await SPContext.sp.web.currentUserHasPermissions(kind);
        if (!cancelled) setState({ allowed: ok, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setState({
            allowed: false,
            loading: false,
            error: new UserAccessError('UNKNOWN', msg, { cause: err }),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return state;
}
```

- [ ] **Step 2: Build + type-check**

Run: `npm run build && npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHasPermission.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useHasPermission (PermissionKind-based gate)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: `useUserAccess`

**Files:**
- Create: `src/hooks/_useAsyncResource.ts`
- Create: `src/hooks/useUserAccess.ts`

- [ ] **Step 1: Extract the shared async helper**

```typescript
// src/hooks/_useAsyncResource.ts
// Private helper for userAccess hooks. Do NOT export from src/hooks/index.ts.
import * as React from 'react';
import { UserAccessError } from '../utilities/userAccess';

export interface IAsyncResourceState<T> {
  data: T | null;
  loading: boolean;
  error: UserAccessError | null;
}

export interface IAsyncResource<T> extends IAsyncResourceState<T> {
  refresh: () => void;
}

export function toUserAccessError(err: unknown): UserAccessError {
  if (err instanceof UserAccessError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new UserAccessError('UNKNOWN', msg, { cause: err });
}

/**
 * Generic async resource hook. Returns idle ({ data: null, loading: false })
 * when `enabled === false`. Caller controls when to fetch.
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  enabled: boolean
): IAsyncResource<T> {
  const [state, setState] = React.useState<IAsyncResourceState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState(s => ({ data: s.data, loading: true, error: null }));
    fetcher().then(
      data => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      err => {
        if (!cancelled)
          setState({ data: null, loading: false, error: toUserAccessError(err) });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const refresh = React.useCallback(() => setTick(t => t + 1), []);
  return { ...state, refresh };
}
```

- [ ] **Step 2: Implement `useUserAccess`**

```typescript
// src/hooks/useUserAccess.ts
import {
  invalidatePrefix,
  level1Key,
  userAccessService,
} from '../utilities/userAccess';
import type { IUserAccessLevel1, LoginInput } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseUserAccessResult = IAsyncResource<IUserAccessLevel1>;

export function useUserAccess(
  login: LoginInput | null
): UseUserAccessResult {
  const enabled = login !== null && login !== undefined;
  const resource = useAsyncResource<IUserAccessLevel1>(
    () => userAccessService.getUserAccessLevel1(login as LoginInput),
    [login],
    enabled
  );

  // refresh() must also bust the service-level cache for this login,
  // otherwise the next call returns stale cached data.
  const refresh = (): void => {
    if (login) {
      const key = level1Key(login === 'current' ? 'current' : login);
      invalidatePrefix(key);
    }
    resource.refresh();
  };

  return { ...resource, refresh };
}
```

- [ ] **Step 3: Build + type-check**

Run: `npm run build && npm run type-check`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/_useAsyncResource.ts src/hooks/useUserAccess.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useUserAccess + shared _useAsyncResource helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: `useEffectiveListPermission` + `useEffectiveItemPermission`

**Files:**
- Create: `src/hooks/useEffectiveListPermission.ts`
- Create: `src/hooks/useEffectiveItemPermission.ts`

- [ ] **Step 1: Implement `useEffectiveListPermission`**

```typescript
// src/hooks/useEffectiveListPermission.ts
import {
  invalidatePrefix,
  level2Key,
  userAccessService,
} from '../utilities/userAccess';
import type {
  IListPermission,
  ListRef,
  LoginInput,
} from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseEffectiveListPermissionResult = IAsyncResource<IListPermission>;

export function useEffectiveListPermission(
  login: LoginInput | null,
  listRef: ListRef | null
): UseEffectiveListPermissionResult {
  const enabled =
    login !== null &&
    login !== undefined &&
    listRef !== null &&
    listRef !== undefined &&
    (!!listRef.id || !!listRef.title);

  const resource = useAsyncResource<IListPermission>(
    () =>
      userAccessService.getEffectiveListPermission(
        login as LoginInput,
        listRef as ListRef
      ),
    [login, listRef?.id, listRef?.title],
    enabled
  );

  const refresh = (): void => {
    if (login && listRef) {
      const key = level2Key(login === 'current' ? 'current' : login, listRef);
      invalidatePrefix(key);
    }
    resource.refresh();
  };

  return { ...resource, refresh };
}
```

- [ ] **Step 2: Implement `useEffectiveItemPermission`**

```typescript
// src/hooks/useEffectiveItemPermission.ts
import {
  invalidatePrefix,
  level3Key,
  userAccessService,
} from '../utilities/userAccess';
import type {
  IItemPermission,
  ListRef,
  LoginInput,
} from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseEffectiveItemPermissionResult = IAsyncResource<IItemPermission>;

export function useEffectiveItemPermission(
  login: LoginInput | null,
  listRef: ListRef | null,
  itemId: number | null
): UseEffectiveItemPermissionResult {
  const enabled =
    login !== null &&
    login !== undefined &&
    listRef !== null &&
    listRef !== undefined &&
    (!!listRef.id || !!listRef.title) &&
    typeof itemId === 'number';

  const resource = useAsyncResource<IItemPermission>(
    () =>
      userAccessService.getEffectiveItemPermission(
        login as LoginInput,
        listRef as ListRef,
        itemId as number
      ),
    [login, listRef?.id, listRef?.title, itemId],
    enabled
  );

  const refresh = (): void => {
    if (login && listRef && typeof itemId === 'number') {
      const key = level3Key(
        login === 'current' ? 'current' : login,
        listRef,
        itemId
      );
      invalidatePrefix(key);
    }
    resource.refresh();
  };

  return { ...resource, refresh };
}
```

- [ ] **Step 3: Build + type-check + commit**

```bash
npm run build && npm run type-check
git add src/hooks/useEffectiveListPermission.ts src/hooks/useEffectiveItemPermission.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useEffectiveListPermission + useEffectiveItemPermission

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: `useSiteGroups` + `useGroupMembers` + `useBrokenInheritanceLists`

**Files:**
- Create: `src/hooks/useSiteGroups.ts`
- Create: `src/hooks/useGroupMembers.ts`
- Create: `src/hooks/useBrokenInheritanceLists.ts`

- [ ] **Step 1: `useSiteGroups`**

```typescript
// src/hooks/useSiteGroups.ts
import {
  invalidatePrefix,
  siteGroupsKey,
  userAccessService,
} from '../utilities/userAccess';
import type { ISiteGroup } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseSiteGroupsResult = IAsyncResource<ISiteGroup[]>;

export function useSiteGroups(): UseSiteGroupsResult {
  const resource = useAsyncResource<ISiteGroup[]>(
    () => userAccessService.getAllSiteGroups(),
    [],
    true
  );

  const refresh = (): void => {
    invalidatePrefix(siteGroupsKey());
    resource.refresh();
  };

  return { ...resource, refresh };
}
```

- [ ] **Step 2: `useGroupMembers`**

```typescript
// src/hooks/useGroupMembers.ts
import {
  groupMembersKey,
  invalidatePrefix,
  userAccessService,
} from '../utilities/userAccess';
import type { ISiteUser } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type GroupRef = { id?: number; name?: string };
export type UseGroupMembersResult = IAsyncResource<ISiteUser[]>;

export function useGroupMembers(ref: GroupRef | null): UseGroupMembersResult {
  const enabled =
    ref !== null && ref !== undefined && (typeof ref.id === 'number' || !!ref.name);
  const resource = useAsyncResource<ISiteUser[]>(
    () => userAccessService.getGroupMembers(ref as GroupRef),
    [ref?.id, ref?.name],
    enabled
  );
  const refresh = (): void => {
    if (ref) invalidatePrefix(groupMembersKey(ref));
    resource.refresh();
  };
  return { ...resource, refresh };
}
```

- [ ] **Step 3: `useBrokenInheritanceLists`**

```typescript
// src/hooks/useBrokenInheritanceLists.ts
import {
  brokenInheritanceKey,
  invalidatePrefix,
  userAccessService,
} from '../utilities/userAccess';
import type { IListWithUniqueRoles } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseBrokenInheritanceListsResult =
  IAsyncResource<IListWithUniqueRoles[]>;

export function useBrokenInheritanceLists(): UseBrokenInheritanceListsResult {
  const resource = useAsyncResource<IListWithUniqueRoles[]>(
    () => userAccessService.listsWithBrokenInheritance(),
    [],
    true
  );
  const refresh = (): void => {
    invalidatePrefix(brokenInheritanceKey());
    resource.refresh();
  };
  return { ...resource, refresh };
}
```

- [ ] **Step 4: Build + commit**

```bash
npm run build && npm run type-check
git add src/hooks/useSiteGroups.ts src/hooks/useGroupMembers.ts src/hooks/useBrokenInheritanceLists.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useSiteGroups, useGroupMembers, useBrokenInheritanceLists

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: `useUserAccessComparison`

**Files:**
- Create: `src/hooks/useUserAccessComparison.ts`

- [ ] **Step 1: Implement**

```typescript
// src/hooks/useUserAccessComparison.ts
import * as React from 'react';
import { diffUserAccess } from '../utilities/userAccess';
import type {
  IAccessDiff,
  LoginInput,
} from '../utilities/userAccess';
import { useUserAccess } from './useUserAccess';

export interface UseUserAccessComparisonResult {
  diff: IAccessDiff | null;
  loading: boolean;
  error: ReturnType<typeof useUserAccess>['error'];
  refresh: () => void;
  userA: ReturnType<typeof useUserAccess>;
  userB: ReturnType<typeof useUserAccess>;
}

export function useUserAccessComparison(
  loginA: LoginInput | null,
  loginB: LoginInput | null
): UseUserAccessComparisonResult {
  const userA = useUserAccess(loginA);
  const userB = useUserAccess(loginB);

  const diff = React.useMemo<IAccessDiff | null>(() => {
    if (!userA.data || !userB.data) return null;
    return diffUserAccess(userA.data, userB.data);
  }, [userA.data, userB.data]);

  const refresh = (): void => {
    userA.refresh();
    userB.refresh();
  };

  return {
    diff,
    loading: userA.loading || userB.loading,
    error: userA.error ?? userB.error,
    refresh,
    userA,
    userB,
  };
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build && npm run type-check
git add src/hooks/useUserAccessComparison.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useUserAccessComparison (Level-1 diff)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: `useGroupMembershipEditor`

**Files:**
- Create: `src/hooks/useGroupMembershipEditor.ts`

This hook composes `useSiteGroups` + `useUserAccess` for the source data and uses `membershipReducer` for the state machine. `apply()` re-checks the manage permission before dispatch.

- [ ] **Step 1: Implement**

```typescript
// src/hooks/useGroupMembershipEditor.ts
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import '@pnp/sp/security';
import '@pnp/sp/webs';

import { SPContext } from '../utilities/context';
import {
  emptyBulkResult,
  fromItems,
  initMembershipState,
  membershipReducer,
  selectIsDirty,
  selectPendingAdds,
  selectPendingRemoves,
  userAccessService,
} from '../utilities/userAccess';
import type {
  IBulkResult,
  ISiteGroup,
  LoginInput,
} from '../utilities/userAccess';
import { useUserAccess } from './useUserAccess';
import { useSiteGroups } from './useSiteGroups';
import { toUserAccessError } from './_useAsyncResource';
import type { UserAccessError } from '../utilities/userAccess';

export interface UseGroupMembershipEditorResult {
  allGroups: ISiteGroup[];
  currentMembership: Set<number>;
  pendingMembership: Set<number>;
  pendingAdds: number[];
  pendingRemoves: number[];
  isDirty: boolean;
  toggle: (groupId: number) => void;
  reset: () => void;
  apply: () => Promise<IBulkResult>;
  applying: boolean;
  lastResult: IBulkResult | null;
  loading: boolean;
  error: UserAccessError | null;
}

export function useGroupMembershipEditor(
  login: LoginInput | null,
  managePermission: PermissionKind = PermissionKind.ManageWeb
): UseGroupMembershipEditorResult {
  const sg = useSiteGroups();
  const ua = useUserAccess(login);

  const [state, dispatch] = React.useReducer(
    membershipReducer,
    initMembershipState([])
  );
  const [applying, setApplying] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<IBulkResult | null>(null);
  const [error, setError] = React.useState<UserAccessError | null>(null);

  // Seed reducer when ua data lands.
  React.useEffect(() => {
    if (!ua.data) return;
    dispatch({
      type: 'setCurrent',
      current: ua.data.siteGroups.map(g => g.id),
    });
  }, [ua.data]);

  const allGroups = sg.data ?? [];

  const apply = React.useCallback(async (): Promise<IBulkResult> => {
    if (!login) {
      const empty = emptyBulkResult();
      setLastResult(empty);
      return empty;
    }
    setApplying(true);
    setError(null);
    try {
      // 1. Re-check manage permission
      const allowed: boolean = await SPContext.sp.web.currentUserHasPermissions(
        managePermission
      );
      if (!allowed) {
        const pendingAdds = selectPendingAdds(state);
        const pendingRemoves = selectPendingRemoves(state);
        const allIds = [...pendingAdds, ...pendingRemoves];
        const result = fromItems(
          allIds.map(groupId => ({
            groupId,
            success: false,
            error: 'ACCESS_DENIED',
          }))
        );
        setLastResult(result);
        return result;
      }

      // 2. Refresh current membership from server to handle concurrent edits
      ua.refresh();
      // refresh() is async-fire-and-forget; the bulk methods don't depend on it
      // for correctness because they target groupIds directly. The cache
      // invalidation inside refresh ensures the next render reflects truth.

      const adds = selectPendingAdds(state);
      const removes = selectPendingRemoves(state);

      const [addResult, removeResult] = await Promise.all([
        adds.length > 0
          ? userAccessService.addUserToGroups(login as LoginInput, adds)
          : emptyBulkResult(),
        removes.length > 0
          ? userAccessService.removeUserFromGroups(login as LoginInput, removes)
          : emptyBulkResult(),
      ]);

      // Merge results
      const merged: IBulkResult = {
        succeeded: [...addResult.succeeded, ...removeResult.succeeded],
        failed: [...addResult.failed, ...removeResult.failed],
        items: [...addResult.items, ...removeResult.items],
      };

      // Rebase reducer to actual server state after success
      // After service writes, level1 cache is already invalidated; re-fetch
      ua.refresh();
      setLastResult(merged);
      return merged;
    } catch (err) {
      const uae = toUserAccessError(err);
      setError(uae);
      const empty = emptyBulkResult();
      setLastResult(empty);
      return empty;
    } finally {
      setApplying(false);
    }
  }, [login, managePermission, state, ua]);

  return {
    allGroups,
    currentMembership: state.currentMembership,
    pendingMembership: state.pendingMembership,
    pendingAdds: selectPendingAdds(state),
    pendingRemoves: selectPendingRemoves(state),
    isDirty: selectIsDirty(state),
    toggle: (groupId: number) => dispatch({ type: 'toggle', groupId }),
    reset: () => dispatch({ type: 'reset' }),
    apply,
    applying,
    lastResult,
    loading: sg.loading || ua.loading,
    error: error ?? sg.error ?? ua.error,
  };
}
```

Note: the hook return shape is uniform (`{ data, loading, error, refresh }`) — `sg.data` is the `ISiteGroup[]`, `ua.data` is the `IUserAccessLevel1`. The editor adapts these to domain fields it exposes (`allGroups`, `currentMembership`, etc.).

- [ ] **Step 2: Build + commit**

```bash
npm run build && npm run type-check
git add src/hooks/useGroupMembershipEditor.ts
git commit -m "$(cat <<'EOF'
feat(hooks): add useGroupMembershipEditor with apply-time gate re-check

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Hooks barrel

**Files:**
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Extend the barrel**

```typescript
// src/hooks/index.ts
// Re-export everything for convenience
export * from './useLocalStorage';
export * from './useViewport';

// User access hooks
export * from './useHasPermission';
export * from './useUserAccess';
export * from './useEffectiveListPermission';
export * from './useEffectiveItemPermission';
export * from './useSiteGroups';
export * from './useGroupMembers';
export * from './useBrokenInheritanceLists';
export * from './useUserAccessComparison';
export * from './useGroupMembershipEditor';
// _useAsyncResource is intentionally NOT exported
```

- [ ] **Step 2: Build + validate + commit**

```bash
npm run build && npm run validate
git add src/hooks/index.ts
git commit -m "$(cat <<'EOF'
feat(hooks): extend barrel with userAccess hooks

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — UI Primitives

> Manually verified — no automated tests (matches existing toolkit primitives).

### Task 20: `PermissionLevelBadge`

**Files:**
- Create: `src/components/userAccess/primitives/PermissionLevelBadge/PermissionLevelBadge.types.ts`
- Create: `src/components/userAccess/primitives/PermissionLevelBadge/PermissionLevelBadge.tsx`
- Create: `src/components/userAccess/primitives/PermissionLevelBadge/PermissionLevelBadge.css`
- Create: `src/components/userAccess/primitives/PermissionLevelBadge/index.ts`

- [ ] **Step 1: Types**

```typescript
// PermissionLevelBadge.types.ts
import type { PermissionLevelLabel } from '../../../../utilities/userAccess';

export interface IPermissionLevelBadgeProps {
  level: PermissionLevelLabel;
  tooltip?: string;
  className?: string;
}
```

- [ ] **Step 2: Component**

```typescript
// PermissionLevelBadge.tsx
import * as React from 'react';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { IPermissionLevelBadgeProps } from './PermissionLevelBadge.types';
import './PermissionLevelBadge.css';

const LEVEL_CLASS: Record<string, string> = {
  Owner: 'spf-permbadge--owner',
  Member: 'spf-permbadge--member',
  Visitor: 'spf-permbadge--visitor',
  Custom: 'spf-permbadge--custom',
  None: 'spf-permbadge--none',
};

export const PermissionLevelBadge: React.FC<IPermissionLevelBadgeProps> = ({
  level,
  tooltip,
  className,
}) => {
  const badge = (
    <span
      className={`spf-permbadge ${LEVEL_CLASS[level] ?? ''} ${className ?? ''}`}
      role="status"
      aria-label={`Permission level: ${level}`}
    >
      {level}
    </span>
  );
  if (!tooltip) return badge;
  return <TooltipHost content={tooltip}>{badge}</TooltipHost>;
};
```

- [ ] **Step 3: CSS**

```css
/* PermissionLevelBadge.css */
.spf-permbadge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  border: 1px solid transparent;
}
.spf-permbadge--owner { background: #fde7e9; color: #a4262c; border-color: #f5b3b8; }
.spf-permbadge--member { background: #deecf9; color: #005a9e; border-color: #b6d9f5; }
.spf-permbadge--visitor { background: #f3f2f1; color: #323130; border-color: #d2d0ce; }
.spf-permbadge--custom { background: #fff4ce; color: #614e02; border-color: #f9e498; }
.spf-permbadge--none { background: #faf9f8; color: #a19f9d; border-color: #edebe9; }
```

- [ ] **Step 4: Barrel + build + commit**

```typescript
// index.ts
export { PermissionLevelBadge } from './PermissionLevelBadge';
export type { IPermissionLevelBadgeProps } from './PermissionLevelBadge.types';
```

```bash
npm run build && npm run type-check
git add src/components/userAccess/primitives/PermissionLevelBadge/
git commit -m "$(cat <<'EOF'
feat(userAccess): add PermissionLevelBadge primitive

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: `RequirePermission`

**Files:**
- Create: `src/components/userAccess/primitives/RequirePermission/RequirePermission.types.ts`
- Create: `src/components/userAccess/primitives/RequirePermission/RequirePermission.tsx`
- Create: `src/components/userAccess/primitives/RequirePermission/index.ts`

- [ ] **Step 1: Types**

```typescript
// RequirePermission.types.ts
import { PermissionKind } from '@pnp/sp/security';

export interface IRequirePermissionProps {
  kind?: PermissionKind;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
```

- [ ] **Step 2: Component**

```typescript
// RequirePermission.tsx
import * as React from 'react';
import { Shimmer, ShimmerElementType } from '@fluentui/react/lib/Shimmer';
import { PermissionKind } from '@pnp/sp/security';
import { useHasPermission } from '../../../../hooks';
import { IRequirePermissionProps } from './RequirePermission.types';

export const RequirePermission: React.FC<IRequirePermissionProps> = ({
  kind = PermissionKind.ManageWeb,
  fallback = null,
  children,
}) => {
  const { allowed, loading } = useHasPermission(kind);
  if (loading) {
    return (
      <Shimmer
        shimmerElements={[
          { type: ShimmerElementType.line, height: 16, width: '60%' },
        ]}
      />
    );
  }
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
};
```

- [ ] **Step 3: Barrel + build + commit**

```typescript
// index.ts
export { RequirePermission } from './RequirePermission';
export type { IRequirePermissionProps } from './RequirePermission.types';
```

```bash
npm run build && npm run type-check
git add src/components/userAccess/primitives/RequirePermission/
git commit -m "$(cat <<'EOF'
feat(userAccess): add RequirePermission gate primitive

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: `UserGroupChips`

**Files:**
- Create the four files under `src/components/userAccess/primitives/UserGroupChips/`

- [ ] **Step 1: Types**

```typescript
// UserGroupChips.types.ts
import type { ISiteGroup } from '../../../../utilities/userAccess';

export interface IUserGroupChipsProps {
  groups: ISiteGroup[];
  onChipClick?: (group: ISiteGroup) => void;
  className?: string;
  emptyText?: string;
}
```

- [ ] **Step 2: Component**

```typescript
// UserGroupChips.tsx
import * as React from 'react';
import { Text } from '@fluentui/react/lib/Text';
import { GroupViewer } from '../../../GroupViewer';
import { IUserGroupChipsProps } from './UserGroupChips.types';
import './UserGroupChips.css';

export const UserGroupChips: React.FC<IUserGroupChipsProps> = ({
  groups,
  onChipClick,
  className,
  emptyText = 'No groups',
}) => {
  if (groups.length === 0) {
    return (
      <Text variant="small" className={`spf-usergroupchips--empty ${className ?? ''}`}>
        {emptyText}
      </Text>
    );
  }
  return (
    <div className={`spf-usergroupchips ${className ?? ''}`}>
      {groups.map(g => (
        <button
          key={g.id}
          type="button"
          className="spf-usergroupchip"
          onClick={() => onChipClick?.(g)}
        >
          <GroupViewer groupId={g.id}>
            <span>{g.title}</span>
          </GroupViewer>
        </button>
      ))}
    </div>
  );
};
```

> **Note for implementer:** `GroupViewer` already exists at [src/components/GroupViewer/](src/components/GroupViewer/). Read its `index.ts` to confirm the prop name is `groupId` (number). If the prop is different, adapt; do not modify `GroupViewer`.

- [ ] **Step 3: CSS**

```css
/* UserGroupChips.css */
.spf-usergroupchips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.spf-usergroupchip {
  border: 1px solid #d2d0ce;
  background: #faf9f8;
  border-radius: 14px;
  padding: 2px 10px;
  font-size: 13px;
  cursor: pointer;
}
.spf-usergroupchip:hover {
  background: #f3f2f1;
}
.spf-usergroupchips--empty {
  color: #605e5c;
  font-style: italic;
}
```

- [ ] **Step 4: Barrel + build + commit**

```typescript
// index.ts
export { UserGroupChips } from './UserGroupChips';
export type { IUserGroupChipsProps } from './UserGroupChips.types';
```

```bash
npm run build && npm run type-check
git add src/components/userAccess/primitives/UserGroupChips/
git commit -m "$(cat <<'EOF'
feat(userAccess): add UserGroupChips primitive (reuses GroupViewer)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: `DirectPermissionsTable`

**Files:**
- Create the four files under `src/components/userAccess/primitives/DirectPermissionsTable/`

- [ ] **Step 1: Types**

```typescript
// DirectPermissionsTable.types.ts
import type {
  IDirectListPermission,
  ListRef,
} from '../../../../utilities/userAccess';

export interface IDirectPermissionsTableProps {
  lists: IDirectListPermission[];
  onListClick?: (listRef: ListRef) => void;
  className?: string;
  emptyText?: string;
}
```

- [ ] **Step 2: Component**

```typescript
// DirectPermissionsTable.tsx
import * as React from 'react';
import {
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
} from '@fluentui/react/lib/DetailsList';
import { Link } from '@fluentui/react/lib/Link';
import { Text } from '@fluentui/react/lib/Text';
import { PermissionLevelBadge } from '../PermissionLevelBadge';
import { IDirectPermissionsTableProps } from './DirectPermissionsTable.types';
import './DirectPermissionsTable.css';

export const DirectPermissionsTable: React.FC<IDirectPermissionsTableProps> = ({
  lists,
  onListClick,
  className,
  emptyText = 'No direct list permissions.',
}) => {
  if (lists.length === 0) {
    return (
      <Text variant="small" className={className}>
        {emptyText}
      </Text>
    );
  }

  const columns: IColumn[] = [
    {
      key: 'title',
      name: 'List',
      fieldName: 'list',
      minWidth: 160,
      isResizable: true,
      onRender: (item) =>
        onListClick ? (
          <Link onClick={() => onListClick({ id: item.list.id })}>
            {item.list.title}
          </Link>
        ) : (
          <span>{item.list.title}</span>
        ),
    },
    {
      key: 'level',
      name: 'Permission',
      minWidth: 90,
      onRender: (item) => <PermissionLevelBadge level={item.permissionLevel} />,
    },
    {
      key: 'source',
      name: 'Source',
      minWidth: 160,
      isResizable: true,
      onRender: (item) =>
        item.source === 'Direct' ? 'Direct' : `Via ${item.source.viaGroupTitle}`,
    },
    {
      key: 'roles',
      name: 'Roles',
      minWidth: 160,
      isResizable: true,
      onRender: (item) =>
        item.roleDefinitions.map((r: any) => r.name).join(', '),
    },
  ];

  return (
    <DetailsList
      className={`spf-dirperms ${className ?? ''}`}
      items={lists}
      columns={columns}
      selectionMode={SelectionMode.none}
      layoutMode={DetailsListLayoutMode.justified}
      compact
    />
  );
};
```

- [ ] **Step 3: CSS**

```css
/* DirectPermissionsTable.css */
.spf-dirperms {
  margin-top: 8px;
}
```

- [ ] **Step 4: Barrel + build + commit**

```typescript
// index.ts
export { DirectPermissionsTable } from './DirectPermissionsTable';
export type { IDirectPermissionsTableProps } from './DirectPermissionsTable.types';
```

```bash
npm run build && npm run type-check
git add src/components/userAccess/primitives/DirectPermissionsTable/
git commit -m "$(cat <<'EOF'
feat(userAccess): add DirectPermissionsTable primitive

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Surface Components

> Manual verification only (matches `ManageAccess`, `UserPersona`, etc.). Mention PeoplePicker import idiom: `React.lazy` + import `PrincipalType` directly (see [ManageAccessPanel.tsx:12-20](src/components/ManageAccess/ManageAccessPanel.tsx#L12-L20)) to avoid pulling PnP controls CSS into bundles that don't use them.

### Task 24: `MyAccessView`

**Files:**
- Create files under `src/components/userAccess/MyAccessView/`: `MyAccessView.types.ts`, `MyAccessView.tsx`, `MyAccessView.css`, `index.ts`

- [ ] **Step 1: Types**

```typescript
// MyAccessView.types.ts
import type { UserAccessError } from '../../../utilities/userAccess';

export interface IMyAccessViewProps {
  className?: string;
  title?: string;
  showRefresh?: boolean;
  onError?: (error: UserAccessError) => void;
}
```

- [ ] **Step 2: Component**

```typescript
// MyAccessView.tsx
import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';

import { ErrorBoundary } from '../../ErrorBoundary';
import { UserPersona } from '../../UserPersona';
import {
  useEffectiveItemPermission,
  useEffectiveListPermission,
  useUserAccess,
} from '../../../hooks';
import { DirectPermissionsTable } from '../primitives/DirectPermissionsTable';
import { PermissionLevelBadge } from '../primitives/PermissionLevelBadge';
import { UserGroupChips } from '../primitives/UserGroupChips';
import type { ListRef } from '../../../utilities/userAccess';
import { IMyAccessViewProps } from './MyAccessView.types';
import './MyAccessView.css';

function plainEnglishSummary(
  hasGroups: boolean,
  hasDirect: boolean
): string {
  if (!hasGroups && !hasDirect) return 'No permissions detected on this site.';
  if (hasGroups && !hasDirect)
    return "You're a member of one or more site groups.";
  if (!hasGroups && hasDirect)
    return 'You have permissions granted on specific lists.';
  return "You're a member of site groups AND have list-specific permissions.";
}

export const MyAccessView: React.FC<IMyAccessViewProps> = ({
  className,
  title = 'My Access',
  showRefresh = true,
  onError,
}) => {
  const { data, loading, error, refresh } = useUserAccess('current');
  const [pickedList, setPickedList] = React.useState<ListRef | null>(null);
  const [itemIdInput, setItemIdInput] = React.useState<string>('');
  const itemId = /^\d+$/.test(itemIdInput) ? Number(itemIdInput) : null;
  const level2 = useEffectiveListPermission('current', pickedList);
  const level3 = useEffectiveItemPermission('current', pickedList, itemId);

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const listOptions: IDropdownOption[] =
    data?.directListPermissions.map(d => ({
      key: d.list.id,
      text: d.list.title,
    })) ?? [];

  return (
    <ErrorBoundary>
      <div className={`spf-myaccess ${className ?? ''}`}>
        <Stack tokens={{ childrenGap: 12 }}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
            <Text variant="xLarge">{title}</Text>
            {showRefresh && (
              <DefaultButton iconProps={{ iconName: 'Refresh' }} onClick={refresh} />
            )}
          </Stack>

          {loading && <Spinner label="Loading your access…" />}

          {error && (
            <MessageBar messageBarType={MessageBarType.error}>
              We couldn't load your access. {error.message}
            </MessageBar>
          )}

          {data && (
            <>
              <UserPersona userId={data.user.id} />
              <Text>
                {plainEnglishSummary(
                  data.siteGroups.length > 0,
                  data.directListPermissions.length > 0
                )}
              </Text>

              <Stack>
                <Text variant="mediumPlus">Your groups</Text>
                <UserGroupChips
                  groups={data.siteGroups}
                  emptyText="You're not a member of any site groups."
                />
              </Stack>

              <Stack>
                <Text variant="mediumPlus">Permissions on specific lists</Text>
                <DirectPermissionsTable
                  lists={data.directListPermissions}
                  emptyText="You don't have any list-specific permissions beyond your group memberships."
                  onListClick={(ref) => setPickedList(ref)}
                />
              </Stack>

              <Stack className="spf-myaccess__drilldown">
                <Text variant="mediumPlus">Check a specific list or item</Text>
                <Dropdown
                  placeholder="Pick a list/library…"
                  options={listOptions}
                  selectedKey={pickedList?.id ?? null}
                  onChange={(_, opt) =>
                    setPickedList(opt ? { id: opt.key as string } : null)
                  }
                />
                {level2.loading && <Spinner label="Checking permission…" />}
                {level2.data && (
                  <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                    <Text>Your permission on {level2.data.list.title}:</Text>
                    <PermissionLevelBadge level={level2.data.permissionLevel} />
                  </Stack>
                )}
                {pickedList && (
                  <>
                    <TextField
                      label="Optional item ID"
                      value={itemIdInput}
                      onChange={(_, v) => setItemIdInput(v ?? '')}
                    />
                    {level3.loading && <Spinner label="Checking item permission…" />}
                    {level3.data && (
                      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                        <Text>On item {level3.data.itemId}:</Text>
                        <PermissionLevelBadge level={level3.data.permissionLevel} />
                      </Stack>
                    )}
                    {level3.error && (
                      <MessageBar messageBarType={MessageBarType.warning}>
                        {level3.error.message}
                      </MessageBar>
                    )}
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </div>
    </ErrorBoundary>
  );
};
```

- [ ] **Step 3: CSS**

```css
/* MyAccessView.css */
.spf-myaccess { padding: 8px; }
.spf-myaccess__drilldown {
  margin-top: 12px;
  border-top: 1px solid #edebe9;
  padding-top: 12px;
}
```

- [ ] **Step 4: Barrel + build + commit**

```typescript
// index.ts
export { MyAccessView } from './MyAccessView';
export type { IMyAccessViewProps } from './MyAccessView.types';
```

```bash
npm run build && npm run type-check
git add src/components/userAccess/MyAccessView/
git commit -m "$(cat <<'EOF'
feat(userAccess): add MyAccessView self-service surface

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

> **`<UserPersona>` prop note:** Verify the existing `UserPersona` accepts `userId` as a number. If it requires a different prop (e.g., `loginName`), adapt the call site. Do not modify `UserPersona`.

---

### Task 25: `UserAccessAdmin` shell + gating

**Files:**
- Create files under `src/components/userAccess/UserAccessAdmin/`: `UserAccessAdmin.types.ts`, `UserAccessAdmin.tsx`, `UserAccessAdmin.css`, `index.ts`. (Tabs follow in Tasks 26-28.)

- [ ] **Step 1: Types**

```typescript
// UserAccessAdmin.types.ts
import { PermissionKind } from '@pnp/sp/security';
import type { UserAccessError } from '../../../utilities/userAccess';

export interface IUserAccessAdminProps {
  className?: string;
  title?: string;
  /** Permission required for the Manage Groups tab (and to broaden Browse/Compare beyond allowBrowse). Default ManageWeb. */
  managePermission?: PermissionKind;
  /** Allow non-admin users to use Browse/Compare. Default false. */
  allowBrowse?: boolean;
  onError?: (error: UserAccessError) => void;
}
```

- [ ] **Step 2: Component shell**

```typescript
// UserAccessAdmin.tsx
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ErrorBoundary } from '../../ErrorBoundary';
import { useHasPermission } from '../../../hooks';
import { BrowseTab } from './tabs/BrowseTab';
import { CompareTab } from './tabs/CompareTab';
import { ManageGroupsTab } from './tabs/ManageGroupsTab';
import { IUserAccessAdminProps } from './UserAccessAdmin.types';
import './UserAccessAdmin.css';

export const UserAccessAdmin: React.FC<IUserAccessAdminProps> = ({
  className,
  title = 'User Access',
  managePermission = PermissionKind.ManageWeb,
  allowBrowse = false,
  onError,
}) => {
  const { allowed: canManage, loading: gateLoading } =
    useHasPermission(managePermission);

  const showBrowseAndCompare = canManage || allowBrowse;
  const showManageGroups = canManage;
  const showAny = showBrowseAndCompare || showManageGroups;

  return (
    <ErrorBoundary>
      <div className={`spf-useradmin ${className ?? ''}`}>
        <Stack tokens={{ childrenGap: 12 }}>
          <Text variant="xLarge">{title}</Text>

          {gateLoading && <Text variant="small">Loading…</Text>}

          {!gateLoading && !showAny && (
            <MessageBar messageBarType={MessageBarType.info}>
              You don't have access to any user-admin features on this site.
            </MessageBar>
          )}

          {!gateLoading && showAny && (
            <Pivot>
              {showBrowseAndCompare && (
                <PivotItem headerText="Browse" itemKey="browse">
                  <BrowseTab onError={onError} />
                </PivotItem>
              )}
              {showBrowseAndCompare && (
                <PivotItem headerText="Compare" itemKey="compare">
                  <CompareTab onError={onError} />
                </PivotItem>
              )}
              {showManageGroups && (
                <PivotItem headerText="Manage groups" itemKey="manage">
                  <ManageGroupsTab
                    managePermission={managePermission}
                    onError={onError}
                  />
                </PivotItem>
              )}
            </Pivot>
          )}
        </Stack>
      </div>
    </ErrorBoundary>
  );
};
```

- [ ] **Step 3: CSS**

```css
/* UserAccessAdmin.css */
.spf-useradmin { padding: 8px; }
```

- [ ] **Step 4: Barrel + stub the three tab files (so import resolves)**

```typescript
// index.ts
export { UserAccessAdmin } from './UserAccessAdmin';
export type { IUserAccessAdminProps } from './UserAccessAdmin.types';
```

Create empty placeholders so `npm run build` succeeds before Tasks 26-28 implement the real bodies:

```typescript
// tabs/BrowseTab.tsx
import * as React from 'react';
export const BrowseTab: React.FC<{ onError?: (e: any) => void }> = () => (
  <div>Browse tab — implemented in Task 26</div>
);

// tabs/CompareTab.tsx
import * as React from 'react';
export const CompareTab: React.FC<{ onError?: (e: any) => void }> = () => (
  <div>Compare tab — implemented in Task 27</div>
);

// tabs/ManageGroupsTab.tsx
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
export const ManageGroupsTab: React.FC<{
  managePermission: PermissionKind;
  onError?: (e: any) => void;
}> = () => <div>Manage groups tab — implemented in Task 28</div>;
```

- [ ] **Step 5: Build + commit**

```bash
npm run build && npm run type-check
git add src/components/userAccess/UserAccessAdmin/
git commit -m "$(cat <<'EOF'
feat(userAccess): add UserAccessAdmin shell + tab gating (stubs for tabs)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: `BrowseTab`

**Files:**
- Modify: `src/components/userAccess/UserAccessAdmin/tabs/BrowseTab.tsx`

Replace the stub with the real implementation. Uses the same data flow as `MyAccessView` but takes a `login` from a `PeoplePicker`. Persists last-5 picked users in `localStorage` via the existing `useLocalStorage` hook.

- [ ] **Step 1: Implement**

```typescript
// tabs/BrowseTab.tsx
import * as React from 'react';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';

import { SPContext } from '../../../../utilities/context';
import { UserPersona } from '../../../UserPersona';
import {
  useEffectiveItemPermission,
  useEffectiveListPermission,
  useLocalStorage,
  useUserAccess,
} from '../../../../hooks';
import { DirectPermissionsTable } from '../../primitives/DirectPermissionsTable';
import { PermissionLevelBadge } from '../../primitives/PermissionLevelBadge';
import { UserGroupChips } from '../../primitives/UserGroupChips';
import type { ListRef, UserAccessError } from '../../../../utilities/userAccess';

const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((m) => ({
    default: m.PeoplePicker,
  }))
);

interface IBrowseTabProps {
  onError?: (e: UserAccessError) => void;
}

type RecentUser = { login: string; title: string };

export const BrowseTab: React.FC<IBrowseTabProps> = ({ onError }) => {
  const { value: recents, setValue: setRecents } = useLocalStorage<RecentUser[]>(
    'spfx-toolkit.userAccess.recents',
    [] as RecentUser[]
  );
  const [login, setLogin] = React.useState<string | null>(null);
  const [pickedList, setPickedList] = React.useState<ListRef | null>(null);
  const [itemIdInput, setItemIdInput] = React.useState('');
  const itemId = /^\d+$/.test(itemIdInput) ? Number(itemIdInput) : null;

  const { data, loading, error, refresh } = useUserAccess(login);
  const level2 = useEffectiveListPermission(login, pickedList);
  const level3 = useEffectiveItemPermission(login, pickedList, itemId);

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const handlePick = (items: Array<{ loginName: string; text: string }>) => {
    if (items.length === 0) {
      setLogin(null);
      return;
    }
    const picked = items[0];
    setLogin(picked.loginName);
    // Save to recents (max 5, dedupe)
    const next: RecentUser[] = [
      { login: picked.loginName, title: picked.text },
      ...recents.filter(r => r.login !== picked.loginName),
    ].slice(0, 5);
    setRecents(next);
  };

  const listOptions: IDropdownOption[] =
    data?.directListPermissions.map(d => ({
      key: d.list.id,
      text: d.list.title,
    })) ?? [];

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <React.Suspense fallback={<Spinner />}>
        <PeoplePicker
          context={SPContext.context as any}
          personSelectionLimit={1}
          principalTypes={[PrincipalType.User]}
          resolveDelay={300}
          ensureUser
          onChange={handlePick}
        />
      </React.Suspense>

      {!login && recents.length > 0 && (
        <Stack>
          <Text variant="small">Recent users:</Text>
          <Stack horizontal wrap tokens={{ childrenGap: 6 }}>
            {recents.map(r => (
              <button
                key={r.login}
                className="spf-recentuser"
                onClick={() => setLogin(r.login)}
              >
                {r.title}
              </button>
            ))}
          </Stack>
        </Stack>
      )}

      {loading && <Spinner label="Loading user access…" />}
      {error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {error.message}
        </MessageBar>
      )}

      {data && (
        <Stack tokens={{ childrenGap: 8 }}>
          <UserPersona userId={data.user.id} />
          <Text variant="mediumPlus">Site groups ({data.siteGroups.length})</Text>
          <UserGroupChips groups={data.siteGroups} emptyText="No site groups." />
          <Text variant="mediumPlus">
            Matched list role assignments ({data.directListPermissions.length})
          </Text>
          <DirectPermissionsTable
            lists={data.directListPermissions}
            onListClick={(ref) => setPickedList(ref)}
          />

          {pickedList && (
            <Stack tokens={{ childrenGap: 6 }}>
              <Text variant="mediumPlus">Drill down</Text>
              <Dropdown
                options={listOptions}
                selectedKey={pickedList.id}
                onChange={(_, opt) =>
                  setPickedList(opt ? { id: opt.key as string } : null)
                }
              />
              {level2.loading && <Spinner />}
              {level2.data && (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text>Permission level:</Text>
                  <PermissionLevelBadge level={level2.data.permissionLevel} />
                </Stack>
              )}
              <TextField
                label="Item ID"
                value={itemIdInput}
                onChange={(_, v) => setItemIdInput(v ?? '')}
              />
              {level3.loading && <Spinner />}
              {level3.data && (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <Text>Item permission:</Text>
                  <PermissionLevelBadge level={level3.data.permissionLevel} />
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
};
```

Add a small CSS rule for `.spf-recentuser` to the shell's `UserAccessAdmin.css`:

```css
.spf-recentuser {
  border: 1px solid #d2d0ce;
  background: #faf9f8;
  border-radius: 12px;
  padding: 2px 10px;
  cursor: pointer;
}
```

- [ ] **Step 2: Verify `SPContext.context` shape**

Check `src/utilities/context/sp-context.ts` to confirm how to expose the SPFx context to PeoplePicker. If `SPContext.context` doesn't exist, look for `SPContext.spfxContext` or similar and adapt the prop on `<PeoplePicker context={...}>`.

- [ ] **Step 3: Build + commit**

```bash
npm run build && npm run type-check
git add src/components/userAccess/UserAccessAdmin/tabs/BrowseTab.tsx src/components/userAccess/UserAccessAdmin/UserAccessAdmin.css
git commit -m "$(cat <<'EOF'
feat(userAccess): implement BrowseTab with PeoplePicker + drill-down

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 27: `CompareTab`

**Files:**
- Modify: `src/components/userAccess/UserAccessAdmin/tabs/CompareTab.tsx`

Replace the stub. Level-1 only by default. Each list-permission row in the diff has a "Compare permissions" button that fires per-list Level-2 fetches for both users; only then do we compute `unexplainedDifference`.

- [ ] **Step 1: Implement**

```typescript
// tabs/CompareTab.tsx
import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';

import { SPContext } from '../../../../utilities/context';
import {
  useUserAccessComparison,
  useEffectiveListPermission,
} from '../../../../hooks';
import { UserGroupChips } from '../../primitives/UserGroupChips';
import { PermissionLevelBadge } from '../../primitives/PermissionLevelBadge';
import { accessExportToCsv } from '../../../../utilities/userAccess';
import type {
  IDirectListPermission,
  ListRef,
  UserAccessError,
} from '../../../../utilities/userAccess';

const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((m) => ({
    default: m.PeoplePicker,
  }))
);

interface ICompareTabProps {
  onError?: (e: UserAccessError) => void;
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CompareListRow({
  loginA,
  loginB,
  list,
}: {
  loginA: string;
  loginB: string;
  list: { id: string; title: string };
}) {
  const [active, setActive] = React.useState(false);
  const ref: ListRef = { id: list.id };
  const lpA = useEffectiveListPermission(active ? loginA : null, ref);
  const lpB = useEffectiveListPermission(active ? loginB : null, ref);

  const unexplained =
    !!lpA.data &&
    !!lpB.data &&
    (lpA.data.permissionMask.high !== lpB.data.permissionMask.high ||
      lpA.data.permissionMask.low !== lpB.data.permissionMask.low) &&
    lpA.data.matchedAssignments.length === lpB.data.matchedAssignments.length;

  return (
    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
      <Text>{list.title}</Text>
      <DefaultButton text="Compare permissions" onClick={() => setActive(true)} />
      {active && (lpA.loading || lpB.loading) && <Spinner />}
      {active && lpA.data && lpB.data && (
        <Stack horizontal tokens={{ childrenGap: 6 }}>
          <PermissionLevelBadge
            level={lpA.data.permissionLevel}
            tooltip="User A"
          />
          <PermissionLevelBadge
            level={lpB.data.permissionLevel}
            tooltip="User B"
          />
          {unexplained && (
            <Text variant="small" style={{ color: '#a4262c' }}>
              Unexplained difference — masks differ beyond visible assignments
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export const CompareTab: React.FC<ICompareTabProps> = ({ onError }) => {
  const [loginA, setLoginA] = React.useState<string | null>(null);
  const [loginB, setLoginB] = React.useState<string | null>(null);

  const { diff, loading, error } = useUserAccessComparison(loginA, loginB);

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const handleExport = (): void => {
    if (!diff) return;
    const { filename, content } = accessExportToCsv(diff);
    downloadCsv(filename, content);
  };

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Stack horizontal tokens={{ childrenGap: 12 }}>
        <Stack grow>
          <Text>User A</Text>
          <React.Suspense fallback={<Spinner />}>
            <PeoplePicker
              context={SPContext.context as any}
              personSelectionLimit={1}
              principalTypes={[PrincipalType.User]}
              resolveDelay={300}
              ensureUser
              onChange={(items: any[]) =>
                setLoginA(items[0]?.loginName ?? null)
              }
            />
          </React.Suspense>
        </Stack>
        <Stack grow>
          <Text>User B</Text>
          <React.Suspense fallback={<Spinner />}>
            <PeoplePicker
              context={SPContext.context as any}
              personSelectionLimit={1}
              principalTypes={[PrincipalType.User]}
              resolveDelay={300}
              ensureUser
              onChange={(items: any[]) =>
                setLoginB(items[0]?.loginName ?? null)
              }
            />
          </React.Suspense>
        </Stack>
      </Stack>

      {loading && <Spinner label="Comparing…" />}
      {error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {error.message}
        </MessageBar>
      )}

      {diff && (
        <>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Text variant="mediumPlus">
              Diff: {diff.userA.title} vs {diff.userB.title}
            </Text>
            <PrimaryButton text="Export CSV" onClick={handleExport} />
          </Stack>

          <Stack horizontal tokens={{ childrenGap: 12 }}>
            <Stack grow>
              <Text variant="mediumPlus">Only {diff.userA.title}</Text>
              <Text variant="small">
                Groups ({diff.onlyA.groups.length})
              </Text>
              <UserGroupChips groups={diff.onlyA.groups} emptyText="—" />
              <Text variant="small">
                Matched list role assignments (
                {diff.onlyA.directListPermissions.length})
              </Text>
              {diff.onlyA.directListPermissions.map((d: IDirectListPermission) => (
                <Text key={`${d.list.id}-${typeof d.source === 'string' ? d.source : d.source.viaGroupId}`}>
                  {d.list.title} — {d.permissionLevel}
                </Text>
              ))}
            </Stack>

            <Stack grow>
              <Text variant="mediumPlus">Common</Text>
              <Text variant="small">Groups ({diff.common.groups.length})</Text>
              <UserGroupChips groups={diff.common.groups} emptyText="—" />
              <Text variant="small">
                Lists ({diff.common.directListPermissions.length})
              </Text>
              {loginA && loginB &&
                diff.common.directListPermissions.map(d => (
                  <CompareListRow
                    key={d.list.id}
                    loginA={loginA}
                    loginB={loginB}
                    list={d.list}
                  />
                ))}
            </Stack>

            <Stack grow>
              <Text variant="mediumPlus">Only {diff.userB.title}</Text>
              <Text variant="small">
                Groups ({diff.onlyB.groups.length})
              </Text>
              <UserGroupChips groups={diff.onlyB.groups} emptyText="—" />
              <Text variant="small">
                Matched list role assignments (
                {diff.onlyB.directListPermissions.length})
              </Text>
              {diff.onlyB.directListPermissions.map((d: IDirectListPermission) => (
                <Text key={`${d.list.id}-${typeof d.source === 'string' ? d.source : d.source.viaGroupId}`}>
                  {d.list.title} — {d.permissionLevel}
                </Text>
              ))}
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
};
```

- [ ] **Step 2: Build + commit**

```bash
npm run build && npm run type-check
git add src/components/userAccess/UserAccessAdmin/tabs/CompareTab.tsx
git commit -m "$(cat <<'EOF'
feat(userAccess): implement CompareTab (Level-1 diff + per-row L2 drill-in)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 28: `ManageGroupsTab`

**Files:**
- Modify: `src/components/userAccess/UserAccessAdmin/tabs/ManageGroupsTab.tsx`

Replace the stub. Uses `useGroupMembershipEditor`. PeoplePicker → checkbox list → sticky footer → confirmation Dialog → Apply. Virtualizes once group count > 50.

- [ ] **Step 1: Implement**

```typescript
// tabs/ManageGroupsTab.tsx
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { List } from '@fluentui/react/lib/List';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { PrincipalType } from '@pnp/spfx-controls-react/lib/controls/peoplepicker/PrincipalType';

import { SPContext } from '../../../../utilities/context';
import { useGroupMembershipEditor } from '../../../../hooks';
import type { ISiteGroup, UserAccessError } from '../../../../utilities/userAccess';

const PeoplePicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/PeoplePicker').then((m) => ({
    default: m.PeoplePicker,
  }))
);

interface IManageGroupsTabProps {
  managePermission: PermissionKind;
  onError?: (e: UserAccessError) => void;
}

const VIRTUALIZE_THRESHOLD = 50;

export const ManageGroupsTab: React.FC<IManageGroupsTabProps> = ({
  managePermission,
  onError,
}) => {
  const [login, setLogin] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const editor = useGroupMembershipEditor(login, managePermission);

  React.useEffect(() => {
    if (editor.error && onError) onError(editor.error);
  }, [editor.error, onError]);

  const filteredGroups = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return editor.allGroups;
    return editor.allGroups.filter(g => g.title.toLowerCase().includes(q));
  }, [editor.allGroups, filter]);

  const handleApply = async (): Promise<void> => {
    setConfirmOpen(false);
    await editor.apply();
  };

  const renderRow = (group?: ISiteGroup): React.ReactElement | null => {
    if (!group) return null;
    return (
      <div className="spf-managegroups__row" key={group.id}>
        <Checkbox
          label={group.title}
          checked={editor.pendingMembership.has(group.id)}
          onChange={() => editor.toggle(group.id)}
        />
      </div>
    );
  };

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <React.Suspense fallback={<Spinner />}>
        <PeoplePicker
          context={SPContext.context as any}
          personSelectionLimit={1}
          principalTypes={[PrincipalType.User]}
          resolveDelay={300}
          ensureUser
          onChange={(items: any[]) => setLogin(items[0]?.loginName ?? null)}
        />
      </React.Suspense>

      <SearchBox
        placeholder="Filter groups…"
        value={filter}
        onChange={(_, v) => setFilter(v ?? '')}
      />

      {editor.loading && <Spinner label="Loading…" />}
      {editor.error && (
        <MessageBar messageBarType={MessageBarType.error}>
          {editor.error.message}
        </MessageBar>
      )}

      {login && (
        <div className="spf-managegroups__list">
          {filteredGroups.length > VIRTUALIZE_THRESHOLD ? (
            <List items={filteredGroups} onRenderCell={renderRow as any} />
          ) : (
            filteredGroups.map(g => renderRow(g))
          )}
        </div>
      )}

      {editor.lastResult && editor.lastResult.failed.length > 0 && (
        <Stack tokens={{ childrenGap: 4 }}>
          <MessageBar messageBarType={MessageBarType.warning}>
            {editor.lastResult.failed.length} group operation(s) failed.
          </MessageBar>
          {editor.lastResult.failed.map(f => (
            <Text key={f.groupId} variant="small">
              Group {f.groupId}: {f.error}
            </Text>
          ))}
        </Stack>
      )}
      {editor.lastResult && editor.lastResult.failed.length === 0 &&
        editor.lastResult.succeeded.length > 0 && (
        <MessageBar messageBarType={MessageBarType.success}>
          Updated {editor.lastResult.succeeded.length} group membership(s).
        </MessageBar>
      )}

      {login && (
        <div className="spf-managegroups__footer">
          <Text>
            +{editor.pendingAdds.length} added, −{editor.pendingRemoves.length} removed.
          </Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <DefaultButton
              text="Reset"
              onClick={editor.reset}
              disabled={!editor.isDirty || editor.applying}
            />
            <PrimaryButton
              text={editor.applying ? 'Applying…' : 'Apply'}
              onClick={() => setConfirmOpen(true)}
              disabled={!editor.isDirty || editor.applying}
            />
          </Stack>
        </div>
      )}

      <Dialog
        hidden={!confirmOpen}
        onDismiss={() => setConfirmOpen(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Confirm changes',
          subText: `Add to ${editor.pendingAdds.length} group(s), remove from ${editor.pendingRemoves.length} group(s). Some changes may succeed while others fail.`,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleApply} text="Apply" />
          <DefaultButton onClick={() => setConfirmOpen(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </Stack>
  );
};
```

Add CSS to `UserAccessAdmin.css`:

```css
.spf-managegroups__list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #edebe9;
  padding: 8px;
}
.spf-managegroups__row {
  padding: 4px 0;
}
.spf-managegroups__footer {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 8px;
  border-top: 1px solid #edebe9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build && npm run type-check
git add src/components/userAccess/UserAccessAdmin/tabs/ManageGroupsTab.tsx src/components/userAccess/UserAccessAdmin/UserAccessAdmin.css
git commit -m "$(cat <<'EOF'
feat(userAccess): implement ManageGroupsTab with bulk-edit + confirm dialog

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 29: `GroupMembersList`

**Files:**
- Create files under `src/components/userAccess/GroupMembersList/`

- [ ] **Step 1: Types**

```typescript
// GroupMembersList.types.ts
export interface IGroupMembersListProps {
  groupRef: { id?: number; name?: string };
  className?: string;
  showSearch?: boolean;
  maxHeight?: number | string;
  onMemberClick?: (userId: number) => void;
  emptyText?: string;
}
```

- [ ] **Step 2: Component**

```typescript
// GroupMembersList.tsx
import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { UserPersona } from '../../UserPersona';
import { useGroupMembers } from '../../../hooks';
import { IGroupMembersListProps } from './GroupMembersList.types';
import './GroupMembersList.css';

export const GroupMembersList: React.FC<IGroupMembersListProps> = ({
  groupRef,
  className,
  showSearch = true,
  maxHeight = 400,
  onMemberClick,
  emptyText = 'No members.',
}) => {
  const { data, loading, error } = useGroupMembers(groupRef);
  const [filter, setFilter] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter(m =>
      [m.title, m.email ?? '', m.loginName].some(s =>
        s.toLowerCase().includes(q)
      )
    );
  }, [members, filter]);

  return (
    <div
      className={`spf-groupmembers ${className ?? ''}`}
      style={{ maxHeight }}
    >
      <Stack tokens={{ childrenGap: 8 }}>
        {showSearch && (
          <SearchBox
            placeholder="Search members…"
            value={filter}
            onChange={(_, v) => setFilter(v ?? '')}
          />
        )}
        {loading && <Spinner label="Loading members…" />}
        {error && (
          <MessageBar messageBarType={MessageBarType.error}>
            {error.message}
          </MessageBar>
        )}
        {!loading && filtered.length === 0 && !error && (
          <Text variant="small">{emptyText}</Text>
        )}
        {filtered.map(m => (
          <div
            key={m.id}
            className="spf-groupmembers__row"
            onClick={() => onMemberClick?.(m.id)}
          >
            <UserPersona userId={m.id} />
          </div>
        ))}
      </Stack>
    </div>
  );
};
```

- [ ] **Step 3: CSS + barrel**

```css
/* GroupMembersList.css */
.spf-groupmembers {
  overflow-y: auto;
  border: 1px solid #edebe9;
  padding: 8px;
}
.spf-groupmembers__row {
  padding: 4px 0;
  cursor: pointer;
}
.spf-groupmembers__row:hover {
  background: #f3f2f1;
}
```

```typescript
// index.ts
export { GroupMembersList } from './GroupMembersList';
export type { IGroupMembersListProps } from './GroupMembersList.types';
```

- [ ] **Step 4: Build + commit**

```bash
npm run build && npm run type-check
git add src/components/userAccess/GroupMembersList/
git commit -m "$(cat <<'EOF'
feat(userAccess): add GroupMembersList add-on component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Wiring & Documentation

### Task 30: `package.json` exports + `docs/Importing-Components.md` + `CLAUDE.md`

**Files:**
- Modify: `package.json`
- Modify: `docs/Importing-Components.md`
- Modify: `CLAUDE.md`
- Create: `src/components/userAccess/index.ts`

- [ ] **Step 1: Create the top-level components barrel**

```typescript
// src/components/userAccess/index.ts
export { MyAccessView } from './MyAccessView';
export type { IMyAccessViewProps } from './MyAccessView';
export { UserAccessAdmin } from './UserAccessAdmin';
export type { IUserAccessAdminProps } from './UserAccessAdmin';
export { GroupMembersList } from './GroupMembersList';
export type { IGroupMembersListProps } from './GroupMembersList';
export { PermissionLevelBadge } from './primitives/PermissionLevelBadge';
export type { IPermissionLevelBadgeProps } from './primitives/PermissionLevelBadge';
export { RequirePermission } from './primitives/RequirePermission';
export type { IRequirePermissionProps } from './primitives/RequirePermission';
export { UserGroupChips } from './primitives/UserGroupChips';
export type { IUserGroupChipsProps } from './primitives/UserGroupChips';
export { DirectPermissionsTable } from './primitives/DirectPermissionsTable';
export type { IDirectPermissionsTableProps } from './primitives/DirectPermissionsTable';
```

- [ ] **Step 2: Also include in the top-level `src/components/index.ts`**

```typescript
// Append to existing src/components/index.ts
export * from './userAccess';
```

- [ ] **Step 3: Edit `package.json` "exports"**

Add these entries (mirroring the existing pattern: a `./components/X` block maps to `./lib/components/X/index.*`):

```jsonc
"./utilities/userAccess": {
  "types": "./lib/utilities/userAccess/index.d.ts",
  "import": "./lib/utilities/userAccess/index.js",
  "require": "./lib/utilities/userAccess/index.js"
},
"./components/userAccess": {
  "types": "./lib/components/userAccess/index.d.ts",
  "import": "./lib/components/userAccess/index.js",
  "require": "./lib/components/userAccess/index.js"
},
"./components/userAccess/MyAccessView": {
  "types": "./lib/components/userAccess/MyAccessView/index.d.ts",
  "import": "./lib/components/userAccess/MyAccessView/index.js",
  "require": "./lib/components/userAccess/MyAccessView/index.js"
},
"./components/userAccess/UserAccessAdmin": {
  "types": "./lib/components/userAccess/UserAccessAdmin/index.d.ts",
  "import": "./lib/components/userAccess/UserAccessAdmin/index.js",
  "require": "./lib/components/userAccess/UserAccessAdmin/index.js"
},
"./components/userAccess/GroupMembersList": {
  "types": "./lib/components/userAccess/GroupMembersList/index.d.ts",
  "import": "./lib/components/userAccess/GroupMembersList/index.js",
  "require": "./lib/components/userAccess/GroupMembersList/index.js"
},
"./components/userAccess/PermissionLevelBadge": {
  "types": "./lib/components/userAccess/primitives/PermissionLevelBadge/index.d.ts",
  "import": "./lib/components/userAccess/primitives/PermissionLevelBadge/index.js",
  "require": "./lib/components/userAccess/primitives/PermissionLevelBadge/index.js"
},
"./components/userAccess/RequirePermission": {
  "types": "./lib/components/userAccess/primitives/RequirePermission/index.d.ts",
  "import": "./lib/components/userAccess/primitives/RequirePermission/index.js",
  "require": "./lib/components/userAccess/primitives/RequirePermission/index.js"
},
"./components/userAccess/UserGroupChips": {
  "types": "./lib/components/userAccess/primitives/UserGroupChips/index.d.ts",
  "import": "./lib/components/userAccess/primitives/UserGroupChips/index.js",
  "require": "./lib/components/userAccess/primitives/UserGroupChips/index.js"
},
"./components/userAccess/DirectPermissionsTable": {
  "types": "./lib/components/userAccess/primitives/DirectPermissionsTable/index.d.ts",
  "import": "./lib/components/userAccess/primitives/DirectPermissionsTable/index.js",
  "require": "./lib/components/userAccess/primitives/DirectPermissionsTable/index.js"
}
```

Sort lexically with existing entries.

- [ ] **Step 4: Append to `docs/Importing-Components.md`**

Add a new section (find the existing table layout in the doc and mirror it):

```markdown
## User Access

| Symbol | Import path |
|---|---|
| `MyAccessView` | `spfx-toolkit/components/userAccess/MyAccessView` |
| `UserAccessAdmin` | `spfx-toolkit/components/userAccess/UserAccessAdmin` |
| `GroupMembersList` | `spfx-toolkit/components/userAccess/GroupMembersList` |
| `PermissionLevelBadge` | `spfx-toolkit/components/userAccess/PermissionLevelBadge` |
| `RequirePermission` | `spfx-toolkit/components/userAccess/RequirePermission` |
| `UserGroupChips` | `spfx-toolkit/components/userAccess/UserGroupChips` |
| `DirectPermissionsTable` | `spfx-toolkit/components/userAccess/DirectPermissionsTable` |
| `userAccessService`, `UserAccessError`, types | `spfx-toolkit/utilities/userAccess` |
| `useUserAccess`, `useEffectiveListPermission`, `useEffectiveItemPermission`, `useSiteGroups`, `useGroupMembers`, `useGroupMembershipEditor`, `useUserAccessComparison`, `useHasPermission`, `useBrokenInheritanceLists` | `spfx-toolkit/hooks` |
```

- [ ] **Step 5: Append entries to `CLAUDE.md` "Available Components" + "Custom Hooks" tables**

Find the existing tables (around the "Component Library Overview" section) and add rows. Use the same column structure as adjacent rows. Example row:

```markdown
| **MyAccessView** | Self-service "what can I see" view | Low | Plain-English UAT view, drill-down on demand |
| **UserAccessAdmin** | Admin investigation + bulk group editor | Medium | Pivot tabs, allowBrowse prop, PermissionKind gate |
| **GroupMembersList** | List members of a SharePoint group | Low | Search filter, persona rows |
```

- [ ] **Step 6: Build + validate + commit**

```bash
npm run build && npm run validate
git add package.json docs/Importing-Components.md CLAUDE.md \
        src/components/userAccess/index.ts src/components/index.ts
git commit -m "$(cat <<'EOF'
feat(userAccess): wire package.json exports + update docs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 31: READMEs

**Files:**
- Create: `src/components/userAccess/README.md`
- Create: `src/components/userAccess/MyAccessView/README.md`
- Create: `src/components/userAccess/UserAccessAdmin/README.md`
- Create: `src/components/userAccess/GroupMembersList/README.md`

- [ ] **Step 1: Top-level `src/components/userAccess/README.md`**

```markdown
# User Access

Components for inspecting user/group/permission state on a SharePoint site.

## Pick the right surface

| Audience | Component | Notes |
|---|---|---|
| Business user (UAT) | `MyAccessView` | Self-service. Plain English. No picker. No actions. |
| Admin (investigate) | `UserAccessAdmin` with `allowBrowse` to broaden | Browse/Compare tabs. Read-only. |
| Admin (manage) | `UserAccessAdmin` (default) | Manage Groups tab gated by `ManageWeb`. |
| Adjacent need: "who is in this group?" | `GroupMembersList` | Standalone widget. |

## Architecture

- **Shared core:** `spfx-toolkit/utilities/userAccess` — `userAccessService`, types, `UserAccessError`, pure helpers (`diffUserAccess`, `accessExportToCsv`).
- **Hooks:** `spfx-toolkit/hooks` — one hook per resource; null arg → idle.
- **Components:** the four primitives + three surface components above.

## Loading model

Progressive disclosure:

1. **Level 1 (on open):** site groups + lists/libraries where the user has matched role assignments.
2. **Level 2 (user picks a list):** effective permission on that list.
3. **Level 3 (user enters item ID):** effective permission on that item.

The default open does not enumerate every list and check effective permissions.

## What the toolkit cannot explain

It surfaces **matched SharePoint role assignments**. It does NOT expand Entra ID security groups, sharing links, app-only grants, or tenant-level overlays. The compare view marks list-level mask differences as `unexplainedDifference` when matched assignments don't account for them.
```

- [ ] **Step 2: Per-component READMEs**

Write a README for each of `MyAccessView`, `UserAccessAdmin`, `GroupMembersList`. Each must contain:
- Import path (from `docs/Importing-Components.md`)
- Props table
- Minimal copy-paste usage example
- Cross-link to the spec

Skeleton for `MyAccessView/README.md`:

```markdown
# MyAccessView

Self-service "what can I see here?" view for the current user. Designed for UAT and landing pages — friendly voice, no admin actions.

**Import:**

```typescript
import { MyAccessView } from 'spfx-toolkit/components/userAccess/MyAccessView';
```

**Props:**

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `className` | `string` | no | — | Extra wrapper class |
| `title` | `string` | no | `'My Access'` | Header text |
| `showRefresh` | `boolean` | no | `true` | Show the refresh button |
| `onError` | `(e: UserAccessError) => void` | no | — | Callback on hook errors |

**Example:**

```tsx
<MyAccessView />
```

**Behavior:**
- Loads Level 1 on mount via `useUserAccess('current')`.
- Drill-down: pick a list → Level 2; enter an item ID → Level 3.
- Wrapped in `<ErrorBoundary>` internally.

**See also:** [Design spec](../../../../docs/superpowers/specs/2026-05-22-user-access-toolkit-design.md).
```

Use the same template for `UserAccessAdmin/README.md` (props from §7 of the spec — `managePermission`, `allowBrowse`, `onError`, `className`, `title`) and `GroupMembersList/README.md` (props from Task 29).

- [ ] **Step 3: Build + commit**

```bash
git add src/components/userAccess/README.md \
        src/components/userAccess/MyAccessView/README.md \
        src/components/userAccess/UserAccessAdmin/README.md \
        src/components/userAccess/GroupMembersList/README.md
git commit -m "$(cat <<'EOF'
docs(userAccess): add READMEs for each surface component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 32: Final build + validate + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Clean build + validate + full test run**

Run all three:
```bash
npm run clean && npm run build && npm run validate && npm test
```

Expected:
- `npm run build` completes without errors.
- `npm run validate` passes — required index files in `components/`, `hooks/`, `utilities/`, `types/`.
- `npm test` reports all pre-existing tests passing PLUS the seven new test files (loginNormalization, cacheKeys, userAccessDiff, userAccessExport, bulkResult, membershipReducer, userAccessCache).

If any step fails, fix in place and re-run. Do not commit a broken state.

- [ ] **Step 2: Manual verification matrix**

The hooks and React surfaces have no automated tests. Stand up a consuming SPFx web part (or use an existing one) that imports from the local `lib/` (`npm link` or pack/install). Verify each row:

| Surface | Scenario | Pass criteria |
|---|---|---|
| `MyAccessView` | Drop on a page as a non-admin user | Loads, shows current user's groups + direct list permissions. Refresh button works. No admin chrome shown. |
| `MyAccessView` | Drill-down: pick a list, enter item id | Level 2 and Level 3 fire on demand, badges render. Empty/invalid item id is handled. |
| `UserAccessAdmin` (default) as non-admin | Drop on a page | "You don't have access…" message; no tabs visible. |
| `UserAccessAdmin` (default) as ManageWeb user | All three tabs visible | Browse/Compare/Manage groups all reachable. |
| `UserAccessAdmin allowBrowse={true}` as non-admin | Browse + Compare tabs visible | Manage groups NOT visible. |
| Browse tab | Pick a user, drill into a list, enter item id | Same Level-1/2/3 flow as MyAccessView. Recently-picked users persist across reload. |
| Compare tab | Pick two users | Level-1 diff renders. Common list row's "Compare permissions" button fetches Level 2 for both. CSV export downloads. |
| Manage groups tab | Pick a user, toggle 3+ groups, click Apply | Confirm dialog → batch → success/partial-failure surface. Reset clears pending. |
| Manage groups tab | Set `managePermission={PermissionKind.ManageLists}` and use a non-ManageWeb but ManageLists user | Tab is visible to ManageLists user; apply succeeds for adds within their reach; failures surface per-group. |
| Concurrent edit | While Manage tab is open, externally add the user to one of the pending-add groups, then click Apply | No error; the pending-add is processed normally (server-side idempotent on add). Pending-remove of an already-removed group lands in `succeeded`. |
| Hidden lists | Default `includeHiddenLists=false` | Hidden lists do not appear in Level 1 or `useBrokenInheritanceLists`. |
| Hidden lists | Call `userAccessService.configure({ includeHiddenLists: true })` | Hidden lists now appear. |
| External / not-resolvable user | Pick or pass a non-resolvable login | `USER_NOT_FOUND` error surfaces in MessageBar; surface chrome remains visible. |
| Bundle isolation | Import only `MyAccessView` in a fresh SPFx web part and run `gulp bundle --ship --analyze-bundle` | Bundle does NOT contain `UserAccessAdmin`, ManageGroupsTab, or `accessExportToCsv` code. |
| Spike: `HasUniqueRoleAssignments eq true` filter | In a tenant that rejects the filter | Service logs the fallback warning and Level 1 still returns correct data via client-side filter. |

Record any failures as TODO items on the project tracker. Do not "fix in place" without a follow-up commit.

- [ ] **Step 3: Final commit (only if verification matrix exposed any small fix)**

If the matrix surfaced a fix, commit it; otherwise nothing to do here.

- [ ] **Step 4: Tag the release candidate**

Tag the merge commit `v<next-alpha>-userAccess` so the consuming web parts repo can pin to a known checkpoint:

```bash
git tag -a "v$(node -p "require('./package.json').version")-userAccess" -m "User Access toolkit feature complete"
```

(Do not push the tag without explicit user approval — local tag only.)

---
