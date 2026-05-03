import * as React from 'react';
import { ISectionMetadata } from '../types/fieldMetadata';
import { Stack } from '@fluentui/react/lib/Stack';

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

  return (
    <section className="sp-dynamic-form-section" style={{ marginBottom: compact ? 16 : 24 }}>
      <div className="sp-dynamic-form-section-header">
        <div className="sp-dynamic-form-section-title">{section.title}</div>
        {section.description && (
          <div className="sp-dynamic-form-section-description">{section.description}</div>
        )}
      </div>
      <div className="spfx-form-container">
        <Stack tokens={{ childrenGap: fieldSpacing }}>{children}</Stack>
      </div>
    </section>
  );
});

SPDynamicFormSection.displayName = 'SPDynamicFormSection';
