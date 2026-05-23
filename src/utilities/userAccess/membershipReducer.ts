export interface IMembershipState {
  currentMembership: Set<number>;
  pendingMembership: Set<number>;
}

export type MembershipAction =
  | { type: 'toggle'; groupId: number }
  | { type: 'reset' }
  | { type: 'setCurrent'; current: ReadonlyArray<number> };

export function initMembershipState(
  current: ReadonlyArray<number>
): IMembershipState {
  const c = new Set(current);
  return { currentMembership: c, pendingMembership: new Set(c) };
}

export function membershipReducer(
  state: IMembershipState,
  action: MembershipAction
): IMembershipState {
  switch (action.type) {
    case 'toggle': {
      const next = new Set(state.pendingMembership);
      if (next.has(action.groupId)) next.delete(action.groupId);
      else next.add(action.groupId);
      return { ...state, pendingMembership: next };
    }
    case 'reset':
      return { ...state, pendingMembership: new Set(state.currentMembership) };
    case 'setCurrent': {
      const c = new Set(action.current);
      return { currentMembership: c, pendingMembership: new Set(c) };
    }
    default:
      return state;
  }
}

export function selectPendingAdds(s: IMembershipState): number[] {
  const out: number[] = [];
  for (const id of s.pendingMembership) {
    if (!s.currentMembership.has(id)) out.push(id);
  }
  return out;
}

export function selectPendingRemoves(s: IMembershipState): number[] {
  const out: number[] = [];
  for (const id of s.currentMembership) {
    if (!s.pendingMembership.has(id)) out.push(id);
  }
  return out;
}

export function selectIsDirty(s: IMembershipState): boolean {
  return (
    selectPendingAdds(s).length > 0 || selectPendingRemoves(s).length > 0
  );
}
