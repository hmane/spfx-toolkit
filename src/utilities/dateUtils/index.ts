// ========================================
// Date Utilities - Index Export
// src/utilities/dateUtils/index.ts
// ========================================

// Import utilities and optional prototype extensions.
import dateExtensions, { applyDateExtensions } from './dateExtensions';

// Export the DateUtils from the default export
export const DateUtils = dateExtensions.DateUtils;

// Export other functions
export { applyDateExtensions };

// Export types
export type { DateExtensionMethod } from './dateExtensions';

// Re-export default
export { default } from './dateExtensions';
