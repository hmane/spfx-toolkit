import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import '../utilities/context/pnpImports/core';
import '../utilities/context/pnpImports/security';
import { SPContext } from '../utilities/context';
import { UserAccessError } from '../utilities/userAccess';

export interface IUseHasPermissionResult {
  allowed: boolean;
  loading: boolean;
  error: UserAccessError | null;
}

/**
 * Hook to check if the current user has a specific permission kind.
 *
 * @param kind - The PermissionKind to check (default: PermissionKind.ManageWeb)
 * @returns An object with allowed (boolean), loading (boolean), and error (UserAccessError | null)
 *
 * @example
 * const { allowed, loading, error } = useHasPermission(PermissionKind.EditListItems);
 *
 * if (loading) return <Spinner label="Checking permissions..." />;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return allowed ? <AdminPanel /> : <div>Access Denied</div>;
 */
export function useHasPermission(
  kind: PermissionKind = PermissionKind.ManageWeb
): IUseHasPermissionResult {
  const [state, setState] = React.useState<IUseHasPermissionResult>({
    allowed: false,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const ok: boolean = await SPContext.sp.web.currentUserHasPermissions(kind);
        if (!cancelled) setState({ allowed: ok, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setState({
            allowed: false,
            loading: false,
            error: new UserAccessError('UNKNOWN', msg, { cause: err }),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return state;
}
