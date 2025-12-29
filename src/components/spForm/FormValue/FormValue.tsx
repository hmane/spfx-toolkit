import * as React from 'react';
import { useCharCount } from '../hooks/useCharCount';
import { useFormContext } from '../context/FormContext';
import FormError from '../FormError/FormError';

export interface IFormValueProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Optional field name for automatic char count display.
   * If not provided, FormValue will try to extract from child components.
   */
  fieldName?: string;
}

/**
 * Extract field name from form control children (SP fields have a 'name' prop)
 */
function extractFieldName(children: React.ReactNode): string | undefined {
  const childrenArray = React.Children.toArray(children);
  for (const child of childrenArray) {
    if (React.isValidElement(child)) {
      const props = child.props as any;
      if (props?.name) {
        return props.name;
      }
    }
  }
  return undefined;
}

/**
 * ErrorCharCountRow - Internal component that handles the error/char count row
 * Only renders when there's actual content (errors or char count data)
 */
const ErrorCharCountRow: React.FC<{
  manualErrors: React.ReactNode[];
  autoError: string | undefined;
  manualCharCounts: React.ReactNode[];
  fieldName: string | undefined;
}> = ({ manualErrors, autoError, manualCharCounts, fieldName }) => {
  const { charCountData } = useCharCount(fieldName);

  const hasManualErrors = manualErrors.length > 0;
  const hasAutoError = !!autoError;
  const hasManualCharCount = manualCharCounts.length > 0;
  const hasAutoCharCount = !!charCountData;

  // Only render the row if there's actual content
  if (!hasManualErrors && !hasAutoError && !hasManualCharCount && !hasAutoCharCount) {
    return null;
  }

  // Determine char count status class
  let charCountStatusClass = '';
  if (charCountData?.max) {
    const ratio = charCountData.current / charCountData.max;
    const threshold = charCountData.warningThreshold ?? 0.9;
    if (ratio >= 1) {
      charCountStatusClass = 'error';
    } else if (ratio >= threshold) {
      charCountStatusClass = 'warning';
    }
  }

  return (
    <div className='spfx-form-value-error-charcount-row'>
      <div className='spfx-form-value-error-container'>
        {/* Manual FormError takes precedence over auto error */}
        {hasManualErrors ? manualErrors : (
          autoError && <FormError error={autoError} id={fieldName ? `${fieldName}-error` : undefined} />
        )}
      </div>
      <div className='spfx-form-value-charcount-container'>
        {/* Manual FormCharCount takes precedence over auto char count */}
        {hasManualCharCount ? manualCharCounts : (
          charCountData && (
            <span className={`spfx-form-char-count ${charCountStatusClass}`.trim()}>
              {charCountData.current}
              {charCountData.max !== undefined && ` / ${charCountData.max}`}
            </span>
          )
        )}
      </div>
    </div>
  );
};

const FormValue: React.FC<IFormValueProps> = ({ children, className = '', fieldName: fieldNameProp }) => {
  const formContext = useFormContext();
  const childrenArray = React.Children.toArray(children);

  const formControls: React.ReactNode[] = [];
  const descriptions: React.ReactNode[] = [];
  const errors: React.ReactNode[] = [];
  const charCounts: React.ReactNode[] = [];

  childrenArray.forEach(child => {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      const displayName = childType?.displayName || childType?.name || '';

      if (displayName === 'FormDescription') {
        descriptions.push(child);
      } else if (displayName === 'FormError') {
        errors.push(child);
      } else if (displayName === 'FormCharCount') {
        charCounts.push(child);
      } else {
        formControls.push(child);
      }
    } else {
      formControls.push(child);
    }
  });

  // Extract field name from child controls if not provided via prop
  const fieldName = fieldNameProp || extractFieldName(formControls);

  // Get field error from FormContext (auto-show errors when form is in error state)
  // Only show auto-error if no manual FormError children are provided
  let autoError: string | undefined;
  if (errors.length === 0 && fieldName && formContext?.autoShowErrors) {
    const isFormSubmitted = formContext.formState?.isSubmitted ?? false;
    const isFieldTouched = formContext.formState?.touchedFields?.[fieldName] ?? false;
    const isFieldDirty = formContext.formState?.dirtyFields?.[fieldName] ?? false;
    const fieldError = formContext.formState?.errors?.[fieldName] as { message?: string; type?: string } | undefined;
    const hasFieldError = !!fieldError;

    // Check if error was set manually (e.g., via setError with type: 'manual')
    // Manual errors should always be shown immediately
    const isManualError = fieldError?.type === 'manual';

    // Show error if:
    // 1. Form is submitted, OR
    // 2. Field was interacted with AND has error, OR
    // 3. Error was set manually (via setError)
    if (isFormSubmitted || ((isFieldTouched || isFieldDirty) && hasFieldError) || isManualError) {
      autoError = formContext.getFieldError(fieldName);
    }
  }

  return (
    <div className={`spfx-form-value ${className}`}>
      <div className='spfx-form-value-control-container'>{formControls}</div>
      {/* Descriptions appear first */}
      {descriptions.length > 0 && (
        <div className='spfx-form-value-description-container'>{descriptions}</div>
      )}
      {/* Error and char count row - only rendered when there's content */}
      <ErrorCharCountRow
        manualErrors={errors}
        autoError={autoError}
        manualCharCounts={charCounts}
        fieldName={fieldName}
      />
    </div>
  );
};

export default React.memo(FormValue);
