// UserAccessAdmin.tsx
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react/lib/Stack';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ErrorBoundary } from '../../ErrorBoundary';
import { useHasPermission } from '../../../hooks';
import { BrowseTab } from './tabs/BrowseTab';
import { CompareTab } from './tabs/CompareTab';
import { ManageGroupsTab } from './tabs/ManageGroupsTab';
import { IUserAccessAdminProps } from './UserAccessAdmin.types';
import './UserAccessAdmin.css';

export const UserAccessAdmin: React.FC<IUserAccessAdminProps> = ({
  className,
  title = 'User Access',
  managePermission = PermissionKind.ManageWeb,
  allowBrowse = false,
  onError,
}) => {
  const { allowed: canManage, loading: gateLoading } =
    useHasPermission(managePermission);

  const showBrowseAndCompare = canManage || allowBrowse;
  const showManageGroups = canManage;
  const showAny = showBrowseAndCompare || showManageGroups;

  return (
    <ErrorBoundary>
      <div className={`spf-useradmin ${className ?? ''}`}>
        <Stack tokens={{ childrenGap: 12 }}>
          <Text variant="xLarge">{title}</Text>

          {gateLoading && <Text variant="small">Loading…</Text>}

          {!gateLoading && !showAny && (
            <MessageBar messageBarType={MessageBarType.info}>
              You don't have access to any user-admin features on this site.
            </MessageBar>
          )}

          {!gateLoading && showAny && (
            <Pivot>
              {showBrowseAndCompare && (
                <PivotItem headerText="Browse" itemKey="browse">
                  <BrowseTab onError={onError} />
                </PivotItem>
              )}
              {showBrowseAndCompare && (
                <PivotItem headerText="Compare" itemKey="compare">
                  <CompareTab onError={onError} />
                </PivotItem>
              )}
              {showManageGroups && (
                <PivotItem headerText="Manage groups" itemKey="manage">
                  <ManageGroupsTab
                    managePermission={managePermission}
                    onError={onError}
                  />
                </PivotItem>
              )}
            </Pivot>
          )}
        </Stack>
      </div>
    </ErrorBoundary>
  );
};
