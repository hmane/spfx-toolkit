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
      .select(...(SELECT as unknown as string[]))()) as RawList[];

    // Sanity check: every row should actually have HasUniqueRoleAssignments=true.
    // If the server silently ignored the filter, fall back.
    const suspect = raw.some(r => r.HasUniqueRoleAssignments === false);
    if (suspect) throw new Error('server-side filter did not narrow results');
  } catch (err) {
    SPContext.logger.warn(
      'brokenInheritance: server-side filter unavailable, falling back to client-side',
      err
    );
    const all = (await lists.select(...(SELECT as unknown as string[]))()) as RawList[];
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
