import * as React from 'react';
import { IFieldExtension, IFieldExtensionProps } from '../SPDynamicForm.types';

interface IProps {
  extension: IFieldExtension;
  state: IFieldExtensionProps;
}

export const SPDynamicFormFieldExtension: React.FC<IProps> = ({ extension, state }) => {
  const cls = `spfx-df-field-extension is-${extension.position || 'after'}`;
  return <div className={cls}>{extension.render(state)}</div>;
};

SPDynamicFormFieldExtension.displayName = 'SPDynamicFormFieldExtension';
