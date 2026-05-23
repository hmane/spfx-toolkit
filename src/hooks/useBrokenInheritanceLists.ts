// src/hooks/useBrokenInheritanceLists.ts
import * as React from 'react';
import {
  brokenInheritanceKey,
  invalidatePrefix,
  userAccessService,
} from '../utilities/userAccess';
import type { IListWithUniqueRoles } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseBrokenInheritanceListsResult =
  IAsyncResource<IListWithUniqueRoles[]>;

export function useBrokenInheritanceLists(): UseBrokenInheritanceListsResult {
  const resource = useAsyncResource<IListWithUniqueRoles[]>(
    () => userAccessService.listsWithBrokenInheritance(),
    [],
    true
  );
  const baseRefresh = resource.refresh;
  const refresh = React.useCallback((): void => {
    invalidatePrefix(brokenInheritanceKey());
    baseRefresh();
  }, [baseRefresh]);
  return { ...resource, refresh };
}
