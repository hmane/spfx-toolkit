import { Autocomplete } from 'devextreme-react/autocomplete';
import * as React from 'react';
import { Controller, FieldError, FieldValues } from 'react-hook-form';

export interface IDevExtremeAutocompleteProps<T extends FieldValues> {
  name: string;
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
  return (
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
              onChange(e.value);
              if (onValueChanged) {
                onValueChanged(e.value);
              }
            }}
            onFocusIn={onFocusIn}
            onFocusOut={() => {
              onBlur();
              if (onFocusOut) {
                onFocusOut();
              }
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
  );
};

export default DevExtremeAutocomplete;
