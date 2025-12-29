import * as React from 'react';
import { SPContext } from '../../../utilities/context';
import { IDocumentInfo, DocumentLinkError } from '../DocumentLink.types';
import { getFileExtension, toAbsoluteUrl, getFilenameFromUrl } from '../utils';

/**
 * Cache for document metadata
 * Uses Map for O(1) lookups
 */
const documentCache = new Map<string, IDocumentInfo>();

/**
 * Pending promise tracking for request deduplication
 * Prevents duplicate API calls when multiple DocumentLink components
 * request the same document simultaneously
 */
const pendingRequests = new Map<string, Promise<IDocumentInfo>>();

/**
 * Options for useDocumentMetadata hook
 */
interface IUseDocumentMetadataOptions {
  documentUrl?: string;
  documentId?: number;
  documentUniqueId?: string;
  libraryName?: string;
  enableCache?: boolean;
}

/**
 * Result from useDocumentMetadata hook
 */
interface IUseDocumentMetadataResult {
  document: IDocumentInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and cache document metadata from SharePoint
 * @param options - Hook options
 * @returns Document metadata, loading state, error, and refetch function
 * @example
 * ```typescript
 * const { document, loading, error } = useDocumentMetadata({
 *   documentUrl: 'https://tenant.sharepoint.com/sites/site/Shared%20Documents/file.pdf',
 *   enableCache: true
 * });
 * ```
 */
export function useDocumentMetadata(
  options: IUseDocumentMetadataOptions
): IUseDocumentMetadataResult {
  const { documentUrl, documentId, documentUniqueId, libraryName, enableCache = true } = options;

  const [document, setDocument] = React.useState<IDocumentInfo | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = React.useRef<boolean>(true);

  // Cleanup on unmount
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Generate cache key - use useMemo instead of useCallback
  const cacheKey = React.useMemo((): string => {
    if (documentUrl) return `url:${documentUrl}`;
    if (documentUniqueId) return `uid:${documentUniqueId}`;
    if (documentId && libraryName) return `id:${libraryName}:${documentId}`;
    return '';
  }, [documentUrl, documentId, documentUniqueId, libraryName]);

  // Fetch document metadata
  const fetchDocument = React.useCallback(async (): Promise<void> => {
    try {
      if (!isMountedRef.current) return;

      setLoading(true);
      setError(null);

      // Validate input
      if (!documentUrl && !documentUniqueId && !(documentId && libraryName)) {
        throw new DocumentLinkError(
          'Either documentUrl, documentUniqueId, or documentId with libraryName must be provided',
          'INVALID_INPUT'
        );
      }

      // Check cache first
      if (enableCache && cacheKey && documentCache.has(cacheKey)) {
        const cachedDoc = documentCache.get(cacheKey)!;
        if (isMountedRef.current) {
          setDocument(cachedDoc);
          setLoading(false);
        }
        return;
      }

      // Check if there's already a pending request for this document
      // This prevents duplicate API calls when multiple components request the same document
      if (cacheKey && pendingRequests.has(cacheKey)) {
        try {
          const docInfo = await pendingRequests.get(cacheKey)!;
          if (isMountedRef.current) {
            setDocument(docInfo);
          }
          return;
        } catch {
          // If pending request failed, we'll try again below
        }
      }

      // Ensure SPContext is initialized
      if (!SPContext.isReady()) {
        throw new DocumentLinkError(
          'SPContext is not initialized. Call SPContext.smart() or SPContext.initialize() first.',
          'FETCH_FAILED'
        );
      }

      // Create the fetch promise and track it for deduplication
      const fetchPromise = (async (): Promise<IDocumentInfo> => {
        let fileData: any;

        // Fetch by URL
        if (documentUrl) {
          fileData = await fetchByUrl(documentUrl);
        }
        // Fetch by UniqueId
        else if (documentUniqueId) {
          fileData = await fetchByUniqueId(documentUniqueId);
        }
        // Fetch by ID and library name
        else if (documentId && libraryName) {
          fileData = await fetchByIdAndLibrary(documentId, libraryName);
        }

        // Transform to IDocumentInfo
        const docInfo = transformToDocumentInfo(fileData);

        // Cache the result
        if (enableCache && cacheKey) {
          documentCache.set(cacheKey, docInfo);
        }

        return docInfo;
      })();

      // Track the pending request
      if (cacheKey) {
        pendingRequests.set(cacheKey, fetchPromise);
      }

      try {
        const docInfo = await fetchPromise;

        // Check if still mounted before updating state
        if (isMountedRef.current) {
          setDocument(docInfo);
        }
      } finally {
        // Clear pending request after completion
        if (cacheKey) {
          pendingRequests.delete(cacheKey);
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      const error =
        err instanceof DocumentLinkError
          ? err
          : new DocumentLinkError(
              err.message || 'Failed to fetch document metadata',
              'FETCH_FAILED',
              err
            );
      setError(error);
      SPContext.logger?.error('useDocumentMetadata: Failed to fetch document', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [documentUrl, documentId, documentUniqueId, libraryName, enableCache, cacheKey]);

  // Refetch function (bypasses cache)
  const refetch = React.useCallback(async (): Promise<void> => {
    if (cacheKey) {
      documentCache.delete(cacheKey);
    }
    await fetchDocument();
  }, [fetchDocument, cacheKey]);

  // Fetch on mount or when dependencies change
  React.useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  return { document, loading, error, refetch };
}

/**
 * Fully decode a URL path, handling multiple levels of encoding
 * Keeps decoding until no more %XX patterns are found or we reach a stable state
 */
function fullyDecodeUrlPath(path: string): string {
  let decoded = path;
  let previous = '';

  // Keep decoding while the string changes and still contains encoded chars
  while (decoded !== previous && decoded.includes('%')) {
    previous = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // If decode fails, we've hit an invalid sequence - stop
      break;
    }
  }

  return decoded;
}

/**
 * Fetches document by URL
 */
async function fetchByUrl(documentUrl: string): Promise<any> {
  try {
    // Convert to server-relative URL if needed
    let serverRelativeUrl = documentUrl;

    // If it's an absolute URL, extract server-relative path
    if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
      try {
        const url = new URL(documentUrl);
        // url.pathname is automatically decoded by URL constructor
        serverRelativeUrl = url.pathname;
      } catch {
        // If URL parsing fails, try to extract path manually
        const pathMatch = documentUrl.match(/https?:\/\/[^\/]+(\/.*)/);
        if (pathMatch) {
          serverRelativeUrl = pathMatch[1];
        }
      }
    }

    // Ensure the path starts with /
    if (!serverRelativeUrl.startsWith('/')) {
      serverRelativeUrl = '/' + serverRelativeUrl;
    }

    // Fully decode any URL-encoded characters to get the actual path
    // This handles double-encoded URLs like %2520 (which is %20 encoded again)
    serverRelativeUrl = fullyDecodeUrlPath(serverRelativeUrl);

    // Use SPContext.spPessimistic for fresh data
    const file: any = await SPContext.spPessimistic.web.getFileByServerRelativePath(serverRelativeUrl)
      .select(
        'UniqueId',
        'Name',
        'Title',
        'ServerRelativeUrl',
        'Length',
        'TimeCreated',
        'TimeLastModified',
        'MajorVersion',
        'MinorVersion',
        'CheckOutType',
        'ListId',
        'ListItemAllFields/Id'
      )
      .expand('Author', 'ModifiedBy', 'CheckedOutByUser', 'ListItemAllFields')();

    return {
      ...file,
      Id: file.ListItemAllFields?.Id || 0,
    };
  } catch (err: any) {
    if (err.status === 404) {
      throw new DocumentLinkError('Document not found', 'NOT_FOUND', { url: documentUrl });
    }
    if (err.status === 403) {
      throw new DocumentLinkError('Permission denied', 'PERMISSION_DENIED', { url: documentUrl });
    }
    throw err;
  }
}

/**
 * Fetches document by UniqueId (GUID)
 */
async function fetchByUniqueId(uniqueId: string): Promise<any> {
  try {
    const file: any = await SPContext.spPessimistic.web
      .getFileById(uniqueId)
      .select(
        'UniqueId',
        'Name',
        'Title',
        'ServerRelativeUrl',
        'Length',
        'TimeCreated',
        'TimeLastModified',
        'MajorVersion',
        'MinorVersion',
        'CheckOutType',
        'ListId',
        'ListItemAllFields/Id'
      )
      .expand('Author', 'ModifiedBy', 'CheckedOutByUser', 'ListItemAllFields')();

    return {
      ...file,
      Id: file.ListItemAllFields?.Id || 0,
    };
  } catch (err: any) {
    if (err.status === 404) {
      throw new DocumentLinkError('Document not found', 'NOT_FOUND', { uniqueId });
    }
    if (err.status === 403) {
      throw new DocumentLinkError('Permission denied', 'PERMISSION_DENIED', { uniqueId });
    }
    throw err;
  }
}

/**
 * Fetches document by ID and library name
 */
async function fetchByIdAndLibrary(documentId: number, libraryName: string): Promise<any> {
  try {
    // First, get the list ID
    const list = await SPContext.spPessimistic.web.lists.getByTitle(libraryName).select('Id')();

    const item: any = await SPContext.spPessimistic.web.lists
      .getByTitle(libraryName)
      .items.getById(documentId)
      .select(
        'Id',
        'Title',
        'Created',
        'Modified',
        'File/UniqueId',
        'File/Name',
        'File/ServerRelativeUrl',
        'File/Length',
        'File/MajorVersion',
        'File/MinorVersion',
        'File/CheckOutType',
        'Author/Id',
        'Author/Title',
        'Author/Name',
        'Author/EMail',
        'Editor/Id',
        'Editor/Title',
        'Editor/Name',
        'Editor/EMail'
      )
      .expand('File', 'Author', 'Editor')();

    // Transform to file structure
    return {
      Id: item.Id,
      UniqueId: item.File?.UniqueId,
      Name: item.File?.Name,
      Title: item.Title || item.File?.Name,
      ServerRelativeUrl: item.File?.ServerRelativeUrl,
      Length: item.File?.Length,
      TimeCreated: item.Created,
      TimeLastModified: item.Modified,
      MajorVersion: item.File?.MajorVersion,
      MinorVersion: item.File?.MinorVersion,
      CheckOutType: item.File?.CheckOutType,
      Author: {
        Id: item.Author?.Id,
        Email: item.Author?.EMail || item.Author?.Name || '',
        Title: item.Author?.Title,
        LoginName: item.Author?.Name || '',
      },
      ModifiedBy: {
        Id: item.Editor?.Id,
        Email: item.Editor?.EMail || item.Editor?.Name || '',
        Title: item.Editor?.Title,
        LoginName: item.Editor?.Name || '',
      },
      CheckedOutByUser: item.File?.CheckedOutByUser,
      ListId: list.Id,
    };
  } catch (err: any) {
    if (err.status === 404) {
      throw new DocumentLinkError('Document or library not found', 'NOT_FOUND', {
        documentId,
        libraryName,
      });
    }
    if (err.status === 403) {
      throw new DocumentLinkError('Permission denied', 'PERMISSION_DENIED', {
        documentId,
        libraryName,
      });
    }
    throw err;
  }
}

/**
 * Transforms SharePoint file data to IDocumentInfo
 */
function transformToDocumentInfo(fileData: any): IDocumentInfo {
  const webUrl = SPContext.webAbsoluteUrl || '';
  const absoluteUrl = toAbsoluteUrl(fileData.ServerRelativeUrl, webUrl);
  const fileExtension = getFileExtension(fileData.Name);
  const version = `${fileData.MajorVersion}.${fileData.MinorVersion || 0}`;

  // Extract library name from server relative URL
  const libraryName = extractLibraryName(fileData.ServerRelativeUrl);

  return {
    id: fileData.Id || 0,
    uniqueId: fileData.UniqueId,
    name: fileData.Name,
    title: fileData.Title || fileData.Name,
    url: absoluteUrl,
    serverRelativeUrl: fileData.ServerRelativeUrl,
    size: fileData.Length || 0,
    fileType: fileExtension,
    created: new Date(fileData.TimeCreated),
    createdBy: {
      id: fileData.Author?.Id || 0,
      email: fileData.Author?.Email || '',
      title: fileData.Author?.Title || 'Unknown',
      loginName: fileData.Author?.LoginName || '',
    },
    modified: new Date(fileData.TimeLastModified),
    modifiedBy: {
      id: fileData.ModifiedBy?.Id || 0,
      email: fileData.ModifiedBy?.Email || '',
      title: fileData.ModifiedBy?.Title || 'Unknown',
      loginName: fileData.ModifiedBy?.LoginName || '',
    },
    checkOutUser:
      fileData.CheckOutType !== 2 && fileData.CheckedOutByUser
        ? {
            id: fileData.CheckedOutByUser.Id,
            email: fileData.CheckedOutByUser.Email,
            title: fileData.CheckedOutByUser.Title,
            loginName: fileData.CheckedOutByUser.LoginName,
          }
        : undefined,
    libraryName,
    listId: fileData.ListId || '',
    version,
  };
}

/**
 * Extracts library name from server relative URL
 * @param serverRelativeUrl - Server relative URL
 * @returns Library name
 */
function extractLibraryName(serverRelativeUrl: string): string {
  if (!serverRelativeUrl) return '';

  const segments = serverRelativeUrl.split('/').filter(Boolean);

  // Typically: /sites/sitename/libraryname/folders/file.ext
  // or: /libraryname/file.ext (root site)
  // Find the library segment (usually after site name or first segment)
  if (segments.length >= 2) {
    // Check if this is a sites collection
    if (segments[0].toLowerCase() === 'sites' && segments.length >= 3) {
      return segments[2]; // /sites/sitename/[libraryname]/...
    }
    return segments[0]; // /[libraryname]/...
  }

  return '';
}

/**
 * Clears the document metadata cache
 * Useful for forcing fresh data fetch
 */
export function clearDocumentCache(): void {
  documentCache.clear();
}

/**
 * Removes specific document from cache
 * @param cacheKey - Cache key to remove
 */
export function removeCachedDocument(cacheKey: string): void {
  documentCache.delete(cacheKey);
}
