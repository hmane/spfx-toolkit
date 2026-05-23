// src/hooks/useEffectiveItemPermission.ts
import * as React from 'react';
import {
  invalidatePrefix,
  level3Key,
  userAccessService,
} from '../utilities/userAccess';
import type {
  IItemPermission,
  ListRef,
  LoginInput,
} from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseEffectiveItemPermissionResult = IAsyncResource<IItemPermission>;

export function useEffectiveItemPermission(
  login: LoginInput | null,
  listRef: ListRef | null,
  itemId: number | null
): UseEffectiveItemPermissionResult {
  const enabled =
    login !== null &&
    login !== undefined &&
    listRef !== null &&
    listRef !== undefined &&
    (!!listRef.id || !!listRef.title) &&
    typeof itemId === 'number';

  const resource = useAsyncResource<IItemPermission>(
    () =>
      userAccessService.getEffectiveItemPermission(
        login as LoginInput,
        listRef as ListRef,
        itemId as number
      ),
    [login, listRef?.id, listRef?.title, itemId],
    enabled
  );

  const baseRefresh = resource.refresh;
  const refresh = React.useCallback((): void => {
    if (login && listRef && typeof itemId === 'number') {
      invalidatePrefix(level3Key(login, listRef, itemId));
    }
    baseRefresh();
  }, [login, listRef?.id, listRef?.title, itemId, baseRefresh]);

  return { ...resource, refresh };
}
