// src/hooks/useGroupMembershipEditor.ts
import * as React from 'react';
import { PermissionKind } from '@pnp/sp/security';
import '@pnp/sp/security';
import '@pnp/sp/webs';

import { SPContext } from '../utilities/context';
import {
  emptyBulkResult,
  fromItems,
  initMembershipState,
  membershipReducer,
  selectIsDirty,
  selectPendingAdds,
  selectPendingRemoves,
  userAccessService,
} from '../utilities/userAccess';
import type {
  IBulkResult,
  ISiteGroup,
  LoginInput,
} from '../utilities/userAccess';
import { useUserAccess } from './useUserAccess';
import { useSiteGroups } from './useSiteGroups';
import { toUserAccessError } from './_useAsyncResource';
import type { UserAccessError } from '../utilities/userAccess';

export interface UseGroupMembershipEditorResult {
  allGroups: ISiteGroup[];
  currentMembership: ReadonlySet<number>;
  pendingMembership: ReadonlySet<number>;
  pendingAdds: number[];
  pendingRemoves: number[];
  isDirty: boolean;
  toggle: (groupId: number) => void;
  reset: () => void;
  apply: () => Promise<IBulkResult>;
  applying: boolean;
  lastResult: IBulkResult | null;
  loading: boolean;
  error: UserAccessError | null;
}

export function useGroupMembershipEditor(
  login: LoginInput | null,
  managePermission: PermissionKind = PermissionKind.ManageWeb
): UseGroupMembershipEditorResult {
  const sg = useSiteGroups();
  const ua = useUserAccess(login);

  const [state, dispatch] = React.useReducer(
    membershipReducer,
    initMembershipState([])
  );
  const [applying, setApplying] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<IBulkResult | null>(null);
  const [error, setError] = React.useState<UserAccessError | null>(null);

  // Seed reducer when ua data lands.
  React.useEffect(() => {
    if (!ua.data) return;
    dispatch({
      type: 'setCurrent',
      current: ua.data.siteGroups.map(g => g.id),
    });
  }, [ua.data]);

  const allGroups = sg.data ?? [];

  const apply = React.useCallback(async (): Promise<IBulkResult> => {
    if (!login) {
      const empty = emptyBulkResult();
      setLastResult(empty);
      return empty;
    }
    setApplying(true);
    setError(null);
    try {
      // 1. Re-check manage permission at apply time (gate re-check)
      const allowed: boolean = await SPContext.sp.web.currentUserHasPermissions(
        managePermission
      );
      if (!allowed) {
        const pendingAdds = selectPendingAdds(state);
        const pendingRemoves = selectPendingRemoves(state);
        const allIds = [...pendingAdds, ...pendingRemoves];
        const result = fromItems(
          allIds.map(groupId => ({
            groupId,
            success: false,
            error: 'ACCESS_DENIED',
          }))
        );
        setLastResult(result);
        return result;
      }

      // 2. Trigger refresh of current membership (cache invalidation happens here;
      //    the next render after apply will see fresh data).
      ua.refresh();

      const adds = selectPendingAdds(state);
      const removes = selectPendingRemoves(state);

      const [addResult, removeResult] = await Promise.all([
        adds.length > 0
          ? userAccessService.addUserToGroups(login, adds)
          : Promise.resolve(emptyBulkResult()),
        removes.length > 0
          ? userAccessService.removeUserFromGroups(login, removes)
          : Promise.resolve(emptyBulkResult()),
      ]);

      // Merge results
      const merged: IBulkResult = {
        succeeded: [...addResult.succeeded, ...removeResult.succeeded],
        failed: [...addResult.failed, ...removeResult.failed],
        items: [...addResult.items, ...removeResult.items],
      };

      // Rebase reducer to actual server state after success
      ua.refresh();
      setLastResult(merged);
      return merged;
    } catch (err) {
      const uae = toUserAccessError(err);
      setError(uae);
      const empty = emptyBulkResult();
      setLastResult(empty);
      return empty;
    } finally {
      setApplying(false);
    }
  }, [login, managePermission, state, ua]);

  return {
    allGroups,
    currentMembership: state.currentMembership,
    pendingMembership: state.pendingMembership,
    pendingAdds: selectPendingAdds(state),
    pendingRemoves: selectPendingRemoves(state),
    isDirty: selectIsDirty(state),
    toggle: (groupId: number) => dispatch({ type: 'toggle', groupId }),
    reset: () => dispatch({ type: 'reset' }),
    apply,
    applying,
    lastResult,
    loading: sg.loading || ua.loading,
    error: error ?? sg.error ?? ua.error,
  };
}
