/**
 * Launcher pill rendered when capture is enabled but the panel is closed.
 *
 * Per spec, the launcher should appear when debug mode is enabled and the
 * panel is closed. Clicking opens the panel.
 */

import * as React from 'react';
import { DefaultButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';

export interface DebugLauncherProps {
  entryCount: number;
  onOpen: () => void;
}

export const DebugLauncher: React.FC<DebugLauncherProps> = ({ entryCount, onOpen }) => {
  return (
    <div className="spdebug-launcher" role="region" aria-label="SPDebug launcher">
      <DefaultButton
        onClick={onOpen}
        aria-label={'Open SPDebug panel — ' + entryCount + ' entries'}
        title={'Open SPDebug panel — ' + entryCount + ' entries'}
        styles={{
          root: {
            borderRadius: 999,
            minHeight: 32,
            paddingLeft: 12,
            paddingRight: 12,
          },
        }}
      >
        <Icon iconName="Bug" aria-hidden="true" styles={{ root: { marginRight: 8 } }} />
        Debug · {entryCount}
      </DefaultButton>
    </div>
  );
};
