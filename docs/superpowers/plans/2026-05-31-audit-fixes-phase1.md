# Audit Fixes — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. Tests run via `node --test` against COMPILED `lib/`, so every test run does `npm run build` first. Lands as ONE squashed commit at the end.

**Goal:** Fix the confirmed correctness bugs, repair bundle/packaging metadata, and harden the userAccess feature, as surfaced by the package audit.

**Architecture:** Four independent task groups (A correctness bugs, B bundle barrel, C packaging metadata, D userAccess hardening). Each is TDD where unit-testable; packaging/JSDoc changes are verified by `type-check` + `build` + `npm pack --dry-run`. We are at `1.0.0-alpha.1`, so breaking changes to export surfaces are acceptable.

**Tech stack:** TypeScript, React 17, Fluent UI 8 (subpath imports), PnP v3, Node native test runner.

**Verification commands:**
- Build: `npm run build`
- Type-check: `npm run type-check`
- Targeted tests: `npm run build && node --test --test-reporter=spec <files>`
- Full suite: `npm run build && node --test --test-reporter=spec 'tests/**/*.test.mjs'`
- Validate/pack: `npm run validate` ; `npm pack --dry-run`

---

## Task A — Correctness bugs

**Files (touch as needed):**
- `src/utilities/permissionHelper/PermissionHelper.ts`
- `src/utilities/stringUtils/stringExtensions.ts`
- `src/utilities/listItemHelper/spUpdater.ts`
- `src/utilities/userAccess/brokenInheritance.ts`, `src/utilities/userAccess/userAccessService.ts`
- Tests under `tests/utilities/...` (add new `.test.mjs` files following existing patterns; import from compiled `lib/`).

### A1. `invalidateUserRoles(userId)` over-invalidates ([PermissionHelper.ts:638-639](src/utilities/permissionHelper/PermissionHelper.ts#L638-L639))
- [ ] **Investigate the cache key structure first.** Role entries are keyed `user_role_${groupName}` (see line ~181) — they are NOT scoped per user. The user-scoped entry is `user_groups_${userId}`. The current ternary `userId !== undefined ? 'user_role_' : 'user_role_'` is identical in both branches and the `deleteWhere` predicate sweeps ALL `user_role_*` entries even when a specific `userId` is passed.
- [ ] **Decide & implement the correct semantics:** when `userId` is provided, only remove that user's scoped entries (`user_groups_${userId}`), and DO NOT wipe the shared group-name role cache (`user_role_*`) — those are not user-specific. When `userId` is undefined, keep clearing all `user_role_*` + `user_groups_*` + `currentUserCache` (current behavior). Update the misleading ternary and the JSDoc to state that role definitions are cached per group, not per user.
- [ ] **Test** (`tests/utilities/permissionHelper/invalidateUserRoles.test.mjs`): seed the cache with `user_role_<group>` and `user_groups_<idA>`/`user_groups_<idB>` entries via the public API or by exercising the methods that populate them; assert `invalidateUserRoles(idA)` removes only idA's group entry and leaves idB's and the shared role entries intact; assert `invalidateUserRoles()` clears everything. If the cache isn't directly seedable, test through the public methods that populate it. Red first, then green.
- Acceptance: passing a `userId` no longer clears other users' cached data.

### A2. Bulk group add/remove can hang on batch-level failure ([userAccessService.ts:567](src/utilities/userAccess/userAccessService.ts#L567), [:610](src/utilities/userAccess/userAccessService.ts#L610))
- [ ] In BOTH `addUserToGroups` and `removeUserFromGroups`, the `catch` already synthesizes `items[]` when `execute()` throws, but `await Promise.all(promises)` then runs unconditionally. When the batch POST fails, PnP v3 leaves the per-op promises unsettled → that await never resolves → caller hangs.
- [ ] **Fix:** move `await Promise.all(promises)` to immediately AFTER `await execute()` *inside the `try`* (so it only runs when the batch resolved and the per-op promises will settle). The `catch` path returns via the synthesized `items[]` without awaiting the hung promises. Keep the two methods consistent with each other.
- [ ] **Guard against partial settle:** wrap the in-try await as `await Promise.allSettled(promises)` (the `.then(ok, err)` handlers already convert rejections into `items` pushes, so allSettled is purely defensive). Confirm `fromItems(items)` still returns correct shape.
- [ ] **Test** (`tests/utilities/userAccess/bulkGroupApply.test.mjs`): stub `SPContext.sp.batched()` to return an `execute` that REJECTS and per-op thenables that never settle; assert `addUserToGroups`/`removeUserFromGroups` still RESOLVE (do not hang — wrap the call in `Promise.race` against a short timer in the test) with all groups marked failed. Also test the success path returns all-succeeded. Red first (current code hangs → test times out), then green.
- Acceptance: a 429/network/CSRF failure during bulk edit returns a failed `IBulkResult` promptly instead of hanging the editor.

### A3. `spUpdater.set()` overload misclassifies Choice values that spell a type name ([spUpdater.ts:~1190](src/utilities/listItemHelper/spUpdater.ts#L1190))
- [ ] The untyped `set()` overload treats a 3rd string arg matching a known field-type name (`'boolean'`, `'date'`, `'choice'`, …) as the explicit type rather than the original value for change detection. A Choice/Text field whose original value is literally one of those strings loses change detection and gets mis-typed.
- [ ] **Fix:** only treat the type argument as a type when it is unambiguous — e.g. require `arguments.length === 4` for the typed-with-original overload, or otherwise disambiguate so a 3-arg call never interprets the original value as a type. Read the existing overload signatures and pick the least-breaking disambiguation; preserve all existing typed-setter behavior.
- [ ] **Test** (extend `tests/utilities/listItemHelper/spUpdaterFieldTypes.test.mjs` or add a new file): `set('Status', 'Active', 'boolean')` where `'boolean'` is the ORIGINAL choice value must (a) still detect the change Active≠boolean and (b) NOT apply boolean formatting. Red first, then green.
- Acceptance: Choice/Text originals that coincide with type names are handled correctly.

### A4. `getQueryStringMap` drops params whose value contains `=` ([stringExtensions.ts:452-453](src/utilities/stringUtils/stringExtensions.ts#L452-L453))
- [ ] Current: `const pair = pairs[i].split('='); if (pair.length === 2) {...}`. A value like `redirect=https://x/?a=1` yields length 3 and is silently dropped; empty values (`flag=`) are also dropped.
- [ ] **Fix:** split on the FIRST `=` only:
```typescript
      const pair = pairs[i];
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const key = decodeURIComponent(pair.substring(0, eq));
      const value = decodeURIComponent(pair.substring(eq + 1));
      if (key) params[key] = value;
```
- [ ] **Test** (`tests/utilities/stringUtils/getQueryStringMap.test.mjs`): `getQueryStringMap('redirect=https://x/?a=1&b=2')` → `{ redirect: 'https://x/?a=1', b: '2' }`; `getQueryStringMap('flag=')` → `{ flag: '' }`; existing simple cases still pass. Red first, then green.
- Acceptance: values with `=` and empty values are preserved.

### A5. Unpaginated SharePoint scans silently truncate ([brokenInheritance.ts:31-44](src/utilities/userAccess/brokenInheritance.ts#L31-L44); `getGroupMembers` & `getUserSiteGroupsRaw` in userAccessService.ts)
- [ ] Replace single-page `(...)()` calls that can return >100/>5000 rows with PnP `.getAll()` (auto-paging) or an explicit `.top()` loop, for: (a) `getListsWithUniqueRoleAssignments` filtered + fallback branches, (b) `getGroupMembers` group users, (c) any list/group enumeration that can exceed the default page.
- [ ] **Test** (`tests/utilities/userAccess/pagination.test.mjs`): stub the PnP queryable so `.getAll()` is the method invoked (or assert `.top(...)` present) for these calls; if `.getAll()` is hard to unit-test, assert via a thin seam that the paging method is used. At minimum add a test that a >100-row stub returns all rows, not 100. Red first if feasible, else document why and assert the paging call shape.
- Acceptance: large sites/groups return complete data.

- [ ] **Run after all of A:** `npm run build && node --test --test-reporter=spec 'tests/utilities/**/*.test.mjs'` — all green. Do NOT commit yet (single commit at end). Report status.

---

## Task B — Bundle: stop the components barrel pulling heavy deps

**File:** `src/components/index.ts` (and verify `package.json` `exports` already expose deep subpaths for the heavy components).

- [ ] **Confirm deep subpaths exist** in `package.json` `exports` for each heavy component (`./components/Comments`, `./components/SPDynamicForm`, `./components/spForm`, `./components/spFields`, `./components/VersionHistory`, `./components/ManageAccess`, `./components/SPListItemAttachments`, `./components/GroupUsersPicker`, `./components/userAccess`). They must remain importable after the barrel change. If any is missing, ADD it (with proxy dir if the repo uses proxy `package.json` dirs — follow the existing pattern).
- [ ] **Split the barrel:** `src/components/index.ts` should `export *` ONLY the lightweight, low-dependency components: `Card`, `ConflictDetector`, `DocumentLink`, `ErrorBoundary`, `GroupViewer`, `UserPersona`, `WorkflowStepper`. Keep `export * from './lazy'`. REMOVE the `export *` of heavy components (Comments, spForm, spFields, SPDynamicForm, SPListItemAttachments, VersionHistory, ManageAccess, GroupUsersPicker, userAccess) — they remain reachable via their deep subpaths only. Add a header comment explaining the split and pointing to deep subpaths + `docs/Importing-Components.md`.
- [ ] **Decision note:** verify each component's actual imports before classifying. If a component you intend to keep in the barrel transitively imports DevExtreme/react-mentions/PnP-augmentations, move it to the deep-subpath-only group instead. Record the final classification in the commit body.
- [ ] **sideEffects review** (`package.json`): remove the unnecessary `**/CssLoader.js` entry (it has no import-time side effects); keep CSS/scss and the PnP augmentation + sp-context entries. Do NOT remove anything whose removal could let a bundler drop a runtime PnP augmentation — if any augmentation-only file (e.g. `userAccessService`, `context-manager`) relies on top-level `import '@pnp/sp/...'`, ADD those compiled `.js` paths to `sideEffects` so they aren't tree-shaken. Verify the build still loads PnP correctly via `npm run validate`.
- [ ] **Verify:** `npm run build` succeeds; `node -e "require('./lib/components/index.js')"` loads without pulling DevExtreme (spot-check by confirming heavy components are absent from the barrel's exports). Update `docs/Importing-Components.md` if it claims heavy components are importable from `spfx-toolkit/components`.
- Acceptance: importing `spfx-toolkit/components` no longer forces DevExtreme/react-mentions/heavy PnP into the consumer bundle; heavy components still import via deep subpaths.

---

## Task C — Packaging metadata correctness

**File:** `package.json` (+ `docs/Importing-Components.md` notes).

- [ ] **Declare runtime `@microsoft/sp-*` peers.** Add to `peerDependencies` every `@microsoft/sp-*` package imported at runtime (audit found 7; verify with `grep -rn "from '@microsoft/sp-" src --include='*.ts' --include='*.tsx' | grep -v 'import type'`). Use a range like `">=1.21.1"`. Mark them `optional: true` in a new `peerDependenciesMeta` block (they're injected by the SPFx host).
- [ ] **Declare `react-mentions`.** It is imported at runtime in `Comments/components/CommentInput.tsx`. Add `"react-mentions": "^4.4.0"` (match the version `@pnp/spfx-controls-react` resolves) to `peerDependencies` and mark optional in `peerDependenciesMeta`. Document in `Importing-Components.md` that the Comments component requires it.
- [ ] **Widen Fluent UI pin.** Change `"@fluentui/react": "8.106.4"` → `"^8.106.4"` to avoid `ERESOLVE` on other SPFx 8.x patches.
- [ ] **Mark heavy peers optional.** In `peerDependenciesMeta`, mark `devextreme`, `devextreme-react`, `react-hook-form`, `zustand`, `@pnp/spfx-controls-react` as `{ "optional": true }` so consumers who don't use those subsystems don't get spurious install warnings.
- [ ] **Add `types` condition to the `./lib/*` wildcard export** so deep imports keep types under `moduleResolution: bundler/node16`:
```json
"./lib/*": { "types": "./lib/*.d.ts", "require": "./lib/*.js", "import": "./lib/*.js" }
```
Verify the existing named exports still type-resolve.
- [ ] **Verify:** `npm run type-check` clean; `npm pack --dry-run` lists `lib/**` and no `src`/tests; `npm run validate` passes. (No unit test — metadata.)
- Acceptance: peer deps reflect reality, install is warning-clean for minimal consumers, deep-import types survive modern module resolution.

---

## Task D — userAccess hardening

**Files:** `src/utilities/userAccess/userAccessService.ts`, `src/components/userAccess/UserAccessAdmin/UserAccessAdmin.tsx` (+ `.types.ts`), `src/components/userAccess/GroupMembersList/GroupMembersList.tsx`.

### D1. Surface non-(user/SP-group) principals in `matchAssignments` ([userAccessService.ts:158-168](src/utilities/userAccess/userAccessService.ts#L158-L168))
- [ ] Today only `PrincipalType === 1` (user) and `=== 8` (SP group) are matched; access via Entra/AD **Security Groups** (type 4) and **"Everyone"/"Everyone except external users"** is silently dropped, so the UI shows the correct permission level but an empty source list with no explanation.
- [ ] **Fix:** when an assignment's principal is not type 1/8 but the user's effective mask indicates access through it, include it in the returned matches with a marker (e.g. add an `unresolved: true` / `principalKind` field on the matched assignment, or return a synthetic source labelled like "Security group / Everyone (membership not enumerable)"). At minimum, emit a structured `SPContext.logger` note so operators understand why a level is granted without a listed source. Keep `permissionLevel` accuracy unchanged. Update `types.ts` if you add a field.
- [ ] **Test** (`tests/utilities/userAccess/matchAssignments.test.mjs` — if `matchAssignments` is not exported, test through the public method that consumes it, or export it for testability): given an assignment with `PrincipalType: 4`, the result surfaces a source/marker rather than an empty array. Red first, then green.

### D2. `allowBrowse` information-disclosure warning ([UserAccessAdmin.tsx:26](src/components/userAccess/UserAccessAdmin/UserAccessAdmin.tsx#L26))
- [ ] Add a prominent JSDoc warning on the `allowBrowse` prop (in `UserAccessAdmin.types.ts`) stating that enabling it lets non-admin users enumerate ANY user's group memberships and list permissions, and that the toolkit relies on SharePoint's own read restrictions (often permissive by default). Recommend gating it behind an admin check in consumer code. (Docs/JSDoc only — no behavior change; verified by type-check/build.)

### D3. `GroupMembersList` accessibility + large-list handling ([GroupMembersList.tsx](src/components/userAccess/GroupMembersList/GroupMembersList.tsx))
- [ ] Interactive member rows are `<div onClick>` with no keyboard/ARIA. When `onMemberClick` is provided, render the row as a `<button>` (or add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handling Enter/Space). Preserve styling.
- [ ] For large member lists, render via Fluent UI `@fluentui/react/lib/List` above a threshold (e.g. 50) — mirror the `VIRTUALIZE_THRESHOLD` pattern already used in `ManageGroupsTab`. Below threshold keep the simple map.
- [ ] **Verify:** `npm run type-check` + `npm run build`. (No jsdom harness — manual/structural verification; keep any extractable pure logic testable.)
- Acceptance: keyboard users can activate member rows; large groups don't render hundreds of unvirtualized DOM rows.

- [ ] **Run after D:** full suite `npm run build && node --test --test-reporter=spec 'tests/**/*.test.mjs'` green; `npm run type-check` clean.

---

## Finalization

- [ ] **Full verification:** `npm run build` + `npm run type-check` + `node --test --test-reporter=spec 'tests/**/*.test.mjs'` + `npm run validate` + `npm pack --dry-run` — all clean.
- [ ] **Squash** all Phase 1 work into ONE commit on the working branch (soft-reset to the pre-Phase-1 commit, single commit), per user request. Commit body lists the fixes by area and notes the breaking barrel change (alpha).

## Self-Review
- Spec coverage: bugs #1-5 → Task A; bundle barrel + sideEffects → Task B; peer deps + fluent pin + lib/* types → Task C; matchAssignments + allowBrowse + GroupMembersList a11y → Task D.
- The two subtle fixes (A1 role-cache semantics, A2 batch hang) carry explicit "investigate the actual code first" steps rather than hard-coded possibly-wrong code.
- Breaking change (Task B barrel) is acceptable at `1.0.0-alpha.1`.
