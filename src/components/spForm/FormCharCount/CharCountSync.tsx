import * as React from 'react';
import { ICharCountRegistry } from '../context/FormContext.types';

export interface ICharCountSyncProps {
  name?: string;
  value: string;
  maxLength?: number;
  enabled: boolean;
  registry?: ICharCountRegistry;
}

// Keeps FormContext's character-count registry in sync from inside editor
// render paths where the latest field value is already available.
export function CharCountSync(props: ICharCountSyncProps): null {
  const { name, value, maxLength, enabled, registry } = props;
  const currentCharCount = (value || '').length;

  React.useEffect(() => {
    if (!registry || !name || !enabled) return;

    registry.set(name, {
      current: currentCharCount,
      max: maxLength,
      warningThreshold: 0.9,
    });
  }, [registry, name, enabled, currentCharCount, maxLength]);

  React.useEffect(() => {
    return () => {
      if (registry && name) {
        registry.remove(name);
      }
    };
  }, [registry, name]);

  React.useEffect(() => {
    if (!enabled && registry && name) {
      registry.remove(name);
    }
  }, [registry, name, enabled]);

  return null;
}
