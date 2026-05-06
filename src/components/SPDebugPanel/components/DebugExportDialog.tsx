/**
 * Review-before-export dialog.
 *
 * Honors `export.requireReview: 'always' | 'production' | 'never'` per spec.
 * The default is `'production'`. The dialog shows counts and a Markdown
 * preview, with actions: Cancel, Copy Markdown, Download `.md`.
 *
 * For `requireReview === 'never'` we still let the user open the dialog from
 * the toolbar (they clicked Export); we just skip the disclosure block.
 */

import * as React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
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
    `${json.traces.length} workflows`,
  ].join(' · ');
}

export const DebugExportDialog: React.FC<DebugExportDialogProps> = ({
  hidden,
  reviewRequired,
  onDismiss,
}) => {
  const [json, setJson] = React.useState<ExportedSession | null>(null);
  const [markdown, setMarkdown] = React.useState<string>('');

  React.useEffect(() => {
    if (hidden) return;
    setJson(SPDebug.export.json());
    setMarkdown(SPDebug.export.markdown());
  }, [hidden]);

  const handleCopy = async (): Promise<void> => {
    if (!markdown) return;
    await writeToClipboard(markdown);
  };
  const handleDownload = (): void => {
    if (!markdown) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadText('spdebug-' + ts + '.md', markdown, 'text/markdown');
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
          : 'Copy or download the current session.',
      }}
      maxWidth={720}
    >
      {json && (
        <Stack tokens={{ childrenGap: 8 }}>
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
        <DefaultButton iconProps={{ iconName: 'Copy' }} text="Copy Markdown" onClick={handleCopy} />
        <PrimaryButton iconProps={{ iconName: 'Download' }} text="Download .md" onClick={handleDownload} />
      </DialogFooter>
    </Dialog>
  );
};
