/**
 * FormErrorSummary - Displays all form errors in a summary panel
 * Provides click-to-scroll functionality to error fields
 */

import * as React from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { useFormContext } from '../context';

export interface IFormErrorSummaryProps {
  /**
   * Position of error summary
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'sticky';

  /**
   * Maximum number of errors to display
   * @optional
   */
  maxErrors?: number;

  /**
   * Show field labels/names before error message
   * @default false
   */
  showFieldLabels?: boolean;

  /**
   * Enable click-to-scroll functionality
   * @default true
   */
  clickToScroll?: boolean;

  /**
   * Compact mode with less spacing
   * @default false
   */
  compact?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Callback when error item is clicked
   */
  onErrorClick?: (fieldName: string) => void;
}

const FormErrorSummary: React.FC<IFormErrorSummaryProps> = ({
  position = 'top',
  maxErrors,
  showFieldLabels = false,
  clickToScroll = true,
  compact = false,
  className = '',
  onErrorClick,
}) => {
  const formContext = useFormContext();
  const [hoveredError, setHoveredError] = React.useState<string | null>(null);

  if (!formContext?.formState?.errors) {
    return null;
  }

  const errors = Object.entries(formContext.formState.errors);

  if (errors.length === 0) {
    return null;
  }

  // Filter out errors without messages
  const errorsWithMessages = errors.filter(([_, error]) => {
    const errorMessage = (error as any)?.message;
    return errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '';
  });

  if (errorsWithMessages.length === 0) {
    return null;
  }

  const displayErrors = maxErrors ? errorsWithMessages.slice(0, maxErrors) : errorsWithMessages;
  const hasMoreErrors = maxErrors && errorsWithMessages.length > maxErrors;

  const handleErrorClick = (fieldName: string) => {
    if (clickToScroll) {
      formContext.scrollToField(fieldName, { behavior: 'smooth', block: 'center' });

      // Focus after a delay to allow scroll to complete
      setTimeout(() => {
        formContext.focusField(fieldName);
      }, 300);
    }

    onErrorClick?.(fieldName);
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleErrorClick(fieldName);
    }
  };

  const positionClass = position === 'sticky' ? 'spfx-form-error-summary-sticky' : '';
  const compactClass = compact ? 'spfx-form-error-summary-compact' : '';

  // Spacing based on compact mode
  const containerGap = compact ? 4 : 12;
  const itemGap = compact ? 0 : 4;
  const itemPadding = compact ? '2px 0' : '4px 0';

  return (
    <MessageBar
      messageBarType={MessageBarType.error}
      isMultiline
      className={`spfx-form-error-summary ${positionClass} ${compactClass} ${className}`}
      role='alert'
      aria-live='assertive'
    >
      <Stack tokens={{ childrenGap: containerGap }}>
        {!compact && (
          <Text styles={{ root: { fontWeight: 600 } }}>
            Please fix the following {errorsWithMessages.length} error{errorsWithMessages.length > 1 ? 's' : ''}:
          </Text>
        )}

        <Stack tokens={{ childrenGap: itemGap }}>
          {displayErrors.map(([fieldName, error], index) => {
            const field = formContext.registry.get(fieldName);
            const label = showFieldLabels && field?.label ? field.label : null;
            const errorMessage = (error as any)?.message as string | undefined;
            const isHovered = hoveredError === fieldName;

            return (
              <div
                key={fieldName}
                className='spfx-form-error-summary-item'
                onClick={() => handleErrorClick(fieldName)}
                onKeyDown={(e) => handleKeyDown(e, fieldName)}
                onMouseEnter={() => setHoveredError(fieldName)}
                onMouseLeave={() => setHoveredError(null)}
                role='button'
                tabIndex={0}
                style={{
                  cursor: clickToScroll ? 'pointer' : 'default',
                  padding: itemPadding,
                  transition: 'all 0.15s ease',
                  borderRadius: '2px',
                  marginLeft: '-4px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  backgroundColor: isHovered ? 'rgba(209, 52, 56, 0.05)' : 'transparent',
                }}
              >
                <Stack horizontal tokens={{ childrenGap: compact ? 6 : 8 }} verticalAlign='center'>
                  <Icon
                    iconName='ErrorBadge'
                    style={{
                      color: '#d13438',
                      fontSize: compact ? '12px' : '14px',
                      flexShrink: 0,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: compact ? '12px' : '14px',
                      lineHeight: compact ? '16px' : '20px',
                      textDecoration: isHovered && clickToScroll ? 'underline dotted' : 'none',
                      textUnderlineOffset: '2px',
                    }}
                  >
                    {label && <strong>{label}: </strong>}
                    {errorMessage}
                  </Text>
                  {clickToScroll && !compact && (
                    <Icon
                      iconName='NavigateForward'
                      style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        color: '#605e5c',
                        opacity: isHovered ? 1 : 0.5,
                        transition: 'opacity 0.15s ease',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Stack>
              </div>
            );
          })}

          {hasMoreErrors && (
            <Text
              variant='small'
              styles={{
                root: {
                  marginTop: compact ? 4 : 8,
                  fontStyle: 'italic',
                  fontSize: compact ? '11px' : '12px',
                  color: '#605e5c',
                }
              }}
            >
              ...and {errorsWithMessages.length - maxErrors!} more error
              {errorsWithMessages.length - maxErrors! > 1 ? 's' : ''}
            </Text>
          )}
        </Stack>
      </Stack>
    </MessageBar>
  );
};

export default React.memo(FormErrorSummary);
