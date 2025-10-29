import { isEqual } from '@microsoft/sp-lodash-subset';
import { SelectBox } from 'devextreme-react/select-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

export interface IDevExtremeSelectBoxProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  dataSource?: any[] | any;
  items?: any[];
  displayExpr?: string;
  valueExpr?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  searchEnabled?: boolean;
  showClearButton?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeSelectBox = <T extends FieldValues>({
  name,
  control,
  dataSource,
  items,
  displayExpr,
  valueExpr,
  placeholder,
  disabled = false,
  readOnly = false,
  searchEnabled = false,
  showClearButton = true,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeSelectBoxProps<T>) => {
  const formContext = useFormContext();
  const fieldRef = React.useRef<HTMLDivElement>(null);

  // Register field with FormContext for scroll-to-error functionality
  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name as string, {
        name: name as string,
        label: undefined, // spForm controls don't have labels
        required: false,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name as string);
      };
    }
  }, [name, formContext]);

  return (
    <div ref={fieldRef}>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
          const hasError = !!error;

          return (
            <SelectBox
              dataSource={dataSource}
              items={items}
              value={value}
              onValueChanged={e => {
                if (!isEqual(value, e.value)) {
                  onChange(e.value);
                  onValueChanged?.(e.value);
                }
              }}
              onFocusIn={onFocusIn}
              onFocusOut={() => {
                onBlur();
                onFocusOut?.();
              }}
              displayExpr={displayExpr}
              valueExpr={valueExpr}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              searchEnabled={searchEnabled}
              showClearButton={showClearButton}
              stylingMode={stylingMode}
              className={`${className} ${hasError ? 'dx-invalid' : ''}`}
              isValid={!hasError}
              validationError={error as FieldError}
            />
          );
        }}
      />
    </div>
  );
};

export default React.memo(DevExtremeSelectBox) as typeof DevExtremeSelectBox;
