/**
 * Ensure User Helper
 * Asynchronously ensures users exist in SharePoint without blocking UI
 */

import { SPContext } from '../../../utilities/context';
import { IGroupUser } from '../GroupUsersPicker.types';

/**
 * Ensures a single user exists in SharePoint
 * @param user - User to ensure
 * @returns Promise that resolves when user is ensured
 */
async function ensureSingleUser(user: IGroupUser): Promise<void> {
  try {
    if (!user.loginName) {
      SPContext.logger.warn('GroupUsersPicker: Cannot ensure user without loginName', {
        userId: user.id,
        displayName: user.text,
      });
      return;
    }

    await SPContext.sp.web.ensureUser(user.loginName);

    SPContext.logger.info('GroupUsersPicker: User ensured', {
      userId: user.id,
      displayName: user.text,
      loginName: user.loginName,
    });
  } catch (error) {
    SPContext.logger.error('GroupUsersPicker: Failed to ensure user', error, {
      userId: user.id,
      displayName: user.text,
      loginName: user.loginName,
    });
  }
}

/**
 * Ensures multiple users exist in SharePoint
 * Runs asynchronously without blocking UI
 * @param users - Array of users to ensure
 */
export function ensureUsers(users: IGroupUser[]): void {
  if (!users || users.length === 0) {
    return;
  }

  // Run async without blocking
  Promise.all(users.map(user => ensureSingleUser(user))).catch(error => {
    SPContext.logger.error('GroupUsersPicker: Failed to ensure users', error, {
      userCount: users.length,
    });
  });
}

/**
 * Ensures users with a callback when complete
 * @param users - Array of users to ensure
 * @param onComplete - Callback when all users are ensured
 */
export async function ensureUsersWithCallback(
  users: IGroupUser[],
  onComplete?: (success: boolean) => void
): Promise<void> {
  try {
    await Promise.all(users.map(user => ensureSingleUser(user)));
    onComplete?.(true);
  } catch (error) {
    SPContext.logger.error('GroupUsersPicker: Failed to ensure users with callback', error);
    onComplete?.(false);
  }
}
