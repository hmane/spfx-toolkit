import * as React from 'react';

export interface IFormCharCountProps {
  /**
   * Current character count
   */
  current: number;

  /**
   * Maximum allowed characters (optional - if not provided, just shows current count)
   */
  max?: number;

  /**
   * Warning threshold percentage (0-1). Default is 0.9 (90%)
   * When current/max >= this threshold, warning style is applied
   */
  warningThreshold?: number;

  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * FormCharCount - Displays character count for form fields
 *
 * Used inside FormValue to show character count alongside FormError.
 * Error appears on the left, character count on the right.
 *
 * @example
 * ```tsx
 * <FormValue>
 *   <SPTextField name="title" maxLength={255} />
 *   <FormError error={errors.title?.message} />
 *   <FormCharCount current={watch('title')?.length || 0} max={255} />
 * </FormValue>
 * ```
 */
const FormCharCount: React.FC<IFormCharCountProps> = ({
  current,
  max,
  warningThreshold = 0.9,
  className = '',
}) => {
  // Determine status class
  let statusClass = '';
  if (max) {
    const ratio = current / max;
    if (ratio >= 1) {
      statusClass = 'error';
    } else if (ratio >= warningThreshold) {
      statusClass = 'warning';
    }
  }

  return (
    <span className={`spfx-form-char-count ${statusClass} ${className}`.trim()}>
      {current}
      {max !== undefined && ` / ${max}`}
    </span>
  );
};

// Set displayName for FormValue detection
FormCharCount.displayName = 'FormCharCount';

export default React.memo(FormCharCount);
