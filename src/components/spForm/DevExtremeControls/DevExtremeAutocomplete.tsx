import { Autocomplete } from 'devextreme-react/autocomplete';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';

export interface IDevExtremeAutocompleteProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  dataSource?: any[] | any;
  items?: any[];
  displayExpr?: string;
  valueExpr?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  minSearchLength?: number;
  searchTimeout?: number;
  showClearButton?: boolean;
  maxItemCount?: number;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: string) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeAutocomplete = <T extends FieldValues>({
  name,
  control,
  dataSource,
  items,
  displayExpr,
  valueExpr,
  placeholder,
  disabled = false,
  readOnly = false,
  minSearchLength = 0,
  searchTimeout = 500,
  showClearButton = true,
  maxItemCount = 10,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeAutocompleteProps<T>) => {
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
            <Autocomplete
              dataSource={dataSource}
              items={items}
              value={value || ''}
              onValueChanged={e => {
                if (value !== e.value) {
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
              minSearchLength={minSearchLength}
              searchTimeout={searchTimeout}
              showClearButton={showClearButton}
              maxItemCount={maxItemCount}
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

export default React.memo(DevExtremeAutocomplete) as typeof DevExtremeAutocomplete;
