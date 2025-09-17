// Export main component
export { ManageAccessComponent } from './ManageAccessComponent';

// Export panel component
export { ManageAccessPanel } from './ManageAccessPanel';

// Export types
export type {
  IManageAccessComponentProps,
  IManageAccessComponentState,
  IPermissionPrincipal,
  IActivityFeedItem,
  IPermissionLevelOption,
  ISPRoleAssignment,
  ISPMember,
  ISPRoleDefinition,
} from './types';

// Export constants
export { PermissionLevelOptions, DefaultProps } from './types';

// Import styles to ensure they're included
import './ManageAccessComponent.css';
