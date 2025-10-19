/**
 * Formats file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 * @example
 * ```typescript
 * formatFileSize(1536000); // "1.5 MB"
 * formatFileSize(512); // "512 B"
 * formatFileSize(0); // "0 B"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Invalid size';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Limit to TB (index 4)
  const unitIndex = Math.min(i, units.length - 1);
  const size = bytes / Math.pow(k, unitIndex);

  // Format with 1 decimal place for sizes >= 1 KB
  if (unitIndex === 0) {
    return `${bytes} ${units[0]}`;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
