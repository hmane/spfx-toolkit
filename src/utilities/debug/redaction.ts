/**
 * SPDebug capture-time preparation: optional redaction + structured truncation.
 *
 * Redaction, when enabled, and truncation happen in a single recursive walk so we never
 * traverse a large payload twice. The walk produces a new value tree and a
 * `RedactionCounters` summary that the store accumulates for export use.
 *
 * Redaction is opt-in. When `config.enabled !== true`, values are copied and
 * truncated but not privacy-redacted. Originals are still never stored.
 *
 * See `docs/SPDebug-Requirements.md` "Security and Redaction" and
 * "Memory, Limits, and Persistence Budget".
 */

import type {
  SPDebugRedactionConfig,
  SPDebugUrlRedactionMode,
} from './SPDebugTypes';

// ----------------------------------------------------------------------------
// Public sentinels for the custom redaction function
// ----------------------------------------------------------------------------

export const KEEP: unique symbol = Symbol('SPDebugKeep');
export const REDACT: unique symbol = Symbol('SPDebugRedact');

export const REDACTED_MARKER = '[REDACTED]';

// ----------------------------------------------------------------------------
// Default key/pattern lists (spec: "Default Key Redaction" / "Value Pattern Redaction")
// ----------------------------------------------------------------------------

/**
 * Case-insensitive substring matches against object keys.
 * Mirrors `docs/SPDebug-Requirements.md` "Default Key Redaction".
 */
export const DEFAULT_REDACT_KEYS: ReadonlyArray<string> = [
  // Generic credentials
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'key',
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  // PII
  'ssn',
  'socialsecurity',
  'dob',
  // Email / login
  'email',
  'mail',
  'emailaddress',
  'loginname',
  'accountname',
  'userprincipalname',
  'upn',
  'userlogin',
  'useremail',
  'userid',
  // Microsoft identity
  'aadtenantid',
  'aaduserid',
  'aadobjectid',
  'aadgroupid',
  'sid',
  'securitytoken',
  'sessionid',
  'jsessionid',
  'msal',
  'samlassertion',
  'idtoken',
  // SharePoint auth headers / cookies
  'fedauth',
  'rtfa',
  'x-requestdigest',
];

/**
 * Display-name keys redacted only when `userDisplayNames === true` AND the
 * containing object looks user-shaped (has at least one identity-ish key).
 */
const DISPLAY_NAME_KEYS: ReadonlyArray<string> = [
  'title',
  'displayname',
  'lookupvalue',
  'name',
];

const USER_SHAPE_HINT_KEYS: ReadonlyArray<string> = [
  'email',
  'mail',
  'loginname',
  'userprincipalname',
  'upn',
  'accountname',
];

// Truncation defaults — spec: strings 4KB, plus structural caps.
const STRING_HEAD_CHARS = 4 * 1024;
const ARRAY_HEAD_ITEMS = 100;
const OBJECT_HEAD_KEYS = 50;
const MAX_DEPTH = 12;

// ----------------------------------------------------------------------------
// Counters
// ----------------------------------------------------------------------------

export interface RedactionCounters {
  keysByName: number;
  emails: number;
  spClaimsLogins: number;
  ssns: number;
  creditCards: number;
  bearerTokens: number;
  urlQueryRedactions: number;
  urlFragmentRedactions: number;
  urlFullRedactions: number;
  customApplications: number;
  truncations: number;
}

export function emptyRedactionCounters(): RedactionCounters {
  return {
    keysByName: 0,
    emails: 0,
    spClaimsLogins: 0,
    ssns: 0,
    creditCards: 0,
    bearerTokens: 0,
    urlQueryRedactions: 0,
    urlFragmentRedactions: 0,
    urlFullRedactions: 0,
    customApplications: 0,
    truncations: 0,
  };
}

export function addRedactionCounters(
  target: RedactionCounters,
  source: RedactionCounters
): void {
  target.keysByName += source.keysByName;
  target.emails += source.emails;
  target.spClaimsLogins += source.spClaimsLogins;
  target.ssns += source.ssns;
  target.creditCards += source.creditCards;
  target.bearerTokens += source.bearerTokens;
  target.urlQueryRedactions += source.urlQueryRedactions;
  target.urlFragmentRedactions += source.urlFragmentRedactions;
  target.urlFullRedactions += source.urlFullRedactions;
  target.customApplications += source.customApplications;
  target.truncations += source.truncations;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Cheap byte-size estimate of a serialized JSON-ish value.
 * Falls back to String(value) for non-serializable values.
 */
export function estimateBytes(value: unknown): number {
  if (value === undefined || value === null) return 0;
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (str === undefined) return 0;
    return str.length;
  } catch {
    return String(value).length;
  }
}

function buildKeyMatchSet(extraKeys?: string[]): string[] {
  // Lowercase. Order doesn't matter because matching is substring.
  const seen = new Set<string>();
  const result: string[] = [];
  for (const k of DEFAULT_REDACT_KEYS) {
    if (!seen.has(k)) {
      seen.add(k);
      result.push(k);
    }
  }
  if (extraKeys) {
    for (const k of extraKeys) {
      const lower = k.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(lower);
      }
    }
  }
  return result;
}

function keyMatchesRedactSet(key: string, set: string[]): boolean {
  const lower = key.toLowerCase();
  for (const candidate of set) {
    if (lower.indexOf(candidate) !== -1) return true;
  }
  return false;
}

function isUserShape(obj: Record<string, unknown>): boolean {
  for (const k of Object.keys(obj)) {
    const lower = k.toLowerCase();
    for (const hint of USER_SHAPE_HINT_KEYS) {
      if (lower.indexOf(hint) !== -1) return true;
    }
  }
  return false;
}

// ----- URL detection / redaction --------------------------------------------

const URL_PROTOCOL_RE = /^(https?|ftp|sftp|wss?|file):\/\//i;

function looksLikeUrl(s: string): boolean {
  if (!s || s.length < 8) return false;
  return URL_PROTOCOL_RE.test(s);
}

function redactUrl(
  raw: string,
  mode: SPDebugUrlRedactionMode,
  counters: RedactionCounters
): string {
  if (mode === 'none') return raw;
  if (mode === 'all') {
    counters.urlFullRedactions += 1;
    return '[redacted:url]';
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }
  // Replace each query value with the marker (keep keys for shape).
  // We build the search string by hand to avoid URL-encoding the marker square
  // brackets — readability of redacted exports matters more than strict
  // application/x-www-form-urlencoded compliance.
  let searchOut = '';
  if (parsed.search) {
    const pairs: string[] = [];
    new URLSearchParams(parsed.search).forEach((_, key) => {
      pairs.push(encodeURIComponent(key) + '=[redacted:url]');
      counters.urlQueryRedactions += 1;
    });
    if (pairs.length > 0) searchOut = '?' + pairs.join('&');
  }
  let hashOut = parsed.hash;
  if (mode === 'queryAndFragment' && parsed.hash && parsed.hash !== '#') {
    hashOut = '#[redacted:url-fragment]';
    counters.urlFragmentRedactions += 1;
  }
  // Reassemble manually so the markers don't get re-encoded by URL.toString().
  return parsed.origin + parsed.pathname + searchOut + hashOut;
}

// ----- String value pattern redaction ---------------------------------------

const SP_CLAIMS_RE = /i:0[#.][^|]*\|[^|]+\|[^\s\]"'<>]+/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._\-=/+]{8,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_\-=/+]+\b/g;
const EMAIL_RE = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
// Credit-card-like: 13–19 digits, allowing single space/dash separators.
const CC_RE = /\b(?:\d[ \-]?){12,18}\d\b/g;

function redactStringPatterns(
  value: string,
  counters: RedactionCounters
): string {
  let out = value;
  // SP claims first: they may contain '@' that would otherwise match the email
  // pattern.
  out = out.replace(SP_CLAIMS_RE, () => {
    counters.spClaimsLogins += 1;
    return '[redacted:sp-claims]';
  });
  // Bearer tokens before JWT-like blobs (Bearer wraps a JWT often).
  out = out.replace(BEARER_RE, () => {
    counters.bearerTokens += 1;
    return '[redacted:bearer]';
  });
  out = out.replace(JWT_RE, () => {
    counters.bearerTokens += 1;
    return '[redacted:jwt]';
  });
  out = out.replace(EMAIL_RE, () => {
    counters.emails += 1;
    return '[redacted:email]';
  });
  out = out.replace(SSN_RE, () => {
    counters.ssns += 1;
    return '[redacted:ssn]';
  });
  out = out.replace(CC_RE, () => {
    counters.creditCards += 1;
    return '[redacted:cc]';
  });
  return out;
}

// ----- DOM node detection ---------------------------------------------------

function isDomNode(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as { nodeType?: unknown; nodeName?: unknown; tagName?: unknown };
  return (
    typeof v.nodeType === 'number' &&
    typeof v.nodeName === 'string' &&
    typeof v.tagName === 'string'
  );
}

function summarizeDomNode(value: unknown): string {
  const v = value as {
    tagName?: string;
    id?: string;
    className?: string;
  };
  const tag = (v.tagName || 'NODE').toLowerCase();
  const id = v.id ? '#' + v.id : '';
  const cls =
    typeof v.className === 'string' && v.className.length > 0
      ? '.' + v.className.split(/\s+/).filter(Boolean).join('.')
      : '';
  return `[HTMLElement ${tag}${id}${cls}]`;
}

// ----- Error normalization --------------------------------------------------

function normalizeError(err: Error): { name: string; message: string; stack?: string } {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

// ----------------------------------------------------------------------------
// Main pipeline
// ----------------------------------------------------------------------------

export interface PreparedPayload {
  value: unknown;
  bytes: number;
  truncated: boolean;
  counters: RedactionCounters;
}

interface WalkContext {
  config: SPDebugRedactionConfig | undefined;
  redactionEnabled: boolean;
  urlMode: SPDebugUrlRedactionMode;
  redactDisplayNames: boolean;
  keySet: string[];
  counters: RedactionCounters;
  visited: WeakSet<object>;
  truncated: { flag: boolean };
}

function lastSegment(path: string): string {
  if (!path) return '';
  const dot = path.lastIndexOf('.');
  const bracket = path.lastIndexOf('[');
  const cut = Math.max(dot, bracket);
  const tail = cut >= 0 ? path.slice(cut + 1) : path;
  return tail.replace(/\[\d+\]$/, '');
}

/**
 * Walk a value at a given path. Invokes the custom function (if any) FIRST so
 * the user can override or augment default behavior, then falls through to
 * default key-based redaction (when the path's last segment matches a default
 * key) and finally to the structural walker.
 *
 * `userShapeRedact`: when true, the parent object was user-shaped and the
 * caller wants display-name keys redacted at this path's last segment.
 */
function walk(
  value: unknown,
  path: string,
  depth: number,
  ctx: WalkContext,
  userShapeRedact: boolean
): unknown {
  const lastKey = lastSegment(path);
  const matchedByKey =
    ctx.redactionEnabled && lastKey ? keyMatchesRedactSet(lastKey, ctx.keySet) : false;
  const matchedByDisplayName =
    ctx.redactionEnabled && userShapeRedact && lastKey
      ? DISPLAY_NAME_KEYS.indexOf(lastKey.toLowerCase()) !== -1
      : false;
  const defaultRedact = matchedByKey || matchedByDisplayName;

  // 1. Custom function first.
  if (ctx.redactionEnabled && ctx.config && typeof ctx.config.custom === 'function') {
    const r = ctx.config.custom(path, value, defaultRedact ? 'redact' : 'keep');
    if (r !== undefined) {
      ctx.counters.customApplications += 1;
      if (r === REDACT) {
        ctx.counters.keysByName += 1;
        return REDACTED_MARKER;
      }
      if (r !== KEEP) {
        // Replacement value — walk it structurally so truncation/pattern still
        // apply, but do NOT re-invoke the custom function for this node.
        return walkStructural(r, path, depth, ctx);
      }
      // KEEP — bypass default key/display-name redaction for THIS node, still
      // walk structurally so truncation/pattern apply.
      return walkStructural(value, path, depth, ctx);
    }
  }

  // 2. No custom result — apply default redaction.
  if (defaultRedact) {
    ctx.counters.keysByName += 1;
    return REDACTED_MARKER;
  }

  // 3. Walk structurally.
  return walkStructural(value, path, depth, ctx);
}

function walkStructural(
  value: unknown,
  path: string,
  depth: number,
  ctx: WalkContext
): unknown {
  if (depth > MAX_DEPTH) {
    ctx.truncated.flag = true;
    ctx.counters.truncations += 1;
    return '[truncated: max depth]';
  }

  if (value === null || value === undefined) return value;

  // Primitives
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return value.toString() + 'n';
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') {
    const fn = value as { name?: string };
    return fn.name ? `[Function ${fn.name}]` : '[Function]';
  }

  // Strings: URL detection first; otherwise pattern redaction; then string
  // truncation.
  if (typeof value === 'string') {
    let out: string;
    if (ctx.redactionEnabled && looksLikeUrl(value)) {
      out = redactUrl(value, ctx.urlMode, ctx.counters);
    } else if (ctx.redactionEnabled) {
      out = redactStringPatterns(value, ctx.counters);
    } else {
      out = value;
    }
    if (out.length > STRING_HEAD_CHARS) {
      const omitted = out.length - STRING_HEAD_CHARS;
      out = out.slice(0, STRING_HEAD_CHARS) + ` ... [truncated ${omitted} chars]`;
      ctx.truncated.flag = true;
      ctx.counters.truncations += 1;
    }
    return out;
  }

  // Errors normalize before circular check (Error instances may have non-enumerable
  // self-referential properties on some platforms).
  if (value instanceof Error) {
    return walkStructural(normalizeError(value), path, depth + 1, ctx);
  }

  // DOM nodes
  if (isDomNode(value)) {
    return summarizeDomNode(value);
  }

  // Circular reference detection (only for objects/arrays)
  if (typeof value === 'object') {
    if (ctx.visited.has(value as object)) {
      return '[Circular]';
    }
    ctx.visited.add(value as object);
  }

  // Arrays
  if (Array.isArray(value)) {
    const head = value.slice(0, ARRAY_HEAD_ITEMS).map((item, i) =>
      walk(item, path ? `${path}[${i}]` : `[${i}]`, depth + 1, ctx, /*userShapeRedact*/ false)
    );
    if (value.length > ARRAY_HEAD_ITEMS) {
      const omitted = value.length - ARRAY_HEAD_ITEMS;
      head.push(`... ${omitted} more items`);
      ctx.truncated.flag = true;
      ctx.counters.truncations += 1;
    }
    return head;
  }

  // Plain objects
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const headKeys = keys.slice(0, OBJECT_HEAD_KEYS);
    const userShape = ctx.redactionEnabled && ctx.redactDisplayNames && isUserShape(obj);

    const out: Record<string, unknown> = {};
    for (const k of headKeys) {
      const subPath = path ? `${path}.${k}` : k;
      out[k] = walk(obj[k], subPath, depth + 1, ctx, userShape);
    }
    if (keys.length > OBJECT_HEAD_KEYS) {
      const omitted = keys.length - OBJECT_HEAD_KEYS;
      out['…'] = `${omitted} more keys`;
      ctx.truncated.flag = true;
      ctx.counters.truncations += 1;
    }
    return out;
  }

  return value;
}

/**
 * Walk a value through the optional-redaction + truncation pipeline at capture time.
 * Returns a fresh value tree that can be safely stored. Originals are not
 * referenced from the returned value.
 *
 * Spec: "Capture-Time Finality" — this is the only path values cross into the
 * runtime.
 */
export function prepareForCapture(
  value: unknown,
  config: SPDebugRedactionConfig | undefined,
  maxPayloadBytes: number
): PreparedPayload {
  const counters = emptyRedactionCounters();
  const redactionEnabled = config?.enabled === true;
  const ctx: WalkContext = {
    config,
    redactionEnabled,
    urlMode: redactionEnabled ? config?.urls ?? 'queryAndFragment' : 'none',
    redactDisplayNames: redactionEnabled && config?.userDisplayNames === true,
    keySet: redactionEnabled ? buildKeyMatchSet(config?.keys) : [],
    counters,
    visited: new WeakSet<object>(),
    truncated: { flag: false },
  };

  let prepared = walk(value, '', 0, ctx, /*userShapeRedact*/ false);
  let bytes = estimateBytes(prepared);

  // Final byte cap. Per-element truncation usually keeps us well under, but a
  // pathological mix of medium-sized items could still exceed. Replace with a
  // top-level marker so the byte budget is respected.
  if (bytes > maxPayloadBytes) {
    prepared = `[truncated: payload exceeded ${maxPayloadBytes} bytes (~${bytes} bytes after preparation)]`;
    bytes = (prepared as string).length;
    ctx.truncated.flag = true;
    counters.truncations += 1;
  }

  return {
    value: prepared,
    bytes,
    truncated: ctx.truncated.flag,
    counters,
  };
}

/**
 * Convenience wrapper that returns only the prepared value, dropping the
 * counters and `truncated` flag. Prefer `prepareForCapture` for new call sites
 * — it gives the runtime visibility into how much capture-time work was done.
 */
export function redactValue(
  value: unknown,
  config: SPDebugRedactionConfig | undefined,
  maxPayloadBytes: number = 64 * 1024
): unknown {
  return prepareForCapture(value, config, maxPayloadBytes).value;
}
