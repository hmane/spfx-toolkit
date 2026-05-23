// tabs/CompareTab.tsx
import * as React from 'react';
import type { UserAccessError } from '../../../../utilities/userAccess';

export const CompareTab: React.FC<{ onError?: (e: UserAccessError) => void }> = () => (
  <div>Compare tab — implemented in Task 27</div>
);
