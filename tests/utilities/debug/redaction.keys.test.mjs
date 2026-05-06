import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  prepareForCapture,
  KEEP,
  REDACT,
  REDACTED_MARKER,
} from '../../../lib/utilities/debug/index.js';

const DEFAULT_CFG = { enabled: true, urls: 'queryAndFragment', userDisplayNames: false };

describe('redaction — opt-in behavior', () => {
  test('does not redact unless explicitly enabled', () => {
    const result = prepareForCapture(
      {
        Email: 'alice@contoso.com',
        url: 'https://contoso.sharepoint.com/sites/demo?token=abc',
      },
      { urls: 'queryAndFragment' },
      64 * 1024
    );
    assert.equal(result.value.Email, 'alice@contoso.com');
    assert.equal(result.value.url, 'https://contoso.sharepoint.com/sites/demo?token=abc');
    assert.equal(result.counters.keysByName, 0);
    assert.equal(result.counters.urlQueryRedactions, 0);
  });
});

describe('redaction — default SP-specific key list', () => {
  test('redacts email by key', () => {
    const out = prepareForCapture({ Email: 'alice@contoso.com' }, DEFAULT_CFG, 64 * 1024).value;
    assert.equal(out.Email, REDACTED_MARKER);
  });

  test('redacts loginName by key', () => {
    const out = prepareForCapture(
      { LoginName: 'i:0#.f|membership|alice@contoso.com' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out.LoginName, REDACTED_MARKER);
  });

  test('redacts upn by key', () => {
    const out = prepareForCapture(
      { UserPrincipalName: 'alice@contoso.com', UPN: 'alice@contoso.com' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out.UserPrincipalName, REDACTED_MARKER);
    assert.equal(out.UPN, REDACTED_MARKER);
  });

  test('redacts aadUserId by key', () => {
    const out = prepareForCapture(
      { aadUserId: 'guid', aadObjectId: 'guid', aadTenantId: 'guid' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out.aadUserId, REDACTED_MARKER);
    assert.equal(out.aadObjectId, REDACTED_MARKER);
    assert.equal(out.aadTenantId, REDACTED_MARKER);
  });

  test('redacts fedauth and rtfa cookie names by key', () => {
    const out = prepareForCapture(
      { FedAuth: 'cookie-value', rtFa: 'cookie-value' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out.FedAuth, REDACTED_MARKER);
    assert.equal(out.rtFa, REDACTED_MARKER);
  });

  test('redacts x-requestdigest by key', () => {
    const out = prepareForCapture(
      { 'X-RequestDigest': '0xABC,01 Jan 1970 00:00:00 -0000' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out['X-RequestDigest'], REDACTED_MARKER);
  });

  test('matches case-insensitively and as substring', () => {
    const out = prepareForCapture(
      { primaryEmailAddress: 'a@b.com', SomeAccessTokenField: 'tk' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out.primaryEmailAddress, REDACTED_MARKER);
    assert.equal(out.SomeAccessTokenField, REDACTED_MARKER);
  });

  test('keeps fields that do not match', () => {
    const out = prepareForCapture(
      { count: 5, status: 'active', firstName: 'Alice' },
      DEFAULT_CFG,
      64 * 1024
    ).value;
    assert.equal(out.count, 5);
    assert.equal(out.status, 'active');
    assert.equal(out.firstName, 'Alice');
  });
});

describe('redaction — URL handling (queryAndFragment default)', () => {
  test('redacts query string values but keeps keys', () => {
    const url = 'https://contoso.sharepoint.com/sites/hr/page.aspx?user=alice&id=123';
    const result = prepareForCapture(url, DEFAULT_CFG, 64 * 1024);
    assert.match(result.value, /user=\[redacted:url\]/);
    assert.match(result.value, /id=\[redacted:url\]/);
    assert.equal(result.counters.urlQueryRedactions, 2);
  });

  test('redacts fragment when non-empty', () => {
    const url = 'https://contoso.sharepoint.com/page.aspx#section-x';
    const result = prepareForCapture(url, DEFAULT_CFG, 64 * 1024);
    assert.match(result.value, /#\[redacted:url-fragment\]/);
    assert.equal(result.counters.urlFragmentRedactions, 1);
  });

  test('keeps origin and pathname intact', () => {
    const url = 'https://contoso.sharepoint.com/sites/hr/Lists/MyList/AllItems.aspx?id=1';
    const result = prepareForCapture(url, DEFAULT_CFG, 64 * 1024);
    assert.ok(result.value.indexOf('https://contoso.sharepoint.com/sites/hr/Lists/MyList/AllItems.aspx') === 0);
  });

  test('mode "all" replaces the entire URL', () => {
    const result = prepareForCapture(
      'https://contoso.sharepoint.com/sites/hr/page.aspx?id=1',
      { ...DEFAULT_CFG, urls: 'all' },
      64 * 1024
    );
    assert.equal(result.value, '[redacted:url]');
    assert.equal(result.counters.urlFullRedactions, 1);
  });

  test('mode "queryOnly" leaves the fragment alone', () => {
    const result = prepareForCapture(
      'https://x/page#section',
      { ...DEFAULT_CFG, urls: 'queryOnly' },
      64 * 1024
    );
    assert.match(result.value, /#section/);
  });

  test('mode "none" leaves the URL alone', () => {
    const result = prepareForCapture(
      'https://x/page?u=alice',
      { ...DEFAULT_CFG, urls: 'none' },
      64 * 1024
    );
    assert.equal(result.value, 'https://x/page?u=alice');
  });

  test('non-URL strings pass through to pattern redaction', () => {
    const result = prepareForCapture(
      'Hello',
      DEFAULT_CFG,
      64 * 1024
    );
    assert.equal(result.value, 'Hello');
  });
});

describe('redaction — value pattern redaction in strings', () => {
  test('redacts emails inside free text', () => {
    const result = prepareForCapture(
      { description: 'Contact alice@contoso.com about claim 123' },
      DEFAULT_CFG,
      64 * 1024
    );
    assert.match(result.value.description, /Contact \[redacted:email\] about claim 123/);
    assert.equal(result.counters.emails, 1);
  });

  test('redacts SSN-like values', () => {
    const result = prepareForCapture('SSN: 123-45-6789', DEFAULT_CFG, 64 * 1024);
    assert.match(result.value, /SSN: \[redacted:ssn\]/);
    assert.equal(result.counters.ssns, 1);
  });

  test('redacts credit-card-like sequences', () => {
    const result = prepareForCapture('Card: 4111 1111 1111 1111', DEFAULT_CFG, 64 * 1024);
    assert.match(result.value, /\[redacted:cc\]/);
    assert.equal(result.counters.creditCards, 1);
  });

  test('redacts Bearer tokens', () => {
    const result = prepareForCapture(
      'Authorization: Bearer abc.def.ghi.jklmnopqrstuvwxyz',
      DEFAULT_CFG,
      64 * 1024
    );
    assert.match(result.value, /\[redacted:bearer\]/);
    assert.equal(result.counters.bearerTokens, 1);
  });

  test('redacts JWT-shaped tokens (eyJ...)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signaturepart';
    const result = prepareForCapture('token=' + jwt, DEFAULT_CFG, 64 * 1024);
    assert.match(result.value, /\[redacted:jwt\]/);
    assert.equal(result.counters.bearerTokens, 1);
  });

  test('redacts SharePoint claims login strings', () => {
    const claim = 'i:0#.f|membership|alice@contoso.com';
    const result = prepareForCapture('Caller: ' + claim, DEFAULT_CFG, 64 * 1024);
    assert.match(result.value, /\[redacted:sp-claims\]/);
    assert.equal(result.counters.spClaimsLogins, 1);
  });

  test('phone numbers are kept by default', () => {
    const result = prepareForCapture('Call 415-555-1234', DEFAULT_CFG, 64 * 1024);
    assert.equal(result.value, 'Call 415-555-1234');
  });
});

describe('redaction — display names', () => {
  test('keeps DisplayName by default', () => {
    const result = prepareForCapture(
      { DisplayName: 'Alice Smith', Email: 'a@b.com' },
      DEFAULT_CFG,
      64 * 1024
    );
    assert.equal(result.value.DisplayName, 'Alice Smith');
    assert.equal(result.value.Email, REDACTED_MARKER);
  });

  test('redacts display names when userDisplayNames=true AND user-shaped', () => {
    const result = prepareForCapture(
      { DisplayName: 'Alice Smith', Email: 'a@b.com' },
      { ...DEFAULT_CFG, userDisplayNames: true },
      64 * 1024
    );
    assert.equal(result.value.DisplayName, REDACTED_MARKER);
  });

  test('does not touch Title on objects that are not user-shaped', () => {
    const result = prepareForCapture(
      { Title: 'Project Roadmap', count: 5 },
      { ...DEFAULT_CFG, userDisplayNames: true },
      64 * 1024
    );
    // No identity-ish keys → Title is treated as a regular field.
    assert.equal(result.value.Title, 'Project Roadmap');
  });
});

describe('redaction — KEEP / REDACT / replacement custom function', () => {
  test('REDACT forces redaction even when default would keep', () => {
    const result = prepareForCapture(
      { firstName: 'Alice' },
      {
        ...DEFAULT_CFG,
        custom: (path) => (path === 'firstName' ? REDACT : undefined),
      },
      64 * 1024
    );
    assert.equal(result.value.firstName, REDACTED_MARKER);
  });

  test('KEEP bypasses default redaction (un-redact a default-key match)', () => {
    const result = prepareForCapture(
      { Email: 'alice@contoso.com' },
      {
        ...DEFAULT_CFG,
        custom: (path) => (path === 'Email' ? KEEP : undefined),
      },
      64 * 1024
    );
    // KEEP bypasses default key redaction — but the value is a string that
    // still hits pattern redaction.
    assert.equal(result.value.Email, '[redacted:email]');
  });

  test('returning a replacement value uses it (and structural rules still apply)', () => {
    const result = prepareForCapture(
      { foo: 'original' },
      {
        ...DEFAULT_CFG,
        custom: (path) => (path === 'foo' ? 'replaced' : undefined),
      },
      64 * 1024
    );
    assert.equal(result.value.foo, 'replaced');
  });

  test('returning undefined falls through to default redaction', () => {
    const result = prepareForCapture(
      { Email: 'a@b.com', firstName: 'Alice' },
      {
        ...DEFAULT_CFG,
        custom: () => undefined,
      },
      64 * 1024
    );
    assert.equal(result.value.Email, REDACTED_MARKER);
    assert.equal(result.value.firstName, 'Alice');
  });

  test('custom function receives the path and defaultBehavior hint', () => {
    const seen = [];
    prepareForCapture(
      { user: { Email: 'a@b.com', firstName: 'Alice' } },
      {
        ...DEFAULT_CFG,
        custom: (path, _value, defaultBehavior) => {
          seen.push({ path, defaultBehavior });
          return undefined;
        },
      },
      64 * 1024
    );
    const entries = seen.filter((e) => e.path === 'user.Email' || e.path === 'user.firstName');
    const emailEntry = entries.find((e) => e.path === 'user.Email');
    const firstEntry = entries.find((e) => e.path === 'user.firstName');
    assert.equal(emailEntry.defaultBehavior, 'redact');
    assert.equal(firstEntry.defaultBehavior, 'keep');
  });
});

describe('redaction — capture-time finality', () => {
  test('changing config after capture does not reprocess older entries', async () => {
    const { SPDebug, debugStore } = await import('../../../lib/utilities/debug/index.js');
    SPDebug.reset();
    SPDebug.enable();
    SPDebug.info('App/X', 'first', { Email: 'a@b.com' });

    // Capture with default config — Email should be redacted.
    const captured1 = debugStore.getState().entries[0];
    assert.equal(captured1.data.Email, REDACTED_MARKER);

    // Now change config to KEEP everything via custom function.
    debugStore.getState().setConfig({
      ...debugStore.getState().config,
      redact: {
        ...debugStore.getState().config.redact,
        custom: () => KEEP,
      },
    });

    // The previously captured entry remains redacted — finality holds.
    const stillRedacted = debugStore.getState().entries[0];
    assert.equal(stillRedacted.data.Email, REDACTED_MARKER);

    SPDebug.reset();
  });

  test('the captured value is a fresh tree (does not reference originals)', () => {
    const original = { foo: 'bar', nested: { Email: 'a@b.com' } };
    const result = prepareForCapture(original, DEFAULT_CFG, 64 * 1024);
    // The returned object is a different reference.
    assert.notEqual(result.value, original);
    assert.notEqual(result.value.nested, original.nested);
    // Originals untouched.
    assert.equal(original.nested.Email, 'a@b.com');
  });
});
