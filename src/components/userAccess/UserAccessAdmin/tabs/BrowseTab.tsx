// tabs/BrowseTab.tsx
import * as React from 'react';
import type { UserAccessError } from '../../../../utilities/userAccess';

export const BrowseTab: React.FC<{ onError?: (e: UserAccessError) => void }> = () => (
  <div>Browse tab — implemented in Task 26</div>
);
