import { SPContext } from '../context';

/**
 * Simple utility for loading CSS files from SharePoint document libraries
 */
export class CssLoader {
  private static _loadedCss: Set<string> = new Set();

  /**
   * Load multiple CSS files from SharePoint document library
   * @param webAbsoluteUrl - Web absolute URL (e.g., 'https://tenant.sharepoint.com/sites/mysite')
   * @param libraryName - Document library name (e.g., 'Style Library')
   * @param cssFiles - Array of CSS file names with relative paths
   * @param options - Loading options
   */
  public static loadCssFiles(
    webAbsoluteUrl: string,
    libraryName: string,
    cssFiles: string[],
    options: { cache?: boolean } = {}
  ): void {
    const { cache = true } = options;

    cssFiles.forEach(cssFile => {
      const cssKey = `${libraryName}/${cssFile}`;

      // Skip if already loaded and caching enabled
      if (cache && this._loadedCss.has(cssKey)) {
        return;
      }

      try {
        // Ensure webAbsoluteUrl doesn't end with a slash
        const cleanWebUrl = webAbsoluteUrl.replace(/\/$/, '');
        const fileUrl = `${cleanWebUrl}/${libraryName}/${cssFile}`;

        if (typeof document === 'undefined' || !document.head) {
          SPContext.logger.warn('CssLoader: document.head is not available', { cssFile });
          return;
        }

        const existingLinks = Array.prototype.slice.call(
          document.head.querySelectorAll('link[data-spfx-toolkit-css]')
        ) as HTMLLinkElement[];
        const alreadyLoadedInDom = existingLinks.some(link => link.getAttribute('data-spfx-toolkit-css') === cssKey);

        if (!alreadyLoadedInDom) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = fileUrl;
          link.setAttribute('data-spfx-toolkit-css', cssKey);
          document.head.appendChild(link);
        }

        // Mark as loaded for caching
        if (cache) {
          this._loadedCss.add(cssKey);
        }
      } catch (error) {
        SPContext.logger.warn('CssLoader: failed to load CSS file', { cssFile, error });
      }
    });
  }

  /**
   * Load single CSS file from SharePoint document library
   * @param webAbsoluteUrl - Web absolute URL (e.g., 'https://tenant.sharepoint.com/sites/mysite')
   * @param libraryName - Document library name
   * @param cssFile - CSS file name with relative path
   * @param options - Loading options
   */
  public static loadCssFile(
    webAbsoluteUrl: string,
    libraryName: string,
    cssFile: string,
    options: { cache?: boolean } = {}
  ): void {
    this.loadCssFiles(webAbsoluteUrl, libraryName, [cssFile], options);
  }
}
