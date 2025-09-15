import { SPFI } from '@pnp/sp';
import {
  IBatchItemRequest,
  IBatchListRequest,
  IPermissionHelperConfig,
  IPermissionResult,
} from '../../types/permissionTypes';
import { PermissionHelper } from './PermissionHelper';
import { getErrorMessage } from './utils';

/**
 * Batch permission checker for multiple lists/items
 * Provides efficient batch operations for checking permissions across multiple resources
 */
export class BatchPermissionChecker {
  private permissionHelper: PermissionHelper;

  constructor(sp: SPFI, config?: IPermissionHelperConfig) {
    this.permissionHelper = new PermissionHelper(sp, config);
  }

  /**
   * Check permissions across multiple lists
   * @param requests - Array of permission check requests
   * @returns Promise<Record<string, IPermissionResult>>
   */
  async checkMultipleLists(
    requests: IBatchListRequest[]
  ): Promise<Record<string, IPermissionResult>> {
    const results: Record<string, IPermissionResult> = {};

    const checks = requests.map(async request => {
      const key = request.key || `${request.listName}_${request.permission}`;
      try {
        const result = await this.permissionHelper.userHasPermissionOnList(
          request.listName,
          request.permission
        );
        return { key, result };
      } catch (error) {
        return {
          key,
          result: {
            hasPermission: false,
            error: getErrorMessage(error),
          },
        };
      }
    });

    const checkResults = await Promise.all(checks);

    for (const { key, result } of checkResults) {
      results[key] = result;
    }

    return results;
  }

  /**
   * Check permissions across multiple items
   * @param requests - Array of item permission check requests
   * @returns Promise<Record<string, IPermissionResult>>
   */
  async checkMultipleItems(
    requests: IBatchItemRequest[]
  ): Promise<Record<string, IPermissionResult>> {
    const results: Record<string, IPermissionResult> = {};

    const checks = requests.map(async request => {
      const key = request.key || `${request.listName}_${request.itemId}_${request.permission}`;
      try {
        const result = await this.permissionHelper.userHasPermissionOnItem(
          request.listName,
          request.itemId,
          request.permission
        );
        return { key, result };
      } catch (error) {
        return {
          key,
          result: {
            hasPermission: false,
            error: getErrorMessage(error),
          },
        };
      }
    });

    const checkResults = await Promise.all(checks);

    for (const { key, result } of checkResults) {
      results[key] = result;
    }

    return results;
  }

  /**
   * Clear the cache for the underlying permission helper
   */
  clearCache(): void {
    this.permissionHelper.clearCache();
  }

  /**
   * Get the underlying permission helper instance
   */
  getPermissionHelper(): PermissionHelper {
    return this.permissionHelper;
  }
}
