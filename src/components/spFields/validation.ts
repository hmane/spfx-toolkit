import { RegisterOptions } from 'react-hook-form';

type ValidateResult = boolean | string | undefined;
type ValidateFn = (value: any) => ValidateResult | Promise<ValidateResult>;

export function addValidateRule(
  rules: RegisterOptions,
  name: string,
  validator: ValidateFn
): void {
  const existingValidate = rules.validate as any;

  if (!existingValidate) {
    rules.validate = { [name]: validator };
    return;
  }

  if (typeof existingValidate === 'function') {
    rules.validate = {
      existing: existingValidate,
      [name]: validator,
    };
    return;
  }

  rules.validate = {
    ...existingValidate,
    [name]: validator,
  };
}

export function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== '';
}
