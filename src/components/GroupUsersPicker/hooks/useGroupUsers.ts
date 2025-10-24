/**
 * useGroupUsers Hook
 * Fetches users from a SharePoint group with caching support
 * Recursively fetches users from nested SharePoint groups
 */

import * as React from 'react';
import { SPContext } from '../../../utilities/context';
import { getInitials, getPersonaColor } from '../../UserPersona/UserPersonaUtils';
import { IGroupUser } from '../GroupUsersPicker.types';
import { fetchAllGroupUsersRecursive } from '../utils/groupUserFetcher';
import { getUserPhotoIfNotDefault } from '../utils/userPhotoHelper';

export interface IUseGroupUsersResult {
  /**
   * List of users from the group (deduplicated and sorted)
   */
  users: IGroupUser[];

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error message if loading failed
   */
  error: string | null;

  /**
   * Retry loading users
   */
  retry: () => void;
}

/**
 * Hook to fetch users from a SharePoint group (recursively includes nested groups)
 * @param groupName - Name of the SharePoint group
 * @param useCache - Whether to use cached data (true = spCached, false = spPessimistic)
 * @returns Users (deduplicated from all nested groups), loading state, error, and retry function
 */
export function useGroupUsers(groupName: string, useCache: boolean = false): IUseGroupUsersResult {
  const [users, setUsers] = React.useState<IGroupUser[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState<number>(0);

  const siteUrl = SPContext.spfxContext?.pageContext?.web?.absoluteUrl || '';

  React.useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      if (!groupName || groupName.trim().length === 0) {
        setError('Group name is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use spPessimistic for fresh data or spCached for cached data
        const sp = useCache ? SPContext.spCached : SPContext.spPessimistic;

        // Fetch all users recursively from the group and nested groups
        SPContext.logger.info('GroupUsersPicker: Starting recursive user fetch', {
          groupName,
          useCache,
        });

        const groupUsers = await fetchAllGroupUsersRecursive(sp, groupName);

        if (!isMounted) return;

        SPContext.logger.info('GroupUsersPicker: Recursive fetch completed', {
          groupName,
          totalUsers: groupUsers.length,
        });

        // Transform users to IGroupUser format with photo validation
        const transformedUsersPromises = groupUsers.map(async user => {
          const displayName = user.Title || user.Email || user.LoginName || 'Unknown User';
          const email = user.Email || user.LoginName || '';
          const loginName = user.LoginName || user.Email || '';

          // Get photo only if it's not a default SharePoint photo
          // This prevents showing OOB photos and the flash effect
          const photoUrl = await getUserPhotoIfNotDefault(siteUrl, loginName, 'S');

          return {
            id: user.Id,
            text: displayName,
            secondaryText: email,
            imageUrl: photoUrl, // Will be undefined for default photos
            loginName: loginName,
            imageInitials: getInitials(displayName),
            initialsColor: getPersonaColor(displayName),
          };
        });

        const transformedUsers: IGroupUser[] = await Promise.all(transformedUsersPromises);

        if (!isMounted) return;

        // Users are already sorted by the recursive fetch function
        setUsers(transformedUsers);
        setError(null);

        SPContext.logger.info('GroupUsersPicker: Users loaded successfully', {
          groupName,
          userCount: transformedUsers.length,
        });
      } catch (err: any) {
        if (!isMounted) return;

        const errorMessage = err?.message || 'Failed to load group users';

        // Check for specific error types
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          setError(`Group "${groupName}" does not exist or you don't have permission to access it.`);
        } else if (errorMessage.includes('Access denied') || errorMessage.includes('Unauthorized')) {
          setError(`You don't have permission to view users in group "${groupName}".`);
        } else {
          setError(`Failed to load users from group "${groupName}": ${errorMessage}`);
        }

        SPContext.logger.error('GroupUsersPicker: Failed to load users', err, {
          groupName,
        });

        setUsers([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [groupName, useCache, retryCount, siteUrl]);

  const retry = React.useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return {
    users,
    loading,
    error,
    retry,
  };
}
