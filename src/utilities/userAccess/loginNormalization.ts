/**
 * Produces a stable cache key from a login string.
 *
 * Why: PeoplePicker may return claims-format strings, plain emails, or UPNs
 * for the same identity. Cache keys must collide for the same user, so we
 * lowercase and trim. The actual API-bound LoginName comes from
 * `sp.web.ensureUser(input)` — this helper is for cache keys only.
 */
import type { LoginInput } from './types';

export function normalizeLoginForCacheKey(input: LoginInput): string {
  if (input === null || input === undefined) {
    throw new Error('Invalid login: null/undefined');
  }
  if (typeof input !== 'string') {
    throw new Error('Invalid login: not a string');
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid login: empty login');
  }
  return trimmed.toLowerCase();
}
