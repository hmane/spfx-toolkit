import * as React from 'react';
import { useFormContext } from '../context';
import FormError from '../FormError/FormError';

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
  const shouldShowError =
    fieldName &&
    formContext &&
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
          {shouldShowError && fieldError && !errorElement && (
            <FormError error={fieldError} id={`${fieldName}-error`} />
          )}
          {errorElement}
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
          {shouldShowError && fieldError && !errorElement && (
            <FormError error={fieldError} id={`${fieldName}-error`} />
          )}
          {errorElement}
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
