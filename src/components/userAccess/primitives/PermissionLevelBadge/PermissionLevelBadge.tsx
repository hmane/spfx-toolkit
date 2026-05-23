import * as React from 'react';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { IPermissionLevelBadgeProps } from './PermissionLevelBadge.types';
import './PermissionLevelBadge.css';

const LEVEL_CLASS: Record<string, string> = {
  Owner: 'spf-permbadge--owner',
  Member: 'spf-permbadge--member',
  Visitor: 'spf-permbadge--visitor',
  Custom: 'spf-permbadge--custom',
  None: 'spf-permbadge--none',
};

export const PermissionLevelBadge: React.FC<IPermissionLevelBadgeProps> = ({
  level,
  tooltip,
  className,
}) => {
  const badge = (
    <span
      className={`spf-permbadge ${LEVEL_CLASS[level] ?? ''} ${className ?? ''}`}
      role="status"
      aria-label={`Permission level: ${level}`}
    >
      {level}
    </span>
  );
  if (!tooltip) return badge;
  return <TooltipHost content={tooltip}>{badge}</TooltipHost>;
};
