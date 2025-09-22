/**
 * src/context/utils/environment.ts
 * Environment detection utilities
 */

import { Environment, EnvironmentType } from '@microsoft/sp-core-library';
import type { PageContext } from '@microsoft/sp-page-context';
import type { BuildMode, EnvironmentName } from '../types';

export class EnvironmentDetector {
  static detect(pageContext: PageContext): EnvironmentName {
    try {
      const webUrl = pageContext.web.absoluteUrl.toLowerCase();

      // Check URL patterns
      if (webUrl.includes('/dev') || webUrl.includes('localhost') || webUrl.includes('debug')) {
        return 'dev';
      }

      if (webUrl.includes('/uat') || webUrl.includes('/test') || webUrl.includes('/staging')) {
        return 'uat';
      }

      return 'prod';
    } catch {
      return 'prod'; // Default to production
    }
  }

  static detectBuildMode(): BuildMode {
    try {
      if (Environment.type === EnvironmentType.Local) {
        return 'development';
      }

      // Check for debug manifests or localhost
      const hasDebugManifests = new URLSearchParams(window.location.search).has(
        'debugManifestsFile'
      );
      const isLocalhost = window.location.hostname === 'localhost';

      if (hasDebugManifests || isLocalhost) {
        return 'development';
      }

      return 'production';
    } catch {
      return 'production';
    }
  }
}
