// tabs/ManageGroupsTab.tsx
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import type { UserAccessError } from '../../../../utilities/userAccess';

export const ManageGroupsTab: React.FC<{
  managePermission: PermissionKind;
  onError?: (e: UserAccessError) => void;
}> = () => <div>Manage groups tab — implemented in Task 28</div>;
