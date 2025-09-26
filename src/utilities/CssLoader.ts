import { SPComponentLoader } from '@microsoft/sp-loader';
import { SPFI } from '@pnp/sp';

/**
 * Simple utility for loading CSS files from SharePoint document libraries
 */
export class CssLoader {
  private static _loadedCss: Set<string> = new Set();

  /**
   * Load multiple CSS files from SharePoint document library
   * @param sp - PnP SP instance
   * @param libraryName - Document library name (e.g., 'Style Library')
   * @param cssFiles - Array of CSS file names with relative paths
   * @param options - Loading options
   */
  public static loadCssFiles(
    sp: SPFI,
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
        // Use SP instance to get web URL
        const webUrl = sp.web.toUrl();
        const fileUrl = `${webUrl}/${libraryName}/${cssFile}`;

        // Load CSS synchronously
        SPComponentLoader.loadCss(fileUrl);

        // Mark as loaded for caching
        if (cache) {
          this._loadedCss.add(cssKey);
        }
      } catch (error) {
        console.warn(`Failed to load CSS file: ${cssFile}`, error);
      }
    });
  }

  /**
   * Load single CSS file from SharePoint document library
   * @param sp - PnP SP instance
   * @param libraryName - Document library name
   * @param cssFile - CSS file name with relative path
   * @param options - Loading options
   */
  public static loadCssFile(
    sp: SPFI,
    libraryName: string,
    cssFile: string,
    options: { cache?: boolean } = {}
  ): void {
    this.loadCssFiles(sp, libraryName, [cssFile], options);
  }
}
