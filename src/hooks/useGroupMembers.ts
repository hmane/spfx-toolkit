// src/hooks/useGroupMembers.ts
import * as React from 'react';
import {
  groupMembersKey,
  invalidatePrefix,
  userAccessService,
} from '../utilities/userAccess';
import type { ISiteUser } from '../utilities/userAccess';
import { IAsyncResource, useAsyncResource } from './_useAsyncResource';

export type GroupRef = { id?: number; name?: string };
export type UseGroupMembersResult = IAsyncResource<ISiteUser[]>;

export function useGroupMembers(ref: GroupRef | null): UseGroupMembersResult {
  const enabled =
    ref !== null && ref !== undefined && (typeof ref.id === 'number' || !!ref.name);
  const resource = useAsyncResource<ISiteUser[]>(
    () => userAccessService.getGroupMembers(ref as GroupRef),
    [ref?.id, ref?.name],
    enabled
  );

  const baseRefresh = resource.refresh;
  const refresh = React.useCallback((): void => {
    if (ref) invalidatePrefix(groupMembersKey(ref));
    baseRefresh();
  }, [ref?.id, ref?.name, baseRefresh]);

  return { ...resource, refresh };
}
