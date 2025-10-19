/**
 * Extracts file extension from filename or URL
 * @param nameOrUrl - Filename or URL
 * @returns File extension without dot (e.g., "pdf", "docx") or empty string
 * @example
 * ```typescript
 * getFileExtension("document.pdf"); // "pdf"
 * getFileExtension("https://site.com/doc.docx"); // "docx"
 * getFileExtension("file"); // ""
 * ```
 */
export function getFileExtension(nameOrUrl: string): string {
  if (!nameOrUrl) return '';

  // Extract filename from URL if needed
  const filename = nameOrUrl.split('/').pop() || nameOrUrl;

  // Remove query string if present
  const filenameWithoutQuery = filename.split('?')[0];

  // Extract extension
  const lastDotIndex = filenameWithoutQuery.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === filenameWithoutQuery.length - 1) {
    return '';
  }

  return filenameWithoutQuery.substring(lastDotIndex + 1).toLowerCase();
}
