// Export main component
export { ManageAccessComponent } from './ManageAccessComponent';

// Export panel component
export { ManageAccessPanel } from './ManageAccessPanel';

// Export types for consuming projects
export type { IManageAccessComponentProps, IPermissionPrincipal, IPermissionLevelOption } from './types';
export type { IManageAccessPanelProps } from './ManageAccessPanel';

// Export constants
export { DefaultProps, PermissionLevelOptions } from './types';

// Import styles to ensure they're included
import './ManageAccessComponent.css';
