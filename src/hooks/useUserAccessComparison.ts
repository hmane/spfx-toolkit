// src/hooks/useUserAccessComparison.ts
import * as React from 'react';
import { diffUserAccess } from '../utilities/userAccess';
import type {
  IAccessDiff,
  LoginInput,
} from '../utilities/userAccess';
import { useUserAccess } from './useUserAccess';

export interface UseUserAccessComparisonResult {
  diff: IAccessDiff | null;
  loading: boolean;
  error: ReturnType<typeof useUserAccess>['error'];
  refresh: () => void;
  userA: ReturnType<typeof useUserAccess>;
  userB: ReturnType<typeof useUserAccess>;
}

export function useUserAccessComparison(
  loginA: LoginInput | null,
  loginB: LoginInput | null
): UseUserAccessComparisonResult {
  const userA = useUserAccess(loginA);
  const userB = useUserAccess(loginB);

  const diff = React.useMemo<IAccessDiff | null>(() => {
    if (!userA.data || !userB.data) return null;
    return diffUserAccess(userA.data, userB.data);
  }, [userA.data, userB.data]);

  const refresh = React.useCallback((): void => {
    userA.refresh();
    userB.refresh();
  }, [userA.refresh, userB.refresh]);

  return {
    diff,
    loading: userA.loading || userB.loading,
    error: userA.error ?? userB.error,
    refresh,
    userA,
    userB,
  };
}
