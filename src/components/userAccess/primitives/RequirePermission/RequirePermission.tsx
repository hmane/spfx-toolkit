import * as React from 'react';
import { Shimmer, ShimmerElementType } from '@fluentui/react/lib/Shimmer';
import { PermissionKind } from '@pnp/sp/security';
import { useHasPermission } from '../../../../hooks';
import { IRequirePermissionProps } from './RequirePermission.types';

export const RequirePermission: React.FC<IRequirePermissionProps> = ({
  kind = PermissionKind.ManageWeb,
  fallback = null,
  children,
}) => {
  const { allowed, loading } = useHasPermission(kind);
  if (loading) {
    return (
      <Shimmer
        shimmerElements={[
          { type: ShimmerElementType.line, height: 16, width: '60%' },
        ]}
      />
    );
  }
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
};
