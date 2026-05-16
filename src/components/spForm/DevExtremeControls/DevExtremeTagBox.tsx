import { isEqual } from '@microsoft/sp-lodash-subset';
import { TagBox } from 'devextreme-react/tag-box';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  DevExtremeInlineError,
  IDevExtremeValidationProps,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export interface IDevExtremeTagBoxProps<T extends FieldValues> extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  value?: any[];
  defaultValue?: any[];
  dataSource?: any[] | any;
  items?: any[];
  displayExpr?: string;
  valueExpr?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  searchEnabled?: boolean;
  searchExpr?: string | string[];
  searchMode?: 'contains' | 'startswith';
  searchTimeout?: number;
  minSearchLength?: number;
  showClearButton?: boolean;
  showSelectionControls?: boolean;
  maxDisplayedTags?: number;
  hideSelectedItems?: boolean;
  acceptCustomValue?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  hint?: string;
  inputAttr?: Record<string, any>;
  tabIndex?: number;
  itemRender?: (itemData: any, itemIndex: number, itemElement: any) => React.ReactNode;
  // Custom render for the inline editor when nothing is selected (DevExtreme `fieldRender`).
  fieldRender?: (itemData: any, fieldElement: any) => React.ReactNode;
  // Custom render for each selected tag chip (DevExtreme `tagRender`).
  tagRender?: (itemData: any, tagElement: any) => React.ReactNode;
  onValueChanged?: (value: any[]) => void;
  onEnterKey?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeTagBox = <T extends FieldValues>({
  name,
  control,
  value,
  defaultValue = [],
  label,
  required = false,
  dataSource,
  items,
  displayExpr,
  valueExpr,
  placeholder,
  disabled = false,
  readOnly = false,
  searchEnabled = true,
  searchExpr,
  searchMode,
  searchTimeout,
  minSearchLength,
  showClearButton = true,
  showSelectionControls = false,
  maxDisplayedTags,
  hideSelectedItems = false,
  acceptCustomValue = false,
  stylingMode = 'outlined',
  className = '',
  hint,
  inputAttr,
  tabIndex,
  itemRender,
  fieldRender,
  tagRender,
  onValueChanged,
  onEnterKey,
  onKeyDown,
  onFocusIn,
  onFocusOut,
  isValid,
  errorMessage,
  errorText,
  showErrorMessage = true,
  validationMessageMode,
}: IDevExtremeTagBoxProps<T>) => {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<any[]>(value, defaultValue);

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

  const renderTagBox = (
    fieldValue: any[],
    fieldOnChange: (value: any[]) => void,
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

    // DevExtreme validates several string-union options on mount; passing
    // `undefined` explicitly bypasses the component's own default-handling
    // and crashes its internal validators (e.g. `_validateSearchMode` calls
    // `.toLowerCase()` on the option). Spread only when the caller set a value.
    const searchTuningProps: Record<string, unknown> = {};
    if (searchExpr !== undefined) searchTuningProps.searchExpr = searchExpr;
    if (searchMode !== undefined) searchTuningProps.searchMode = searchMode;
    if (searchTimeout !== undefined) searchTuningProps.searchTimeout = searchTimeout;
    if (minSearchLength !== undefined) searchTuningProps.minSearchLength = minSearchLength;

    return (
      <>
        <TagBox
          dataSource={dataSource}
          items={items}
          value={fieldValue || []}
          onValueChanged={e => {
            if (!isEqual(fieldValue, e.value)) {
              fieldOnChange(e.value);
              onValueChanged?.(e.value);
            }
          }}
          onFocusIn={onFocusIn}
          onFocusOut={() => {
            fieldOnBlur?.();
            onFocusOut?.();
          }}
          displayExpr={displayExpr}
          valueExpr={valueExpr}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          searchEnabled={searchEnabled}
          {...searchTuningProps}
          showClearButton={showClearButton}
          showSelectionControls={showSelectionControls}
          maxDisplayedTags={maxDisplayedTags}
          hideSelectedItems={hideSelectedItems}
          acceptCustomValue={acceptCustomValue}
          stylingMode={stylingMode}
          hint={hint}
          inputAttr={inputAttr}
          tabIndex={tabIndex}
          itemRender={itemRender}
          fieldRender={fieldRender as any}
          tagRender={tagRender as any}
          onEnterKey={onEnterKey}
          onKeyDown={onKeyDown}
          className={`${className} ${validation.hasError ? 'dx-invalid' : ''}`}
          isValid={validation.isValid}
          validationError={validation.validationError}
          validationMessageMode={validation.validationMessageMode}
        />
        {validation.shouldRenderInlineError && (
          <DevExtremeInlineError name={name as string} error={validation.errorMessage} />
        )}
      </>
    );
  };

  if (!effectiveControl) {
    return (
      <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
        {renderTagBox(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          return renderTagBox(value || [], onChange, onBlur, error);
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeTagBox) as typeof DevExtremeTagBox;
