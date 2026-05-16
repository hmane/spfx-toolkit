import { isEqual } from '@microsoft/sp-lodash-subset';
import { RadioGroup } from 'devextreme-react/radio-group';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  DevExtremeInlineError,
  IDevExtremeValidationProps,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IRadioOption {
  text: string;
  value: any;
  disabled?: boolean;
}

export interface IDevExtremeRadioGroupProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: any;
  defaultValue?: any;
  items?: IRadioOption[];
  dataSource?: any[] | any;
  displayExpr?: string | ((item: any) => string);
  valueExpr?: string | ((item: any) => any);
  itemRender?: (itemData: any, itemIndex: number, itemElement: any) => React.ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
  hint?: string;
  // RadioGroup is not an input — DevExtreme exposes `elementAttr` (not `inputAttr`) for adding HTML attrs.
  elementAttr?: Record<string, any>;
  tabIndex?: number;
  accessKey?: string;
  onValueChanged?: (value: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeRadioGroup = <T extends FieldValues>({
  name,
  control,
  value,
  defaultValue,
  label,
  required = false,
  items,
  dataSource,
  displayExpr,
  valueExpr,
  itemRender,
  disabled = false,
  readOnly = false,
  layout = 'vertical',
  className = '',
  hint,
  elementAttr,
  tabIndex,
  accessKey,
  onValueChanged,
  onFocusIn,
  onFocusOut,
  isValid,
  errorMessage,
  errorText,
  showErrorMessage = true,
  validationMessageMode,
}: IDevExtremeRadioGroupProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<any>(value, defaultValue);

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name as string, {
        name: name as string,
        label,
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name as string);
      };
    }
  }, [name, label, required, formContext]);

  const renderRadioGroup = (
    fieldValue: any,
    fieldOnChange: (value: any) => void,
    fieldOnBlur?: () => void,
    fieldError?: any
  ) => {
    const validation = resolveDevExtremeValidationState({
      name: name as string,
      label,
      fieldError,
      isValid,
      errorMessage,
      errorText,
      showErrorMessage,
      validationMessageMode,
    });

    return (
      <div
        onFocusCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onFocusIn?.();
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            fieldOnBlur?.();
            onFocusOut?.();
          }
        }}
      >
        <RadioGroup
          value={fieldValue}
          onValueChanged={e => {
            if (!isEqual(fieldValue, e.value)) {
              fieldOnChange(e.value);
              onValueChanged?.(e.value);
            }
          }}
          items={items}
          dataSource={dataSource}
          displayExpr={displayExpr}
          valueExpr={valueExpr}
          itemRender={itemRender}
          disabled={disabled}
          readOnly={readOnly}
          layout={layout}
          hint={hint}
          elementAttr={elementAttr}
          tabIndex={tabIndex}
          accessKey={accessKey}
          className={`${className} ${validation.hasError ? 'dx-invalid' : ''}`}
          isValid={validation.isValid}
          validationError={validation.validationError}
          validationMessageMode={validation.validationMessageMode}
        />
        {validation.shouldRenderInlineError && (
          <DevExtremeInlineError name={name as string} error={validation.errorMessage} />
        )}
      </div>
    );
  };

  if (!effectiveControl) {
    return (
      <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
        {renderRadioGroup(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderRadioGroup(value, onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeRadioGroup) as typeof DevExtremeRadioGroup;
