// src/hooks/useUserAccess.ts
import * as React from 'react';
import {
  invalidatePrefix,
  level1Key,
  userAccessService,
} from '../utilities/userAccess';
import type { IUserAccessLevel1, LoginInput } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseUserAccessResult = IAsyncResource<IUserAccessLevel1>;

export function useUserAccess(
  login: LoginInput | null
): UseUserAccessResult {
  const enabled = login !== null && login !== undefined;
  const resource = useAsyncResource<IUserAccessLevel1>(
    () => userAccessService.getUserAccessLevel1(login as LoginInput),
    [login],
    enabled
  );

  // refresh() must also bust the service-level cache for this login,
  // otherwise the next call returns stale cached data.
  const baseRefresh = resource.refresh;
  const refresh = React.useCallback((): void => {
    if (login) {
      invalidatePrefix(level1Key(login));
    }
    baseRefresh();
  }, [login, baseRefresh]);

  return { ...resource, refresh };
}
