/**
 * Helper functions for document URL manipulation
 */

import { getFileExtension } from './getFileExtension';

/**
 * Converts server-relative URL to absolute URL
 * @param serverRelativeUrl - Server-relative URL (e.g., /sites/site/Documents/file.pdf)
 * @param webUrl - Web absolute URL (e.g., https://tenant.sharepoint.com/sites/site)
 * @returns Absolute URL
 */
export function toAbsoluteUrl(serverRelativeUrl: string, webUrl: string): string {
  if (!serverRelativeUrl) return '';
  if (serverRelativeUrl.startsWith('http')) return serverRelativeUrl;

  try {
    const url = new URL(webUrl);
    const origin = url.origin;
    const path = serverRelativeUrl.startsWith('/') ? serverRelativeUrl : `/${serverRelativeUrl}`;
    return `${origin}${path}`;
  } catch {
    const baseUrl = webUrl.replace(/\/$/, '');
    const path = serverRelativeUrl.startsWith('/') ? serverRelativeUrl : `/${serverRelativeUrl}`;
    return `${baseUrl}${path}`;
  }
}

/**
 * Extracts filename from URL
 * @param url - Document URL
 * @returns Filename with extension
 */
export function getFilenameFromUrl(url: string): string {
  if (!url) return '';

  const urlWithoutQuery = url.split('?')[0];
  const segments = urlWithoutQuery.split('/');
  const filename = segments[segments.length - 1];

  return decodeURIComponent(filename);
}

/**
 * Determine the site collection relative path (e.g. /sites/siteName)
 */
function getSitePath(pathname: string, serverRelativeUrl?: string): string {
  const source = serverRelativeUrl || pathname;
  if (!source) {
    return '';
  }

  const segments = source.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '';
  }

  const first = segments[0].toLowerCase();

  if (first === 'sites' || first === 'teams' || first === 'personal') {
    if (segments.length >= 2) {
      return `/${segments[0]}/${segments[1]}`;
    }
    return `/${segments[0]}`;
  }

  return '';
}

/**
 * Builds SharePoint preview URL using Office Online (WOPI)
 * @param documentUrl - Absolute document URL
 * @param mode - Preview mode (view or edit)
 * @param serverRelativeUrl - Optional server relative path to preserve site collection routing
 * @returns Preview URL for Office Online viewer
 */
export function buildPreviewUrl(
  documentUrl: string,
  mode: 'view' | 'edit',
  serverRelativeUrl?: string
): string {
  if (!documentUrl) return '';

  try {
    const url = new URL(documentUrl);
    const origin = url.origin;
    const sitePath = getSitePath(url.pathname, serverRelativeUrl);
    const layoutBase = `${origin}${sitePath}/_layouts/15`;
    const encodedUrl = encodeURIComponent(documentUrl);

    const extension = getFileExtension(documentUrl).toLowerCase();
    const officeExtensions = [
      'docx',
      'doc',
      'xlsx',
      'xls',
      'pptx',
      'ppt',
      'docm',
      'dotx',
      'xlsm',
      'xltx',
      'pptm',
      'potx',
    ];

    const isOfficeDoc = officeExtensions.includes(extension);

    if (isOfficeDoc) {
      const action = mode === 'view' ? 'interactivepreview' : 'edit';
      return `${layoutBase}/WopiFrame.aspx?sourcedoc=${encodedUrl}&action=${action}`;
    }

    if (extension === 'pdf') {
      return `${layoutBase}/WopiFrame.aspx?sourcedoc=${encodedUrl}&action=interactivepreview`;
    }

    if (mode === 'view') {
      return `${layoutBase}/Doc.aspx?sourcedoc=${encodedUrl}&action=default`;
    }

    return documentUrl;
  } catch (error) {
    return documentUrl;
  }
}

/**
 * Builds download URL for SharePoint document
 * @param documentUrl - Absolute document URL
 * @returns Download URL with download parameter
 */
export function buildDownloadUrl(documentUrl: string): string {
  if (!documentUrl) return '';
  const separator = documentUrl.includes('?') ? '&' : '?';
  return `${documentUrl}${separator}download=1`;
}
