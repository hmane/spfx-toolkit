/**
 * Hand-built recursive JSON tree viewer.
 *
 * Per spec ("Components" table) the panel uses Fluent UI for chrome but a
 * hand-built JSON tree because Fluent does not ship one and we want
 * per-path copy actions.
 *
 * See `docs/SPDebug-Requirements.md` "Search, Copy, and Export" copy-actions row.
 */

import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';

interface NodeProps {
  label: string;
  value: unknown;
  path: string;
  defaultExpanded?: boolean;
  onCopyPath: (path: string) => void;
  onCopyValue: (value: unknown) => void;
}

function valueLabel(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') {
    return String(v);
  }
  if (Array.isArray(v)) return 'Array(' + v.length + ')';
  return 'Object';
}

const JsonNode: React.FC<NodeProps> = (props) => {
  const { label, value, path, defaultExpanded, onCopyPath, onCopyValue } = props;
  const [expanded, setExpanded] = React.useState<boolean>(defaultExpanded === true);
  const isExpandable =
    value !== null && typeof value === 'object' && !(value instanceof Date);
  const handleCopyPath = React.useCallback(() => onCopyPath(path), [onCopyPath, path]);
  const handleCopyValue = React.useCallback(() => onCopyValue(value), [
    onCopyValue,
    value,
  ]);

  return (
    <div className="spdebug-json-node">
      <div className="spdebug-json-row">
        {isExpandable ? (
          <button
            type="button"
            className="spdebug-json-toggle"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="spdebug-json-toggle-placeholder" />
        )}
        <span className="spdebug-json-key">{label}</span>
        {!isExpandable && (
          <span className="spdebug-json-value">{valueLabel(value)}</span>
        )}
        {isExpandable && (
          <span className="spdebug-json-summary">{valueLabel(value)}</span>
        )}
        <span className="spdebug-json-actions">
          <IconButton
            iconProps={{ iconName: 'Link' }}
            title="Copy path"
            ariaLabel="Copy path"
            onClick={handleCopyPath}
            styles={{ root: { width: 24, height: 24, padding: 0 } }}
          />
          <IconButton
            iconProps={{ iconName: 'Copy' }}
            title="Copy value"
            ariaLabel="Copy value"
            onClick={handleCopyValue}
            styles={{ root: { width: 24, height: 24, padding: 0 } }}
          />
        </span>
      </div>
      {isExpandable && expanded && (
        <div className="spdebug-json-children">
          {Array.isArray(value)
            ? value.map((item, i) => (
                <JsonNode
                  key={i}
                  label={'[' + i + ']'}
                  value={item}
                  path={path + '[' + i + ']'}
                  onCopyPath={onCopyPath}
                  onCopyValue={onCopyValue}
                />
              ))
            : Object.keys(value as object).map((k) => (
                <JsonNode
                  key={k}
                  label={k}
                  value={(value as Record<string, unknown>)[k]}
                  path={path ? path + '.' + k : k}
                  onCopyPath={onCopyPath}
                  onCopyValue={onCopyValue}
                />
              ))}
        </div>
      )}
    </div>
  );
};

export interface DebugJsonViewerProps {
  value: unknown;
  rootLabel?: string;
  onCopyPath?: (path: string) => void;
  onCopyValue?: (value: unknown) => void;
}

export const DebugJsonViewer: React.FC<DebugJsonViewerProps> = ({
  value,
  rootLabel,
  onCopyPath,
  onCopyValue,
}) => {
  const handlePath = React.useCallback(
    (p: string) => {
      if (onCopyPath) onCopyPath(p);
    },
    [onCopyPath]
  );
  const handleValue = React.useCallback(
    (v: unknown) => {
      if (onCopyValue) onCopyValue(v);
    },
    [onCopyValue]
  );
  return (
    <div className="spdebug-json-viewer">
      <JsonNode
        label={rootLabel || 'value'}
        value={value}
        path=""
        defaultExpanded
        onCopyPath={handlePath}
        onCopyValue={handleValue}
      />
    </div>
  );
};
