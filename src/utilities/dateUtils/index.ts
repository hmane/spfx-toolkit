// ========================================
// Date Utilities - Index Export
// src/utilities/dateUtils/index.ts
// ========================================

// Import and immediately apply extensions
import dateExtensions, { applyDateExtensions } from './dateExtensions';

// Auto-initialize extensions when imported
applyDateExtensions();

// Export the DateUtils from the default export
export const DateUtils = dateExtensions.DateUtils;

// Export other functions
export { applyDateExtensions };

// Export types
export type { DateExtensionMethod } from './dateExtensions';

// Re-export default
export { default } from './dateExtensions';
