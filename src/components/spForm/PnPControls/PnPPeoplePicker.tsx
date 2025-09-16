import * as React from 'react';
import { PeoplePicker, IPeoplePickerContext } from '@pnp/spfx-controls-react/lib/PeoplePicker';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { IPersonaProps } from '@fluentui/react/lib/Persona';
import { DirectionalHint } from '@fluentui/react';

export interface IPnPPeoplePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
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
              fieldOnChange(items);
              if (onChange) {
                onChange(items);
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

export default PnPPeoplePicker;
