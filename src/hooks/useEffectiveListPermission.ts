// src/hooks/useEffectiveListPermission.ts
import * as React from 'react';
import {
  invalidatePrefix,
  level2Key,
  userAccessService,
} from '../utilities/userAccess';
import type {
  IListPermission,
  ListRef,
  LoginInput,
} from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type UseEffectiveListPermissionResult = IAsyncResource<IListPermission>;

export function useEffectiveListPermission(
  login: LoginInput | null,
  listRef: ListRef | null
): UseEffectiveListPermissionResult {
  const enabled =
    login !== null &&
    login !== undefined &&
    listRef !== null &&
    listRef !== undefined &&
    (!!listRef.id || !!listRef.title);

  const resource = useAsyncResource<IListPermission>(
    () =>
      userAccessService.getEffectiveListPermission(
        login as LoginInput,
        listRef as ListRef
      ),
    [login, listRef?.id, listRef?.title],
    enabled
  );

  const baseRefresh = resource.refresh;
  const refresh = React.useCallback((): void => {
    if (login && listRef) invalidatePrefix(level2Key(login, listRef));
    baseRefresh();
  }, [login, listRef?.id, listRef?.title, baseRefresh]);

  return { ...resource, refresh };
}
