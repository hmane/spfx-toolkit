import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';

export interface IRequirePermissionProps {
  kind?: PermissionKind;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
