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
 * PnP SPFx controls v3 bundles PnP JS v2 and its controls share a mutable
 * default runtime. The v2 URL resolver prefers `sp.baseUrl` over
 * `spfxContext`, so setting a clean base URL prevents another control's raw
 * `sp.setup({ pageContext })` call from reintroducing `/_layouts/15`.
 */
export function configureLegacyPnPBaseUrl(ctx: any): void {
  const cleanWebUrl = sanitizeSharePointSiteUrl(ctx?.pageContext?.web?.absoluteUrl);
  if (!cleanWebUrl) return;

  installSharePointApiUrlFetchSanitizer();

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
