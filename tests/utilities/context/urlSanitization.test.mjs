import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSanitizedSpfxContext,
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
});
