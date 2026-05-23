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

See the full design spec: [`docs/superpowers/specs/2026-05-22-user-access-toolkit-design.md`](../../../docs/superpowers/specs/2026-05-22-user-access-toolkit-design.md).
