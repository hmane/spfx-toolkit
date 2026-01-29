/**
 * Group User Fetcher Utility
 * Recursively fetches all users from SharePoint groups including nested groups
 */

import { SPFI } from '@pnp/sp';
import { ISiteUserInfo } from '@pnp/sp/site-users/types';
import { ISiteGroupInfo } from '@pnp/sp/site-groups/types';
import { SPContext } from '../../../utilities/context';

/**
 * Interface representing a user with group membership tracking
 */
interface IUserWithGroups {
  user: ISiteUserInfo;
  fromGroups: string[];
}

/**
 * Map to track processed groups and prevent infinite loops
 */
type ProcessedGroupsMap = Set<number>;

/**
 * Map to deduplicate users by their ID
 */
type UserMap = Map<number, IUserWithGroups>;

/**
 * Recursively fetches all users from a SharePoint group including nested groups
 * @param sp - PnP SP instance
 * @param groupName - Name of the SharePoint group
 * @returns Array of unique users from the group and all nested groups
 */
export async function fetchAllGroupUsersRecursive(
  sp: SPFI,
  groupName: string
): Promise<ISiteUserInfo[]> {
  const processedGroups: ProcessedGroupsMap = new Set();
  const userMap: UserMap = new Map();

  await fetchGroupUsersRecursiveInternal(sp, groupName, processedGroups, userMap, groupName);

  // Return unique users sorted by display name
  const uniqueUsers = Array.from(userMap.values()).map(item => item.user);
  uniqueUsers.sort((a, b) => {
    const nameA = a.Title || a.Email || a.LoginName || '';
    const nameB = b.Title || b.Email || b.LoginName || '';
    return nameA.localeCompare(nameB);
  });

  return uniqueUsers;
}

/**
 * Internal recursive function to fetch users from groups (by name - entry point)
 * @param sp - PnP SP instance
 * @param groupName - Current group name
 * @param processedGroups - Set of already processed group IDs
 * @param userMap - Map of users to deduplicate
 * @param rootGroupName - Original root group name for logging
 */
async function fetchGroupUsersRecursiveInternal(
  sp: SPFI,
  groupName: string,
  processedGroups: ProcessedGroupsMap,
  userMap: UserMap,
  rootGroupName: string
): Promise<void> {
  try {
    // Get the group by name (entry point)
    const group: ISiteGroupInfo = await sp.web.siteGroups.getByName(groupName)();

    if (!group || !group.Id) {
      SPContext.logger.warn('GroupUserFetcher: Group not found or has no ID', {
        groupName,
      });
      return;
    }

    // Delegate to ID-based internal function
    await fetchGroupUsersByIdInternal(sp, group.Id, groupName, processedGroups, userMap, rootGroupName);
  } catch (error: any) {
    // Log error but continue processing other groups
    SPContext.logger.error('GroupUserFetcher: Error processing group', error, {
      groupName,
    });

    // If this is the root group, throw the error
    if (groupName === rootGroupName) {
      throw error;
    }
  }
}

/**
 * Internal recursive function to fetch users from groups (by ID - stable lookup)
 * @param sp - PnP SP instance
 * @param groupId - Current group ID
 * @param groupName - Group name for logging
 * @param processedGroups - Set of already processed group IDs
 * @param userMap - Map of users to deduplicate
 * @param rootGroupName - Original root group name for logging
 */
async function fetchGroupUsersByIdInternal(
  sp: SPFI,
  groupId: number,
  groupName: string,
  processedGroups: ProcessedGroupsMap,
  userMap: UserMap,
  rootGroupName: string
): Promise<void> {
  try {
    // Check if we've already processed this group (prevent infinite loops)
    if (processedGroups.has(groupId)) {
      SPContext.logger.info('GroupUserFetcher: Already processed group, skipping', {
        groupName,
        groupId,
      });
      return;
    }

    // Mark this group as processed
    processedGroups.add(groupId);

    // Get all users from this group using stable ID-based lookup
    const users: ISiteUserInfo[] = await sp.web.siteGroups.getById(groupId).users();

    SPContext.logger.info('GroupUserFetcher: Processing group', {
      groupName,
      groupId,
      memberCount: users.length,
    });

    // Process each member
    for (const user of users) {
      // Check if this is a SharePoint group (PrincipalType = 8 means it's a group)
      // PrincipalType values:
      // 1 = User
      // 4 = DomainGroup (AD group)
      // 8 = SharePointGroup
      // 16 = SecurityGroup

      if (user.PrincipalType === 8) {
        // This is a nested SharePoint group - recursively fetch its users
        // Use user.Id which is the group's ID for stable lookup (not Title which can change)
        SPContext.logger.info('GroupUserFetcher: Found nested group', {
          nestedGroupTitle: user.Title,
          nestedGroupId: user.Id,
        });
        await fetchGroupUsersByIdInternal(
          sp,
          user.Id,
          user.Title || `Group ${user.Id}`,
          processedGroups,
          userMap,
          rootGroupName
        );
      } else {
        // This is a regular user - add to our deduplicated map
        if (!userMap.has(user.Id)) {
          userMap.set(user.Id, {
            user: user,
            fromGroups: [groupName],
          });
          SPContext.logger.info('GroupUserFetcher: Added user', {
            userTitle: user.Title,
            userId: user.Id,
            fromGroup: groupName,
          });
        } else {
          // User already exists, just track which group we also found them in
          const existing = userMap.get(user.Id)!;
          existing.fromGroups.push(groupName);
          SPContext.logger.info('GroupUserFetcher: User already exists, found in additional group', {
            userTitle: user.Title,
            userId: user.Id,
            additionalGroup: groupName,
          });
        }
      }
    }

    SPContext.logger.info('GroupUserFetcher: Completed processing group', {
      groupName,
      groupId,
      totalUniqueUsers: userMap.size,
    });
  } catch (error: any) {
    // Log error but continue processing other groups
    SPContext.logger.error('GroupUserFetcher: Error processing group by ID', error, {
      groupName,
      groupId,
    });

    // Don't throw for nested groups - the root group error is handled in the name-based function
  }
}

/**
 * Checks if a principal is a SharePoint group
 * @param principalType - The PrincipalType value
 * @returns True if the principal is a SharePoint group
 */
export function isSharePointGroup(principalType: number): boolean {
  return principalType === 8;
}

/**
 * Checks if a principal is a user
 * @param principalType - The PrincipalType value
 * @returns True if the principal is a user
 */
export function isUser(principalType: number): boolean {
  return principalType === 1;
}
