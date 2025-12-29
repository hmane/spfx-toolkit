// Export main classes
export { BatchPermissionChecker } from './BatchPermissionChecker';
export { PermissionError } from './PermissionError';
export { PermissionHelper } from './PermissionHelper';
export { LRUCache } from './LRUCache';



// Export constants from types
export { PermissionErrorCodes } from '../../types/permissionTypes';

// Export constants
export {
  CommonGroupNames,
  DefaultGroupMappings,
  DefaultPermissionMappings,
  PermissionHierarchy,
  PermissionLevelHierarchy,
  PermissionOperations,
} from './constants';

// Export utility functions
export {
  getAllSiteGroups,
  getErrorMessage,
  getHighestPermissionLevel,
  getPermissionNames,
  hasRequiredPermissions,
  isGroupNameMatch,
  isSPGroup,
  isSPUser,
  normalizeGroupName,
  permissionLevelIncludes,
} from './utils';

// Export main factory function
import { SPFI } from '@pnp/sp';
import { IPermissionHelperConfig } from '../../types/permissionTypes';
import { PermissionHelper } from './PermissionHelper';

/**
 * Factory function to create a new PermissionHelper instance
 * @param sp - PnP.js SP instance
 * @param config - Optional configuration
 * @returns PermissionHelper instance
 */
export function createPermissionHelper(
  sp: SPFI,
  config?: IPermissionHelperConfig
): PermissionHelper {
  return new PermissionHelper(sp, config);
}
