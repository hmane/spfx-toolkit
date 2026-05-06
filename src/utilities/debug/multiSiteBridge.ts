/**
 * Multi-site logger auto-attach bridge.
 *
 * Walks the currently connected sites, attaches each site logger with a
 * `Site/<alias>` source and `{ siteAlias, siteUrl }` metadata, then subscribes
 * to `onSiteChange` so future site connects/disconnects are handled
 * transparently.
 *
 * See `docs/SPDebug-Requirements.md` "Multi-Site Logger Integration".
 */

import type { ISiteContext, SiteLifecycleEvent } from '../context/types';
import { attachLoggerToStore } from './loggerBridge';

interface MultiSiteBridgeAPI {
  list(): string[];
  get(siteUrlOrAlias: string): ISiteContext;
  onSiteChange(listener: (event: SiteLifecycleEvent) => void): () => void;
}

function deriveSiteSource(siteUrl: string, alias?: string): string {
  if (alias) return 'Site/' + alias;
  // Fall back to last URL segment (mirrors logger prefix derivation).
  try {
    const u = new URL(siteUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const tail = parts[parts.length - 1] || u.host;
    return 'Site/' + tail;
  } catch {
    return 'Site/' + siteUrl;
  }
}

/**
 * Subscribe SPDebug to all current and future site loggers.
 *
 * Returns a cleanup function that detaches every site logger sink and
 * unsubscribes from lifecycle events.
 */
export function attachMultiSiteToStore(api: MultiSiteBridgeAPI): () => void {
  // Map site URL -> detach function for the per-site logger sink.
  const detachers = new Map<string, () => void>();

  const attachOne = (
    siteUrl: string,
    alias: string | undefined,
    context: ISiteContext
  ): void => {
    if (detachers.has(siteUrl)) return;
    const detach = attachLoggerToStore(context.logger, {
      source: deriveSiteSource(siteUrl, alias),
      meta: { siteAlias: alias, siteUrl },
    });
    detachers.set(siteUrl, detach);
  };

  const detachOne = (siteUrl: string): void => {
    const fn = detachers.get(siteUrl);
    if (fn) {
      try {
        fn();
      } catch {
        /* never throw from a bridge detach */
      }
      detachers.delete(siteUrl);
    }
  };

  // Walk currently connected sites.
  try {
    for (const url of api.list()) {
      try {
        const context = api.get(url);
        attachOne(url, context.alias, context);
      } catch {
        /* skip sites that fail to resolve */
      }
    }
  } catch {
    /* api may not be ready; fall through to lifecycle subscription */
  }

  // Subscribe to lifecycle events for future sites.
  const unsubscribe = api.onSiteChange((event) => {
    if (event.type === 'added' && event.context) {
      attachOne(event.siteUrl, event.alias, event.context);
    } else if (event.type === 'removed') {
      detachOne(event.siteUrl);
    }
  });

  return () => {
    try {
      unsubscribe();
    } catch {
      /* ignore */
    }
    detachers.forEach((detach) => {
      try {
        detach();
      } catch {
        /* ignore */
      }
    });
    detachers.clear();
  };
}
