import * as React from 'react';
import { ISectionMetadata } from '../types/fieldMetadata';
import { Card, Header, Content } from '../../Card';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';

export interface ISPDynamicFormSectionProps {
  section: ISectionMetadata;
  children: React.ReactNode;
  persistenceKey?: string;
  compact?: boolean;
  fieldSpacing?: number;
}

/**
 * Wraps form fields in a collapsible Card section
 */
export const SPDynamicFormSection: React.FC<ISPDynamicFormSectionProps> = React.memo((props) => {
  const { section, children, persistenceKey, compact = false, fieldSpacing = 16 } = props;

  const cardId = persistenceKey
    ? `${persistenceKey}_section_${section.name}`
    : `section_${section.name}`;

  // Determine padding based on compact mode
  const padding = compact ? 'compact' : 'comfortable';

  return (
    <Card
      id={cardId}
      defaultExpanded={section.defaultExpanded}
      allowExpand={section.collapsible}
      persist={!!persistenceKey}
      persistKey={persistenceKey}
      size="regular"
    >
      <Header>
        <Stack>
          <Text variant="mediumPlus" block styles={{ root: { fontWeight: 600 } }}>
            {section.title}
          </Text>
          {section.description && (
            <Text variant="small" block styles={{ root: { color: '#605e5c' } }}>
              {section.description}
            </Text>
          )}
        </Stack>
      </Header>
      <Content padding={padding}>
        <Stack tokens={{ childrenGap: fieldSpacing }}>{children}</Stack>
      </Content>
    </Card>
  );
});

SPDynamicFormSection.displayName = 'SPDynamicFormSection';
