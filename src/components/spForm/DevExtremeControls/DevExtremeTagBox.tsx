import { isEqual } from '@microsoft/sp-lodash-subset';
import { TagBox } from 'devextreme-react/tag-box';
import * as React from 'react';
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';

export interface IDevExtremeTagBoxProps<T extends FieldValues> {
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
  showSelectionControls?: boolean;
  maxDisplayedTags?: number;
  hideSelectedItems?: boolean;
  acceptCustomValue?: boolean;
  stylingMode?: 'outlined' | 'underlined' | 'filled';
  className?: string;
  onValueChanged?: (value: any[]) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

const DevExtremeTagBox = <T extends FieldValues>({
  name,
  control,
  dataSource,
  items,
  displayExpr,
  valueExpr,
  placeholder,
  disabled = false,
  readOnly = false,
  searchEnabled = true,
  showClearButton = true,
  showSelectionControls = false,
  maxDisplayedTags,
  hideSelectedItems = false,
  acceptCustomValue = false,
  stylingMode = 'outlined',
  className = '',
  onValueChanged,
  onFocusIn,
  onFocusOut,
}: IDevExtremeTagBoxProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <TagBox
            dataSource={dataSource}
            items={items}
            value={value || []}
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
            showSelectionControls={showSelectionControls}
            maxDisplayedTags={maxDisplayedTags}
            hideSelectedItems={hideSelectedItems}
            acceptCustomValue={acceptCustomValue}
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

export default React.memo(DevExtremeTagBox) as typeof DevExtremeTagBox;
