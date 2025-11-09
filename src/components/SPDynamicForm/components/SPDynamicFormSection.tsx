import * as React from 'react';
import { ISectionMetadata } from '../types/fieldMetadata';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Separator } from '@fluentui/react/lib/Separator';

export interface ISPDynamicFormSectionProps {
  section: ISectionMetadata;
  children: React.ReactNode;
  persistenceKey?: string;
  compact?: boolean;
  fieldSpacing?: number;
}

/**
 * Wraps form fields in a section with header
 */
export const SPDynamicFormSection: React.FC<ISPDynamicFormSectionProps> = React.memo((props) => {
  const { section, children, compact = false, fieldSpacing = 16 } = props;

  // Determine spacing based on compact mode
  const sectionSpacing = compact ? 8 : 16;

  return (
    <div className="spfx-form-section" style={{ marginBottom: compact ? 16 : 24 }}>
      <div className="spfx-form-section-header">
        <Text variant="xLarge" block styles={{ root: { fontWeight: 600, marginBottom: 4 } }}>
          {section.title}
        </Text>
        {section.description && (
          <Text variant="small" block styles={{ root: { color: '#605e5c', marginBottom: 8 } }}>
            {section.description}
          </Text>
        )}
      </div>
      <Separator styles={{ root: { marginBottom: sectionSpacing } }} />
      <div className="spfx-form-container">
        <Stack tokens={{ childrenGap: fieldSpacing }}>{children}</Stack>
      </div>
    </div>
  );
});

SPDynamicFormSection.displayName = 'SPDynamicFormSection';
