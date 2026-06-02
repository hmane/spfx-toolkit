import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSanitizedSpfxContext,
  configureLegacyPnPBaseUrl,
  installSharePointApiUrlFetchSanitizer,
  sanitizeSharePointApiUrl,
  sanitizeSharePointSiteUrl,
} from '../../../lib/utilities/context/urlSanitizer.js';

describe('SPContext URL sanitization', () => {
  const cases = [
    [
      'absolute form customizer URL with query',
      'https://contoso.sharepoint.com/sites/demo/_layouts/15/SPListForm.aspx?PageType=6&ListId=%7Babc%7D',
      'https://contoso.sharepoint.com/sites/demo',
    ],
    [
      'server-relative form customizer URL with query',
      '/sites/demo/_layouts/15/SPListForm.aspx?PageType=6&ListId=%7Babc%7D',
      '/sites/demo',
    ],
    [
      'layout URL with hash',
      'https://contoso.sharepoint.com/sites/demo/_layouts/15/SPListForm.aspx#section',
      'https://contoso.sharepoint.com/sites/demo',
    ],
    [
      'clean site URL',
      'https://contoso.sharepoint.com/sites/demo',
      'https://contoso.sharepoint.com/sites/demo',
    ],
    [
      'non-layout segment is untouched',
      'https://contoso.sharepoint.com/sites/demo/_layouts/150/SPListForm.aspx?PageType=6',
      'https://contoso.sharepoint.com/sites/demo/_layouts/150/SPListForm.aspx?PageType=6',
    ],
  ];

  for (const [name, input, expected] of cases) {
    test(name, () => {
      assert.equal(sanitizeSharePointSiteUrl(input), expected);
    });
  }

  test('already-composed API URL removes layouts segment before _api only', () => {
    assert.equal(
      sanitizeSharePointApiUrl('https://contoso.sharepoint.com/sites/demo/_layouts/15/_api/v2.1/termstore/sets/example'),
      'https://contoso.sharepoint.com/sites/demo/_api/v2.1/termstore/sets/example'
    );
    assert.equal(
      sanitizeSharePointApiUrl('https://contoso.sharepoint.com/sites/demo/_layouts/15/SPListForm.aspx?PageType=6'),
      'https://contoso.sharepoint.com/sites/demo/_layouts/15/SPListForm.aspx?PageType=6'
    );
  });

  test('sanitized SPFx context proxy cleans web URL properties only', () => {
    const raw = {
      pageContext: {
        web: {
          absoluteUrl: 'https://contoso.sharepoint.com/sites/demo/_layouts/15/SPListForm.aspx?PageType=6',
          serverRelativeUrl: '/sites/demo/_layouts/15/SPListForm.aspx?PageType=6',
          title: 'Demo',
        },
        cultureInfo: {
          currentUICultureName: 'en-US',
        },
      },
      serviceScope: { id: 'scope' },
    };

    const sanitized = buildSanitizedSpfxContext(raw);

    assert.equal(sanitized.pageContext.web.absoluteUrl, 'https://contoso.sharepoint.com/sites/demo');
    assert.equal(sanitized.pageContext.web.serverRelativeUrl, '/sites/demo');
    assert.equal(sanitized.pageContext.web.title, 'Demo');
    assert.equal(sanitized.pageContext.cultureInfo.currentUICultureName, 'en-US');
    assert.equal(sanitized.serviceScope, raw.serviceScope);
  });

  test('configureLegacyPnPBaseUrl installs the fetch sanitizer (no @pnp runtime module) and rewrites dirty /_layouts/15/_api URLs', () => {
    const prevFetch = globalThis.fetch;
    const seen = [];
    globalThis.fetch = (input) => {
      seen.push(String(input));
      return Promise.resolve({ ok: true });
    };
    // Ensure not already patched by a prior test so the install actually wraps our stub.
    delete globalThis.__spfxToolkitSharePointApiUrlFetchSanitizer;
    try {
      configureLegacyPnPBaseUrl({
        pageContext: {
          web: {
            absoluteUrl: 'https://contoso.sharepoint.com/sites/demo/_layouts/15/SPListForm.aspx?PageType=6',
          },
        },
      });
      globalThis.fetch('https://contoso.sharepoint.com/sites/demo/_layouts/15/_api/web/lists');
      assert.equal(seen[0], 'https://contoso.sharepoint.com/sites/demo/_api/web/lists');
    } finally {
      globalThis.fetch = prevFetch;
      delete globalThis.__spfxToolkitSharePointApiUrlFetchSanitizer;
    }
  });

  test('fetch sanitizer rewrites late layouts-based SharePoint API requests', async () => {
    const target = {
      fetch: async (input) => input,
    };
    installSharePointApiUrlFetchSanitizer(target);

    assert.equal(
      await target.fetch('https://contoso.sharepoint.com/sites/demo/_layouts/15/_api/v2.1/termstore/sets/example'),
      'https://contoso.sharepoint.com/sites/demo/_api/v2.1/termstore/sets/example'
    );
  });
});
