// ========================================
// String Utilities - Index Export
// src/utilities/stringUtils/index.ts
// ========================================

// Import and immediately apply extensions
import stringExtensions, { applyStringExtensions } from './stringExtensions';

// Auto-initialize extensions when imported
applyStringExtensions();

// Export the StringUtils from the default export
export const StringUtils = stringExtensions.StringUtils;

// Export other functions
export { applyStringExtensions };

// Export types
export type { StringExtensionMethod } from './stringExtensions';

// Re-export default
export { default } from './stringExtensions';
