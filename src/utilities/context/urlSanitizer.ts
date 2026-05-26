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
