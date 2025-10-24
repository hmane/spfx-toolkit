// ========================================
// String Extensions for SPFx Toolkit
// ========================================

/**
 * String extension methods and utilities for SharePoint Framework
 * Compatible with SPFx 1.21.1 and ES5 target
 */

// ========================================
// TYPE DECLARATIONS
// ========================================

declare global {
  interface String {


    /**     * Format string using placeholders {0}, {1}, etc.
     * @param args - Values to replace placeholders
     * @returns Formatted string
     * @example
     * ```typescript
     * 'Hello, {0}! You have {1} new messages.'.format('Alice', 5);
     * // Result: 'Hello, Alice! You have 5 new messages.'
     * ```
     */
    format(...args: any[]): string;

    /**
     * Replace all occurrences of a string or regex pattern (ES5 compatible)
     * @param searchValue - String or RegExp to search for
     * @param replaceValue - String to replace with
     * @returns New string with all occurrences replaced
     * @example
     * ```typescript
     * 'hello world hello'.replaceAll('hello', 'hi'); // 'hi world hi'
     * ```
     */
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;

    /**
     * Extract filename from a file path or URL
     * @returns Filename with extension
     * @example
     * ```typescript
     * '/sites/mysite/Documents/file.pdf'.getFileName(); // 'file.pdf'
     * ```
     */
    getFileName(): string;

    /**
     * Get file extension including the dot
     * @returns File extension (e.g., '.pdf', '.docx')
     * @example
     * ```typescript
     * 'document.pdf'.getFileExtension(); // '.pdf'
     * ```
     */
    getFileExtension(): string;

    /**
     * Get filename without extension
     * @returns Filename without extension
     * @example
     * ```typescript
     * 'document.pdf'.getFileNameWithoutExtension(); // 'document'
     * ```
     */
    getFileNameWithoutExtension(): string;

    /**
     * Convert string to Title Case
     * @returns String with first letter of each word capitalized
     * @example
     * ```typescript
     * 'hello world'.toTitleCase(); // 'Hello World'
     * ```
     */
    toTitleCase(): string;

    /**
     * Truncate string to specified length with optional suffix
     * @param length - Maximum length including suffix
     * @param suffix - Text to append when truncated (default: '...')
     * @returns Truncated string
     * @example
     * ```typescript
     * 'Very long text here'.truncate(10); // 'Very lo...'
     * ```
     */
    truncate(length: number, suffix?: string): string;

    /**
     * Escape HTML entities in string
     * @returns String with HTML entities escaped
     * @example
     * ```typescript
     * '<script>alert("xss")</script>'.escapeHtml(); // '&lt;script&gt;alert("xss")&lt;/script&gt;'
     * ```
     */
    escapeHtml(): string;

    /**
     * Unescape HTML entities in string
     * @returns String with HTML entities unescaped
     * @example
     * ```typescript
     * '&lt;b&gt;Bold&lt;/b&gt;'.unescapeHtml(); // '<b>Bold</b>'
     * ```
     */
    unescapeHtml(): string;

    /**
     * Remove all HTML tags from string
     * @returns String with HTML tags removed
     * @example
     * ```typescript
     * '<p>Hello <b>world</b></p>'.stripHtml(); // 'Hello world'
     * ```
     */
    stripHtml(): string;

    /**
     * Generate initials from a name or text
     * @param maxInitials - Maximum number of initials to return (default: 2)
     * @returns Uppercase initials
     * @example
     * ```typescript
     * 'John Doe Smith'.getInitials(); // 'JD'
     * 'John Doe Smith'.getInitials(3); // 'JDS'
     * ```
     */
    getInitials(maxInitials?: number): string;

    /**
     * Format a byte value as human-readable file size
     * @returns Formatted file size (e.g., '1.5 MB', '256 KB')
     * @example
     * ```typescript
     * '1536000'.formatFileSize(); // '1.46 MB'
     * ```
     */
    formatFileSize(): string;

    /**
     * Highlight search term in text with HTML markup
     * @param searchTerm - Text to highlight
     * @param className - CSS class for highlighting (default: 'highlight')
     * @returns Text with search term wrapped in span tags
     * @example
     * ```typescript
     * 'Hello world'.highlightText('world'); // 'Hello <span class="highlight">world</span>'
     * ```
     */
    highlightText(searchTerm: string, className?: string): string;

    /**
     * Convert relative SharePoint list URL to full site-relative URL
     * @returns Full SharePoint list URL
     * @example
     * ```typescript
     * 'Lists/MyList'.getSPListUrl(); // 'sites/mysite/Lists/MyList'
     * ```
     */
    getSPListUrl(): string;

    /**
     * Parse query string into key-value pairs object
     * @returns Object containing query string parameters
     * @example
     * ```typescript
     * '?param1=value1&param2=value2'.getQueryStringMap(); // { param1: 'value1', param2: 'value2' }
     * ```
     */
    getQueryStringMap(): { [key: string]: string };

    /**
     * Get specific query string parameter value by key
     * @param key - Parameter name to retrieve
     * @returns Parameter value or undefined if not found
     * @example
     * ```typescript
     * '?id=123&name=test'.getQueryStringValue('id'); // '123'
     * ```
     */
    getQueryStringValue(key: string): string | undefined;

    /**
     * Convert multiline CAML XML to compact single-line format
     * Removes unnecessary whitespace while preserving attribute values and text content
     * Perfect for SharePoint CAML queries that are formatted for readability
     * @returns Compact CAML XML string
     * @example
     * ```typescript
     * const caml = `
     *   <View>
     *     <Where>
     *       <Eq>
     *         <FieldRef Name='Status' />
     *         <Value Type='Text'>Active</Value>
     *       </Eq>
     *     </Where>
     *   </View>
     * `.toCompactCaml();
     * // Result: '<View><Where><Eq><FieldRef Name='Status' /><Value Type='Text'>Active</Value></Eq></Where></View>'
     * ```
     */
    toCompactCaml(): string;
  }
}

// ========================================
// CORE STRING UTILITIES
// ========================================

/**
 * String utility functions that can be used without extending String.prototype
 */
export const StringUtils = {

  /**
   * Format string using placeholders {0}, {1}, etc.
   * @param str - Source string with placeholders
   * @param args - Values to replace placeholders
   * @returns Formatted string
   * @example
   * ```typescript
   * StringUtils.format('Hello, {0}! You have {1} new messages.', 'Alice', 5);
   * // Result: 'Hello, Alice! You have 5 new messages.'
   * ```
   */
  format: (str: string, ...args: any[]): string => {
    return str.replace(/{(\d+)}/g, (match, index) => {
      const value = args[index];
      return value !== undefined ? String(value) : match;
    });
  },

  /**
   * Replace all occurrences of a string or regex pattern (ES5 compatible)
   * @param str - Source string to search in
   * @param searchValue - String or RegExp to search for
   * @param replaceValue - String to replace with
   * @returns New string with all occurrences replaced
   * @example StringUtils.replaceAll('hello world hello', 'hello', 'hi'); // 'hi world hi'
   */
  replaceAll: (str: string, searchValue: string | RegExp, replaceValue: string): string => {
    if (typeof searchValue === 'string') {
      return str.split(searchValue).join(replaceValue);
    }
    return str.replace(new RegExp(searchValue.source, 'g'), replaceValue);
  },

  /**
   * Extract filename from a file path or URL
   * @param str - File path or URL string
   * @returns Filename with extension
   * @example StringUtils.getFileName('/sites/mysite/Documents/file.pdf'); // 'file.pdf'
   */
  getFileName: (str: string): string => {
    if (!str) return '';
    const lastSlash = Math.max(str.lastIndexOf('/'), str.lastIndexOf('\\'));
    return lastSlash >= 0 ? str.substring(lastSlash + 1) : str;
  },

  /**
   * Get file extension including the dot
   * @param str - Filename or file path
   * @returns File extension (e.g., '.pdf', '.docx') or empty string if no extension
   * @example StringUtils.getFileExtension('document.pdf'); // '.pdf'
   */
  getFileExtension: (str: string): string => {
    if (!str) return '';
    const fileName = StringUtils.getFileName(str);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot) : '';
  },

  /**
   * Get filename without extension
   * @param str - Filename or file path
   * @returns Filename without extension
   * @example StringUtils.getFileNameWithoutExtension('document.pdf'); // 'document'
   */
  getFileNameWithoutExtension: (str: string): string => {
    if (!str) return '';
    const fileName = StringUtils.getFileName(str);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  },

  /**
   * Convert string to Title Case
   * @param str - String to convert
   * @returns String with first letter of each word capitalized
   * @example StringUtils.toTitleCase('hello world'); // 'Hello World'
   */
  toTitleCase: (str: string): string => {
    if (!str) return '';
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  },

  /**
   * Truncate string to specified length with optional suffix
   * @param str - String to truncate
   * @param length - Maximum length including suffix
   * @param suffix - Text to append when truncated (default: '...')
   * @returns Truncated string
   * @example StringUtils.truncate('Very long text here', 10); // 'Very lo...'
   */
  truncate: (str: string, length: number, suffix: string = '...'): string => {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  /**
   * Escape HTML entities in string
   * @param str - String to escape
   * @returns String with HTML entities escaped
   * @example StringUtils.escapeHtml('<script>alert("xss")</script>'); // '&lt;script&gt;alert("xss")&lt;/script&gt;'
   */
  escapeHtml: (str: string): string => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Unescape HTML entities in string
   * @param str - String with HTML entities to unescape
   * @returns String with HTML entities converted back to characters
   * @example StringUtils.unescapeHtml('&lt;b&gt;Bold&lt;/b&gt;'); // '<b>Bold</b>'
   */
  unescapeHtml: (str: string): string => {
    if (!str) return '';
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  },

  /**
   * Remove all HTML tags from string
   * @param str - String containing HTML tags to remove
   * @returns Plain text string with all HTML tags stripped
   * @example StringUtils.stripHtml('<p>Hello <b>world</b></p>'); // 'Hello world'
   */
  stripHtml: (str: string): string => {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '');
  },

  /**
   * Generate initials from a name or text
   * @param str - Name or text to extract initials from
   * @param maxInitials - Maximum number of initials to return (default: 2)
   * @returns Uppercase initials string
   * @example
   * StringUtils.getInitials('John Doe Smith'); // 'JD'
   * StringUtils.getInitials('John Doe Smith', 3); // 'JDS'
   */
  getInitials: (str: string, maxInitials: number = 2): string => {
    if (!str) return '';
    return str
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, maxInitials)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  },

  /**
   * Format a byte value as human-readable file size
   * @param str - String representation of bytes (e.g., '1536000')
   * @returns Formatted file size with appropriate units (Bytes, KB, MB, GB, TB)
   * @example
   * StringUtils.formatFileSize('1536000'); // '1.46 MB'
   * StringUtils.formatFileSize('1024'); // '1 KB'
   */
  formatFileSize: (str: string): string => {
    const bytes = parseInt(str, 10);
    if (isNaN(bytes) || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Highlight search term in text with HTML markup
   * @param str - Text to search within
   * @param searchTerm - Term to highlight
   * @param className - CSS class name for the highlight span (default: 'highlight')
   * @returns Text with search term wrapped in span tags
   * @example StringUtils.highlightText('Hello world', 'world'); // 'Hello <span class="highlight">world</span>'
   */
  highlightText: (str: string, searchTerm: string, className: string = 'highlight'): string => {
    if (!str || !searchTerm) return str;
    const regex = new RegExp('(' + searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return str.replace(regex, '<span class="' + className + '">$1</span>');
  },

  /**
   * Convert relative SharePoint list URL to full site-relative URL
   * Uses current SharePoint page context to build complete URL
   * @param str - Relative list URL (e.g., 'Lists/MyList' or '/Lists/MyList')
   * @returns Full site-relative URL (e.g., 'sites/mysite/Lists/MyList')
   * @example
   * StringUtils.getSPListUrl('Lists/MyList'); // 'sites/mysite/Lists/MyList'
   * StringUtils.getSPListUrl('/Lists/Documents'); // 'sites/mysite/Lists/Documents'
   */
  getSPListUrl: (str: string): string => {
    if (!str) return '';

    // Get current SharePoint context
    const context = (window as any)._spPageContextInfo;
    if (!context) return str;

    let siteServerRelativeUrl = context.siteServerRelativeUrl || context.webServerRelativeUrl || '';
    if (siteServerRelativeUrl === '/') {
      siteServerRelativeUrl = '';
    }

    // Clean the input URL
    let cleanUrl = str;
    if (cleanUrl.charAt(0) === '/') {
      cleanUrl = cleanUrl.substring(1);
    }

    // Combine site URL with list URL
    return siteServerRelativeUrl ? siteServerRelativeUrl.substring(1) + '/' + cleanUrl : cleanUrl;
  },

  /**
   * Parse query string into key-value pairs object
   * @param str - URL or query string to parse (with or without '?' prefix)
   * @returns Object containing decoded query string parameters
   * @example
   * StringUtils.getQueryStringMap('?param1=value1&param2=value2'); // { param1: 'value1', param2: 'value2' }
   * StringUtils.getQueryStringMap('id=123&name=test'); // { id: '123', name: 'test' }
   */
  getQueryStringMap: (str: string): { [key: string]: string } => {
    const queryString = str.indexOf('?') >= 0 ? str.substring(str.indexOf('?') + 1) : str;
    const params: { [key: string]: string } = {};

    if (!queryString) return params;

    const pairs = queryString.split('&');
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].split('=');
      if (pair.length === 2) {
        const key = decodeURIComponent(pair[0]);
        const value = decodeURIComponent(pair[1]);
        params[key] = value;
      }
    }

    return params;
  },

  /**
   * Get specific query string parameter value by key
   * @param str - URL or query string to search in
   * @param key - Parameter name to retrieve
   * @returns Parameter value or undefined if not found
   * @example
   * StringUtils.getQueryStringValue('?id=123&name=test', 'id'); // '123'
   * StringUtils.getQueryStringValue('param1=value1&param2=value2', 'param2'); // 'value2'
   */
  getQueryStringValue: (str: string, key: string): string | undefined => {
    const params = StringUtils.getQueryStringMap(str);
    return params[key];
  },

  /**
   * Convert CAML XML to compact format by removing unnecessary whitespace
   *
   * This function intelligently removes structural whitespace from CAML XML while preserving:
   * - Content within quoted attribute values (e.g., Name='My Field Name')
   * - Text content between XML tags
   * - Essential spaces within attribute values
   *
   * The algorithm processes the string character by character, tracking quoted sections
   * to ensure that whitespace within quotes is preserved exactly as-is.
   *
   * @param str - Multiline CAML XML string to compact
   * @returns Compact single-line CAML XML string
   *
   * @example
   * ```typescript
   * const multilineCaml = `
   *   <View>
   *     <Where>
   *       <And>
   *         <Eq>
   *           <FieldRef Name='Status Field' />
   *           <Value Type='Text'>Active Status</Value>
   *         </Eq>
   *         <Geq>
   *           <FieldRef Name='Modified' />
   *           <Value Type='DateTime'>2025-01-01T00:00:00Z</Value>
   *         </Geq>
   *       </And>
   *     </Where>
   *     <OrderBy>
   *       <FieldRef Name='Title' Ascending='TRUE' />
   *     </OrderBy>
   *   </View>
   * `;
   *
   * const compactCaml = StringUtils.toCompactCaml(multilineCaml);
   * // Result: "<View><Where><And><Eq><FieldRef Name='Status Field' /><Value Type='Text'>Active Status</Value></Eq>..."
   * ```
   *
   * @example SharePoint CAML Query Usage
   * ```typescript
   * // Define readable CAML query
   * const camlQuery = `
   *   <View>
   *     <Query>
   *       <Where>
   *         <And>
   *           <Eq>
   *             <FieldRef Name='ContentType' />
   *             <Value Type='Text'>Document</Value>
   *           </Eq>
   *           <Contains>
   *             <FieldRef Name='Title' />
   *             <Value Type='Text'>Important</Value>
   *           </Contains>
   *         </And>
   *       </Where>
   *       <OrderBy>
   *         <FieldRef Name='Modified' Ascending='FALSE' />
   *       </OrderBy>
   *     </Query>
   *     <ViewFields>
   *       <FieldRef Name='Title' />
   *       <FieldRef Name='Modified' />
   *       <FieldRef Name='Author' />
   *     </ViewFields>
   *   </View>
   * `.toCompactCaml();
   *
   * // Use in SharePoint list query
   * const items = await sp.web.lists.getByTitle('Documents')
   *   .getItemsByCAMLQuery({ ViewXml: camlQuery });
   * ```
   */
  toCompactCaml: (str: string): string => {
    if (!str) return '';

    let result = str.trim();

    // Step 1: Remove whitespace between XML tags (most important for compacting)
    result = result.replace(/>\s+</g, '><');

    // Step 2: Remove line breaks and tabs that are not within quoted attribute values
    // Split by quotes to preserve quoted content, then clean non-quoted parts
    const parts: string[] = [];
    let inQuotes = false;
    let quoteChar = '';
    let currentPart = '';

    for (let i = 0; i < result.length; i++) {
      const char = result.charAt(i);

      if (!inQuotes && (char === '"' || char === "'")) {
        // Starting a quoted section
        inQuotes = true;
        quoteChar = char;
        currentPart += char;
      } else if (inQuotes && char === quoteChar) {
        // Ending a quoted section
        inQuotes = false;
        quoteChar = '';
        currentPart += char;
      } else if (!inQuotes && (char === '\r' || char === '\n' || char === '\t')) {
        // Remove line breaks and tabs outside quotes
        continue;
      } else if (!inQuotes && char === ' ') {
        // Replace multiple spaces with single space outside quotes
        if (currentPart.charAt(currentPart.length - 1) !== ' ') {
          currentPart += char;
        }
      } else {
        currentPart += char;
      }
    }

    return currentPart;
  },
};

// ========================================
// PROTOTYPE EXTENSIONS
// ========================================

/**
 * Apply string extensions to String.prototype to enable method chaining
 *
 * This function extends the native String prototype with additional methods
 * for common string manipulation tasks. It includes safety checks to prevent
 * multiple applications of the same extensions.
 *
 * @remarks
 * Extensions are automatically applied when importing from 'spfx-toolkit/lib/utilities/stringUtils'
 * Manual calling is only needed if extensions were not auto-applied or need to be reapplied.
 *
 * @example
 * ```typescript
 * // Extensions are auto-applied on import
 * import 'spfx-toolkit/lib/utilities/stringUtils';
 *
 * // Now you can use extension methods
 * const filename = '/path/to/file.pdf'.getFileName(); // 'file.pdf'
 * const initials = 'John Doe'.getInitials(); // 'JD'
 *
 * // Manual application (rarely needed)
 * import { applyStringExtensions } from 'spfx-toolkit/lib/utilities/stringUtils';
 * applyStringExtensions();
 * ```
 */
export const applyStringExtensions = (): void => {
  // Check if already applied
  if ((String.prototype as any)._spfxExtensionsApplied) return;

  /**
   * Format string using placeholders {0}, {1}, etc.
   * @see StringUtils.format for detailed documentation
   */
  String.prototype.format = function (...args: any[]): string {
    return StringUtils.format(this.toString(), ...args);
  };

  /**
   * Replace all occurrences of a string or regex pattern
   * @see StringUtils.replaceAll for detailed documentation
   */
  String.prototype.replaceAll = function (
    searchValue: string | RegExp,
    replaceValue: string
  ): string {
    return StringUtils.replaceAll(this.toString(), searchValue, replaceValue);
  };

  /**
   * Extract filename from a path or URL
   * @see StringUtils.getFileName for detailed documentation
   */
  String.prototype.getFileName = function (): string {
    return StringUtils.getFileName(this.toString());
  };

  /**
   * Get file extension including the dot
   * @see StringUtils.getFileExtension for detailed documentation
   */
  String.prototype.getFileExtension = function (): string {
    return StringUtils.getFileExtension(this.toString());
  };

  /**
   * Get filename without extension
   * @see StringUtils.getFileNameWithoutExtension for detailed documentation
   */
  String.prototype.getFileNameWithoutExtension = function (): string {
    return StringUtils.getFileNameWithoutExtension(this.toString());
  };

  /**
   * Convert to Title Case
   * @see StringUtils.toTitleCase for detailed documentation
   */
  String.prototype.toTitleCase = function (): string {
    return StringUtils.toTitleCase(this.toString());
  };

  /**
   * Truncate string with suffix
   * @see StringUtils.truncate for detailed documentation
   */
  String.prototype.truncate = function (length: number, suffix?: string): string {
    return StringUtils.truncate(this.toString(), length, suffix);
  };

  /**
   * Escape HTML entities
   * @see StringUtils.escapeHtml for detailed documentation
   */
  String.prototype.escapeHtml = function (): string {
    return StringUtils.escapeHtml(this.toString());
  };

  /**
   * Unescape HTML entities
   * @see StringUtils.unescapeHtml for detailed documentation
   */
  String.prototype.unescapeHtml = function (): string {
    return StringUtils.unescapeHtml(this.toString());
  };

  /**
   * Strip HTML tags
   * @see StringUtils.stripHtml for detailed documentation
   */
  String.prototype.stripHtml = function (): string {
    return StringUtils.stripHtml(this.toString());
  };

  /**
   * Get initials from a name
   * @see StringUtils.getInitials for detailed documentation
   */
  String.prototype.getInitials = function (maxInitials?: number): string {
    return StringUtils.getInitials(this.toString(), maxInitials);
  };

  /**
   * Format bytes as human-readable file size
   * @see StringUtils.formatFileSize for detailed documentation
   */
  String.prototype.formatFileSize = function (): string {
    return StringUtils.formatFileSize(this.toString());
  };

  /**
   * Highlight search term in text
   * @see StringUtils.highlightText for detailed documentation
   */
  String.prototype.highlightText = function (searchTerm: string, className?: string): string {
    return StringUtils.highlightText(this.toString(), searchTerm, className);
  };

  /**
   * Convert relative SharePoint list URL to full URL
   * @see StringUtils.getSPListUrl for detailed documentation
   */
  String.prototype.getSPListUrl = function (): string {
    return StringUtils.getSPListUrl(this.toString());
  };

  /**
   * Parse query string into key-value pairs
   * @see StringUtils.getQueryStringMap for detailed documentation
   */
  String.prototype.getQueryStringMap = function (): { [key: string]: string } {
    return StringUtils.getQueryStringMap(this.toString());
  };

  /**
   * Get specific query string value by key
   * @see StringUtils.getQueryStringValue for detailed documentation
   */
  String.prototype.getQueryStringValue = function (key: string): string | undefined {
    return StringUtils.getQueryStringValue(this.toString(), key);
  };

  /**
   * Convert CAML XML to compact format
   * @see StringUtils.toCompactCaml for detailed documentation
   */
  String.prototype.toCompactCaml = function (): string {
    return StringUtils.toCompactCaml(this.toString());
  };

  // Mark as applied
  (String.prototype as any)._spfxExtensionsApplied = true;
};

// ========================================
// EXPORTS
// ========================================

export default {
  StringUtils,
  applyStringExtensions,
};

// Type exports
export type StringExtensionMethod = keyof typeof StringUtils;
