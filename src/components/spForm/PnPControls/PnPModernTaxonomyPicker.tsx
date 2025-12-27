import { BaseComponentContext } from '@microsoft/sp-component-base';
import { isEqual } from '@microsoft/sp-lodash-subset';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import * as React from 'react';

// Lazy load ModernTaxonomyPicker to avoid loading its CSS (TaxonomyTree.module.scss) when not used
const ModernTaxonomyPicker = React.lazy(() =>
  import('@pnp/spfx-controls-react/lib/ModernTaxonomyPicker').then((module) => ({
    default: module.ModernTaxonomyPicker,
  }))
);
import { Controller, FieldError, FieldValues, Path } from 'react-hook-form';

export interface IPnPModernTaxonomyPickerProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  context: BaseComponentContext;
  termSetId: string;
  anchorTermId?: string;
  label: string;
  panelTitle: string;
  placeHolder?: string;
  disabled?: boolean;
  allowMultipleSelections?: boolean;
  required?: boolean;
  customPanelWidth?: number;
  className?: string;
  onTermsChanged?: (terms: any[]) => void;
}

const PnPModernTaxonomyPicker = <T extends FieldValues>({
  name,
  control,
  context,
  termSetId,
  anchorTermId,
  label,
  panelTitle,
  placeHolder,
  disabled = false,
  allowMultipleSelections = false,
  required = false,
  customPanelWidth,
  className = '',
  onTermsChanged,
}: IPnPModernTaxonomyPickerProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <div
            className={`modern-taxonomy-picker-wrapper ${className} ${hasError ? 'has-error' : ''}`}
          >
            <React.Suspense fallback={<Spinner size={SpinnerSize.small} label="Loading taxonomy picker..." />}>
              <ModernTaxonomyPicker
                context={context}
                termSetId={termSetId}
                anchorTermId={anchorTermId}
                label={label}
                panelTitle={panelTitle}
                placeHolder={placeHolder}
                disabled={disabled}
                allowMultipleSelections={allowMultipleSelections}
                required={required}
                customPanelWidth={customPanelWidth}
                initialValues={value ? (Array.isArray(value) ? value : [value]) : []}
                onChange={terms => {
                  if (!isEqual(value, terms)) {
                    onChange(terms);
                    onTermsChanged?.(terms || []);
                  }
                }}
              />
            </React.Suspense>
            {hasError && (
              <div className='field-error-message'>{(error as FieldError)?.message}</div>
            )}
          </div>
        );
      }}
    />
  );
};

export default React.memo(PnPModernTaxonomyPicker) as typeof PnPModernTaxonomyPicker;
