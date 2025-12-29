import * as React from 'react';
import { useFormContext } from '../context';
import FormError from '../FormError/FormError';
import { useCharCount } from '../hooks/useCharCount';

export interface IFormItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  labelWidth?: string;
  labelPosition?: 'left' | 'top';

  /**
   * Field name - used for error display and field registration
   * @optional
   */
  fieldName?: string;

  /**
   * Auto-show error for this field
   * Overrides FormContainer.autoShowErrors
   * @optional
   */
  autoShowError?: boolean;

  /**
   * Section/group name for field organization
   * @optional
   */
  section?: string;

  /**
   * Field ID - auto-generated from fieldName if not provided
   * @optional
   */
  fieldId?: string;
}

/**
 * ErrorCharCountRow - Internal component that handles the error/char count row
 * Only renders when there's actual content (errors or char count data)
 */
const ErrorCharCountRow: React.FC<{
  fieldName: string | undefined;
  fieldError: string | undefined;
}> = ({ fieldName, fieldError }) => {
  const { charCountData } = useCharCount(fieldName);

  const hasError = !!fieldError;
  const hasCharCount = !!charCountData;

  // Only render the row if there's actual content
  if (!hasError && !hasCharCount) {
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
        {hasError && (
          <FormError error={fieldError} id={fieldName ? `${fieldName}-error` : undefined} />
        )}
      </div>
      <div className='spfx-form-value-charcount-container'>
        {charCountData && (
          <span className={`spfx-form-char-count ${charCountStatusClass}`.trim()}>
            {charCountData.current}
            {charCountData.max !== undefined && ` / ${charCountData.max}`}
          </span>
        )}
      </div>
    </div>
  );
};

const FormItem: React.FC<IFormItemProps> = ({
  children,
  className = '',
  style,
  labelWidth,
  labelPosition = 'left',
  fieldName,
  autoShowError,
  section,
  fieldId,
}) => {
  const formContext = useFormContext();
  const fieldRef = React.useRef<HTMLDivElement>(null);

  // Generate field ID
  const generatedFieldId = React.useMemo(() => {
    return fieldId || (fieldName ? `field-${fieldName}` : undefined);
  }, [fieldId, fieldName]);

  // Register field with FormContext
  React.useEffect(() => {
    if (fieldName && formContext) {
      // Extract label text from children
      const labelText = extractLabelText(children);

      formContext.registry.register(fieldName, {
        name: fieldName,
        label: labelText,
        required: checkIfRequired(children),
        ref: fieldRef,
        section,
      });

      return () => {
        formContext.registry.unregister(fieldName);
      };
    }
  }, [fieldName, formContext, section, children]);

  // Determine if should show error
  // Show errors for this field when:
  // 1. Form has been submitted (show all errors), OR
  // 2. This specific field has been touched AND has an error (revalidate on change), OR
  // 3. Error was set manually (via setError with type: 'manual')
  const isFormSubmitted = formContext?.formState?.isSubmitted ?? false;
  const isFieldTouched = fieldName ? formContext?.formState?.touchedFields?.[fieldName] : false;
  const isFieldDirty = fieldName ? formContext?.formState?.dirtyFields?.[fieldName] : false;
  const fieldErrorObj = fieldName ? formContext?.formState?.errors?.[fieldName] as { message?: string; type?: string } | undefined : undefined;
  const hasFieldError = !!fieldErrorObj;
  // Manual errors (set via setError with type: 'manual') should always be shown
  const isManualError = fieldErrorObj?.type === 'manual';

  // Only show error if form submitted OR field interacted with and has error OR error is manual
  const shouldShowError =
    fieldName &&
    formContext &&
    (isFormSubmitted || ((isFieldTouched || isFieldDirty) && hasFieldError) || isManualError) &&
    (autoShowError !== undefined ? autoShowError : formContext.autoShowErrors);

  const fieldError = shouldShowError ? formContext.getFieldError(fieldName) : undefined;
  const hasError = !!fieldError;

  const childrenArray = React.Children.toArray(children);

  let label: React.ReactNode = null;
  let value: React.ReactNode = null;
  let errorElement: React.ReactNode = null;

  childrenArray.forEach((child) => {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      const isLabel =
        childType?.name === 'FormLabel' || childType?.displayName === 'FormLabel';
      const isValue =
        childType?.name === 'FormValue' || childType?.displayName === 'FormValue';
      const isError =
        childType?.name === 'FormError' || childType?.displayName === 'FormError';

      if (isLabel) {
        // Enhance label with htmlFor
        label = generatedFieldId
          ? React.cloneElement(child, { htmlFor: generatedFieldId } as any)
          : child;
      } else if (isValue) {
        value = child;
      } else if (isError) {
        errorElement = child;
      } else if (!label) {
        label = child;
      } else if (!value) {
        value = child;
      }
    }
  });

  const itemStyle: React.CSSProperties = {
    ...style,
    ...(labelWidth && ({ '--custom-label-width': labelWidth } as any)),
  };

  const itemClassName = `spfx-form-item ${
    labelWidth ? 'spfx-form-item-custom-label-width' : ''
  } ${labelPosition === 'top' ? 'spfx-form-item-label-top' : ''} ${
    !label ? 'spfx-form-item-no-label' : ''
  } ${hasError ? 'spfx-form-item-has-error' : ''} ${className}`;

  // Render the error and char count row
  // NOTE: If FormValue is present, it will handle its own error/char count row,
  // so FormItem only needs to render the row when there's no FormValue
  const renderErrorCharCountRow = (): React.ReactNode => {
    // If there's a custom error element, just render that
    if (errorElement) {
      return errorElement;
    }

    // If there's a FormValue child, don't render anything here
    // FormValue now handles both error and char count display via its own ErrorCharCountRow
    if (value) {
      return null;
    }

    return (
      <ErrorCharCountRow
        fieldName={fieldName}
        fieldError={shouldShowError ? fieldError : undefined}
      />
    );
  };

  if (!label) {
    return (
      <div
        ref={fieldRef}
        className={itemClassName}
        style={itemStyle}
        data-field-name={fieldName}
      >
        <div className="spfx-form-item-value-area">
          {value}
          {renderErrorCharCountRow()}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={fieldRef}
      className={itemClassName}
      style={itemStyle}
      data-field-name={fieldName}
    >
      {label && <div className="spfx-form-item-label-area">{label}</div>}
      {value && (
        <div className="spfx-form-item-value-area">
          {value}
          {renderErrorCharCountRow()}
        </div>
      )}
    </div>
  );
};

/**
 * Extract label text from children
 */
function extractLabelText(children: React.ReactNode): string | undefined {
  const childrenArray = React.Children.toArray(children);
  for (const child of childrenArray) {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      const isLabel =
        childType?.name === 'FormLabel' || childType?.displayName === 'FormLabel';
      if (isLabel && typeof child.props.children === 'string') {
        return child.props.children;
      }
    }
  }
  return undefined;
}

/**
 * Check if any child has required indicator
 */
function checkIfRequired(children: React.ReactNode): boolean {
  const childrenArray = React.Children.toArray(children);
  for (const child of childrenArray) {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      const isLabel =
        childType?.name === 'FormLabel' || childType?.displayName === 'FormLabel';
      if (isLabel && child.props.isRequired) {
        return true;
      }
    }
  }
  return false;
}

export default React.memo(FormItem);
