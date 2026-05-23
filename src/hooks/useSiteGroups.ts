// src/hooks/useSiteGroups.ts
import * as React from 'react';
import {
  invalidatePrefix,
  siteGroupsKey,
  userAccessService,
} from '../utilities/userAccess';
import type { ISiteGroup } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseSiteGroupsResult = IAsyncResource<ISiteGroup[]>;

export function useSiteGroups(): UseSiteGroupsResult {
  const resource = useAsyncResource<ISiteGroup[]>(
    () => userAccessService.getAllSiteGroups(),
    [],
    true
  );

  const baseRefresh = resource.refresh;
  const refresh = React.useCallback((): void => {
    invalidatePrefix(siteGroupsKey());
    baseRefresh();
  }, [baseRefresh]);

  return { ...resource, refresh };
}
