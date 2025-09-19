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
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
    getFileName(): string;
    getFileExtension(): string;
    getFileNameWithoutExtension(): string;
    toTitleCase(): string;
    truncate(length: number, suffix?: string): string;
    escapeHtml(): string;
    unescapeHtml(): string;
    stripHtml(): string;
    getInitials(maxInitials?: number): string;
    formatFileSize(): string;
    highlightText(searchTerm: string, className?: string): string;
    getSPListUrl(): string;
    getQueryStringMap(): { [key: string]: string };
    getQueryStringValue(key: string): string | undefined;
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
   * Replace all occurrences of a string (ES5 compatible)
   */
  replaceAll: (str: string, searchValue: string | RegExp, replaceValue: string): string => {
    if (typeof searchValue === 'string') {
      return str.split(searchValue).join(replaceValue);
    }
    return str.replace(new RegExp(searchValue.source, 'g'), replaceValue);
  },

  /**
   * Extract filename from a path or URL
   */
  getFileName: (str: string): string => {
    if (!str) return '';
    const lastSlash = Math.max(str.lastIndexOf('/'), str.lastIndexOf('\\'));
    return lastSlash >= 0 ? str.substring(lastSlash + 1) : str;
  },

  /**
   * Get file extension including the dot
   */
  getFileExtension: (str: string): string => {
    if (!str) return '';
    const fileName = StringUtils.getFileName(str);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot) : '';
  },

  /**
   * Get filename without extension
   */
  getFileNameWithoutExtension: (str: string): string => {
    if (!str) return '';
    const fileName = StringUtils.getFileName(str);
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  },

  /**
   * Convert to Title Case
   */
  toTitleCase: (str: string): string => {
    if (!str) return '';
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  },

  /**
   * Truncate string with suffix
   */
  truncate: (str: string, length: number, suffix: string = '...'): string => {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  /**
   * Escape HTML entities
   */
  escapeHtml: (str: string): string => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Unescape HTML entities
   */
  unescapeHtml: (str: string): string => {
    if (!str) return '';
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  },

  /**
   * Strip HTML tags
   */
  stripHtml: (str: string): string => {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '');
  },

  /**
   * Get initials from a name
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
   * Format bytes as human-readable file size
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
   * Highlight search term in text
   */
  highlightText: (str: string, searchTerm: string, className: string = 'highlight'): string => {
    if (!str || !searchTerm) return str;
    const regex = new RegExp('(' + searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return str.replace(regex, '<span class="' + className + '">$1</span>');
  },

  /**
   * Convert relative SharePoint list URL to full URL
   * Input: "Lists/MyList" or "/Lists/MyList"
   * Output: "sites/SiteName/Lists/MyList"
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
   * Parse query string into key-value pairs
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
   * Get specific query string value by key
   */
  getQueryStringValue: (str: string, key: string): string | undefined => {
    const params = StringUtils.getQueryStringMap(str);
    return params[key];
  },
};

// ========================================
// PROTOTYPE EXTENSIONS
// ========================================

/**
 * Apply string extensions to String.prototype
 * Call this function to enable prototype-based extensions
 */
export const applyStringExtensions = (): void => {
  // Check if already applied
  if ((String.prototype as any)._spfxExtensionsApplied) return;

  String.prototype.replaceAll = function (
    searchValue: string | RegExp,
    replaceValue: string
  ): string {
    return StringUtils.replaceAll(this.toString(), searchValue, replaceValue);
  };

  String.prototype.getFileName = function (): string {
    return StringUtils.getFileName(this.toString());
  };

  String.prototype.getFileExtension = function (): string {
    return StringUtils.getFileExtension(this.toString());
  };

  String.prototype.getFileNameWithoutExtension = function (): string {
    return StringUtils.getFileNameWithoutExtension(this.toString());
  };

  String.prototype.toTitleCase = function (): string {
    return StringUtils.toTitleCase(this.toString());
  };

  String.prototype.truncate = function (length: number, suffix?: string): string {
    return StringUtils.truncate(this.toString(), length, suffix);
  };

  String.prototype.escapeHtml = function (): string {
    return StringUtils.escapeHtml(this.toString());
  };

  String.prototype.unescapeHtml = function (): string {
    return StringUtils.unescapeHtml(this.toString());
  };

  String.prototype.stripHtml = function (): string {
    return StringUtils.stripHtml(this.toString());
  };

  String.prototype.getInitials = function (maxInitials?: number): string {
    return StringUtils.getInitials(this.toString(), maxInitials);
  };

  String.prototype.formatFileSize = function (): string {
    return StringUtils.formatFileSize(this.toString());
  };

  String.prototype.highlightText = function (searchTerm: string, className?: string): string {
    return StringUtils.highlightText(this.toString(), searchTerm, className);
  };

  String.prototype.getSPListUrl = function (): string {
    return StringUtils.getSPListUrl(this.toString());
  };

  String.prototype.getQueryStringMap = function (): { [key: string]: string } {
    return StringUtils.getQueryStringMap(this.toString());
  };

  String.prototype.getQueryStringValue = function (key: string): string | undefined {
    return StringUtils.getQueryStringValue(this.toString(), key);
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
