/**
 * Review-before-export dialog.
 *
 * Honors `export.requireReview: 'always' | 'production' | 'never'` per spec.
 * The default is `'production'`. The dialog shows counts and a Markdown
 * preview, with actions: Cancel, Copy Markdown, Download `.md`, Copy JSON,
 * Download `.json`. Copy/download failures surface in an inline MessageBar
 * rather than failing silently.
 *
 * For `requireReview === 'never'` we still let the user open the dialog from
 * the toolbar (they clicked Export); we just skip the disclosure block.
 */

import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { SPDebug } from '../../../utilities/debug';
import type { ExportedSession } from '../../../utilities/debug/exportSession';
import { writeToClipboard, downloadText } from '../clipboard';

export interface DebugExportDialogProps {
  hidden: boolean;
  reviewRequired: boolean;
  onDismiss: () => void;
}

function fmtCounts(json: ExportedSession): string {
  return [
    `${json.entries.length} entries`,
    `${json.evictionSummary.evictedCount} evicted`,
    `${json.snapshots.length} snapshots`,
    `${json.tables.length} tables`,
    `${json.metrics.length} metrics`,
    `${json.traces.length} workflows`,
  ].join(' · ');
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function timestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export const DebugExportDialog: React.FC<DebugExportDialogProps> = ({
  hidden,
  reviewRequired,
  onDismiss,
}) => {
  const [json, setJson] = React.useState<ExportedSession | null>(null);
  const [markdown, setMarkdown] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hidden) return;
    setJson(SPDebug.export.json());
    setMarkdown(SPDebug.export.markdown());
    setError(null);
  }, [hidden]);

  const copyFailMsg = 'Copy failed — your browser blocked clipboard access. Select the preview text and copy manually.';
  const downloadFailMsg = 'Download was blocked by the browser — use Copy instead.';

  const handleCopyMarkdown = async (): Promise<void> => {
    if (!markdown) return;
    const ok = await writeToClipboard(markdown);
    setError(ok ? null : copyFailMsg);
  };
  const handleDownloadMarkdown = (): void => {
    if (!markdown) return;
    const ok = downloadText('spdebug-' + timestampForFilename() + '.md', markdown, 'text/markdown');
    setError(ok ? null : downloadFailMsg);
  };
  const handleCopyJson = async (): Promise<void> => {
    if (!json) return;
    const ok = await writeToClipboard(safeStringify(json));
    setError(ok ? null : copyFailMsg);
  };
  const handleDownloadJson = (): void => {
    if (!json) return;
    const ok = downloadText('spdebug-' + timestampForFilename() + '.json', safeStringify(json), 'application/json');
    setError(ok ? null : downloadFailMsg);
  };

  return (
    <Dialog
      hidden={hidden}
      onDismiss={onDismiss}
      modalProps={{ isBlocking: true }}
      dialogContentProps={{
        type: DialogType.normal,
        title: reviewRequired ? 'Review before sharing' : 'Export debug session',
        subText: reviewRequired
          ? 'This export contains diagnostic data from the current debug session. Review the preview before sharing externally.'
          : 'Copy or download the current session as Markdown or JSON.',
      }}
      maxWidth={720}
    >
      {json && (
        <Stack tokens={{ childrenGap: 8 }}>
          {error && (
            <MessageBar
              messageBarType={MessageBarType.warning}
              onDismiss={() => setError(null)}
              dismissButtonAriaLabel="Dismiss error"
            >
              {error}
            </MessageBar>
          )}
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            {fmtCounts(json)}
          </Text>
          <pre
            className="spdebug-export-preview"
            style={{
              maxHeight: 320,
              overflow: 'auto',
              fontSize: 12,
              background: '#faf9f8',
              padding: 8,
              border: '1px solid #edebe9',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {markdown}
          </pre>
        </Stack>
      )}
      <DialogFooter>
        <DefaultButton text="Cancel" onClick={onDismiss} />
        <DefaultButton iconProps={{ iconName: 'Copy' }} text="Copy Markdown" onClick={handleCopyMarkdown} />
        <DefaultButton iconProps={{ iconName: 'Copy' }} text="Copy JSON" onClick={handleCopyJson} />
        <DefaultButton iconProps={{ iconName: 'Download' }} text="Download .md" onClick={handleDownloadMarkdown} />
        <PrimaryButton iconProps={{ iconName: 'Download' }} text="Download .json" onClick={handleDownloadJson} />
      </DialogFooter>
    </Dialog>
  );
};
