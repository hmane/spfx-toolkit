/**
 * Strips a SharePoint application-page suffix from a web URL/path.
 *
 * SPFx can expose `pageContext.web.absoluteUrl` as a form/application page
 * URL when hosted under `/_layouts/15/...`. PnP uses that value as a base
 * URL, so the whole application-page suffix, including query/hash, must be
 * removed.
 */
export function sanitizeSharePointSiteUrl<T extends string | undefined>(url: T): T {
  if (!url) return url;
  return url.replace(/\/_layouts\/15(?=\/|[?#]|$).*$/i, '') as T;
}

/**
 * Returns a Proxy around an SPFx context that sanitizes only the web URL
 * fields PnP reads while forwarding all framework services to the original.
 */
export function buildSanitizedSpfxContext(ctx: any): any {
  if (!ctx) return ctx;
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'pageContext') {
        const pc = target.pageContext;
        if (!pc) return pc;
        return new Proxy(pc, {
          get(pcTarget, pcProp) {
            if (pcProp === 'web') {
              const web = pcTarget.web;
              if (!web) return web;
              return new Proxy(web, {
                get(webTarget, webProp) {
                  if (webProp === 'absoluteUrl' || webProp === 'serverRelativeUrl') {
                    return sanitizeSharePointSiteUrl(webTarget[webProp]);
                  }
                  return webTarget[webProp];
                },
              });
            }
            return pcTarget[pcProp];
          },
        });
      }
      return target[prop];
    },
  });
}

/**
 * PnP SPFx controls v3 bundles PnP JS v2 and its controls share a mutable
 * default runtime. The v2 URL resolver prefers `sp.baseUrl` over
 * `spfxContext`, so setting a clean base URL prevents another control's raw
 * `sp.setup({ pageContext })` call from reintroducing `/_layouts/15`.
 */
export function configureLegacyPnPBaseUrl(ctx: any): void {
  const cleanWebUrl = sanitizeSharePointSiteUrl(ctx?.pageContext?.web?.absoluteUrl);
  if (!cleanWebUrl) return;

  try {
    const common = require('@pnp/common');
    common.setup?.({ sp: { baseUrl: cleanWebUrl } });
  } catch {
    // Optional compatibility path for the PnP controls' bundled PnP v2 runtime.
  }

  try {
    const legacySp = require('@pnp/spfx-controls-react/node_modules/@pnp/sp');
    legacySp.sp?.setup?.({ sp: { baseUrl: cleanWebUrl } });
  } catch {
    // Package managers may hoist/dedupe the v2 dependency differently.
  }
}
