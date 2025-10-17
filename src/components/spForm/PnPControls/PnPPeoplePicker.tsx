import { IPersonaProps } from '@fluentui/react/lib/Persona';
import { isEqual } from '@microsoft/sp-lodash-subset';
import { IPeoplePickerContext, PeoplePicker } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { DirectionalHint } from '../../../types/fluentui-types';

export interface IPnPPeoplePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: any;
  context: IPeoplePickerContext;
  placeholder?: string;
  titleText?: string;
  peoplePickerWPclassName?: string;
  peoplePickerCntrlclassName?: string;
  defaultSelectedUsers?: string[];
  personSelectionLimit?: number;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
  errorMessageClassName?: string;
  showtooltip?: boolean;
  tooltipMessage?: string;
  tooltipDirectional?: DirectionalHint;
  showHiddenInUI?: boolean;
  principalTypes?: any[];
  suggestionsLimit?: number;
  groupName?: string;
  webAbsoluteUrl?: string;
  ensureUser?: boolean;
  resolveDelay?: number;
  className?: string;
  onGetErrorMessage?: (value: IPersonaProps[]) => string | Promise<string>;
  onChange?: (items: IPersonaProps[]) => void;
}

const PnPPeoplePicker = <T extends FieldValues>({
  name,
  control,
  context,
  placeholder,
  titleText,
  peoplePickerWPclassName,
  peoplePickerCntrlclassName,
  defaultSelectedUsers,
  personSelectionLimit = 1,
  disabled = false,
  required = false,
  errorMessage,
  errorMessageClassName,
  showtooltip = false,
  tooltipMessage,
  tooltipDirectional,
  showHiddenInUI = false,
  principalTypes,
  suggestionsLimit = 5,
  groupName,
  webAbsoluteUrl,
  ensureUser = true,
  resolveDelay = 1000,
  className = '',
  onGetErrorMessage,
  onChange,
}: IPnPPeoplePickerProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange: fieldOnChange, value }, fieldState: { error } }) => {
        const hasError = !!error;

        return (
          <PeoplePicker
            context={context}
            titleText={titleText}
            personSelectionLimit={personSelectionLimit}
            groupName={groupName}
            showtooltip={showtooltip}
            required={required}
            disabled={disabled}
            onChange={items => {
              if (!isEqual(value, items)) {
                fieldOnChange(items);
                onChange?.(items);
              }
            }}
            defaultSelectedUsers={defaultSelectedUsers}
            showHiddenInUI={showHiddenInUI}
            principalTypes={principalTypes}
            resolveDelay={resolveDelay}
            ensureUser={ensureUser}
            suggestionsLimit={suggestionsLimit}
            webAbsoluteUrl={webAbsoluteUrl}
            placeholder={placeholder}
            errorMessage={hasError ? error.message : errorMessage}
            errorMessageClassName={errorMessageClassName}
            tooltipMessage={tooltipMessage}
            tooltipDirectional={tooltipDirectional}
            peoplePickerWPclassName={peoplePickerWPclassName}
            peoplePickerCntrlclassName={`${peoplePickerCntrlclassName} ${className} ${
              hasError ? 'error' : ''
            }`}
            onGetErrorMessage={onGetErrorMessage}
          />
        );
      }}
    />
  );
};

export default React.memo(PnPPeoplePicker) as typeof PnPPeoplePicker;
