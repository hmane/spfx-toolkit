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
 * Cleans already-composed SharePoint REST URLs where PnP used a layouts page
 * as the web root, producing `/sites/x/_layouts/15/_api/...`.
 */
export function sanitizeSharePointApiUrl<T extends string | undefined>(url: T): T {
  if (!url) return url;
  return url.replace(/\/_layouts\/15(?=\/_api(?:\/|[?#]|$))/i, '') as T;
}

/**
 * Returns a Proxy around an SPFx context that sanitizes only the web URL
 * fields PnP reads while forwarding all framework services to the original.
 */
export function buildSanitizedSpfxContext(ctx: any): any {
  if (!ctx) return ctx;
  const pageContext = ctx.pageContext;
  const web = pageContext?.web;

  if (!pageContext || !web) {
    return ctx;
  }

  const sanitizedWeb = Object.create(Object.getPrototypeOf(web));
  Object.defineProperties(sanitizedWeb, Object.getOwnPropertyDescriptors(web));
  Object.defineProperty(sanitizedWeb, 'absoluteUrl', {
    configurable: true,
    enumerable: true,
    value: sanitizeSharePointSiteUrl(web.absoluteUrl),
  });
  Object.defineProperty(sanitizedWeb, 'serverRelativeUrl', {
    configurable: true,
    enumerable: true,
    value: sanitizeSharePointSiteUrl(web.serverRelativeUrl),
  });

  const sanitizedPageContext = Object.create(Object.getPrototypeOf(pageContext));
  Object.defineProperties(sanitizedPageContext, Object.getOwnPropertyDescriptors(pageContext));
  Object.defineProperty(sanitizedPageContext, 'web', {
    configurable: true,
    enumerable: true,
    value: sanitizedWeb,
  });

  const sanitizedContext = Object.create(Object.getPrototypeOf(ctx));
  Object.defineProperties(sanitizedContext, Object.getOwnPropertyDescriptors(ctx));
  Object.defineProperty(sanitizedContext, 'pageContext', {
    configurable: true,
    enumerable: true,
    value: sanitizedPageContext,
  });

  return sanitizedContext;
}

/**
 * Installs the global `fetch` sanitizer so any late, layouts-based SharePoint
 * `_api` request (e.g. from a PnP SPFx control that re-resolved a dirty
 * `/_layouts/15` base) is rewritten to the clean `_api` URL at request time.
 *
 * The previous best-effort `require('@pnp/common')` and
 * `require('@pnp/spfx-controls-react/node_modules/@pnp/sp')` base-URL mutations
 * were removed: they reached into ESM-only / nested package paths (brittle, and
 * they reinforced dependency nesting). The `fetch` interception below is the
 * authoritative mechanism and needs no `@pnp` runtime module.
 */
export function configureLegacyPnPBaseUrl(ctx: any): void {
  const cleanWebUrl = sanitizeSharePointSiteUrl(ctx?.pageContext?.web?.absoluteUrl);
  if (!cleanWebUrl) return;

  installSharePointApiUrlFetchSanitizer();
}

const FETCH_PATCH_FLAG = '__spfxToolkitSharePointApiUrlFetchSanitizer';

/**
 * Last-resort guard for PnP controls that resolve a relative `_api` URL
 * through a dirty layouts-page base after component setup. The rewrite is
 * narrow: it only removes `/_layouts/15` when it sits immediately before
 * `/_api`.
 */
export function installSharePointApiUrlFetchSanitizer(target: any = globalThis): void {
  if (!target || target[FETCH_PATCH_FLAG] || typeof target.fetch !== 'function') {
    return;
  }

  const originalFetch = target.fetch.bind(target);

  target.fetch = (input: any, init?: any) => {
    const sanitizedInput = sanitizeFetchInput(input);
    return originalFetch(sanitizedInput, init);
  };

  target[FETCH_PATCH_FLAG] = true;
}

function sanitizeFetchInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeSharePointApiUrl(input);
  }

  if (typeof URL !== 'undefined' && input instanceof URL) {
    const sanitized = sanitizeSharePointApiUrl(input.toString());
    return sanitized === input.toString() ? input : new URL(sanitized);
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    const sanitized = sanitizeSharePointApiUrl(input.url);
    if (sanitized === input.url) {
      return input;
    }

    try {
      return new Request(sanitized, input);
    } catch {
      return input;
    }
  }

  return input;
}
