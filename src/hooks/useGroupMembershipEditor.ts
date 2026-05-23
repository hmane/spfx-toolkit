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

  // Note: callers are responsible for disabling the trigger UI while `applying === true`.
  // A second concurrent apply() will run with stale `state` and the last-resolver wins lastResult.
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

      // Pre-flight: re-fetch fresh server membership (bypass cache) so we can
      // reconcile the UI session's intent with the live state.
      //
      // We bypass the cache rather than calling ua.refresh() to avoid triggering
      // the React-layer seed effect mid-apply (which would snap pendingMembership
      // back and lose the user's intent).
      let serverCurrent: Set<number>;
      try {
        const fresh = await userAccessService.getUserAccessLevel1(login, {
          bypassCache: true,
        });
        serverCurrent = new Set(fresh.siteGroups.map(g => g.id));
      } catch {
        // If the pre-flight fetch fails, fall back to the reducer's last-known
        // current membership rather than aborting the whole apply.
        serverCurrent = new Set(state.currentMembership);
      }

      // The UI session's intent is the DIFF between what the user saw when they
      // opened the dialog and what they toggled. We MUST NOT compute this from
      // (pendingMembership vs serverCurrent), because that would express
      // opinions about groups the user never saw — e.g., if another admin
      // concurrently added the user to group C, pending={A,B} vs serverCurrent
      // ={A,C} would yield a spurious remove of C.
      //
      // Correct: take the UI's diff (pending vs reducer's `current`), then
      // reconcile against `serverCurrent` for idempotency:
      //   - only add groups not already on the server
      //   - only remove groups still on the server
      const intendedAdds = selectPendingAdds(state);     // pending - current
      const intendedRemoves = selectPendingRemoves(state); // current - pending
      const adds = intendedAdds.filter(id => !serverCurrent.has(id));
      const removes = intendedRemoves.filter(id => serverCurrent.has(id));

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

      // Rebase reducer to actual server state after writes settle.
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
  }, [login, managePermission, state, ua.refresh]);

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
