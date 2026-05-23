import type {
  IAccessDiff,
  IAccessDiffSection,
  IDirectListPermission,
  ISiteGroup,
  IUserAccessLevel1,
} from './types';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n\t]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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

/**
 * Builds a filename-safe identifier from a user's title and email.
 * Format: <sanitized-title-lowercased>@<email-host-without-TLD>.
 * Falls back to title-only if email is missing or has no usable host.
 */
function safeIdentifier(user: { title: string; email?: string }): string {
  const titlePart = user.title.toLowerCase().replace(/[^a-z0-9.+-]/g, '');
  if (!user.email) return titlePart;
  const atIdx = user.email.indexOf('@');
  if (atIdx < 0) return titlePart;
  const host = user.email.slice(atIdx + 1).toLowerCase();
  const hostSansTld = host.replace(/\.[^.]+$/, '').replace(/[^a-z0-9.+-]/g, '');
  if (hostSansTld.length === 0) return titlePart;
  return `${titlePart}@${hostSansTld}`;
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
  parts.push(row(['Title', 'Email']));
  parts.push(row([p.user.title, p.user.email ?? '']));
  parts.push('');
  parts.push('# Site Groups');
  parts.push(...groupsBlock(p.siteGroups));
  parts.push('');
  parts.push('# Direct List Permissions');
  parts.push(...dlpBlock(p.directListPermissions));
  // CSV uses LF line endings; modern parsers and browser-Blob downloads accept this.
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
  return (
    (p as IAccessDiff).userA !== undefined &&
    (p as IAccessDiff).userB !== undefined
  );
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
      filename: `user-access-diff-${safeIdentifier(payload.userA)}-vs-${safeIdentifier(payload.userB)}-${today()}.csv`,
      content: diffCsv(payload),
    };
  }
  return {
    filename: `user-access-${safeIdentifier(payload.user)}-${today()}.csv`,
    content: level1Csv(payload),
  };
}
