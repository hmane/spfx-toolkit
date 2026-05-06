/**
 * SPDebug capture-time truncation.
 *
 * Structured truncation is implemented in `redaction.ts` as part of a single-walk
 * `prepareForCapture` pipeline so we never traverse a large payload twice.
 * This module exposes a thin wrapper for callers that only need byte-cap
 * truncation without redaction (e.g. the persistence layer when stripping
 * already-redacted entries before write).
 *
 * Prefer `prepareForCapture` directly when redaction also matters.
 *
 * See `docs/SPDebug-Requirements.md` "Memory, Limits, and Persistence Budget".
 */

import { prepareForCapture } from './redaction';

export interface TruncationResult {
  value: unknown;
  bytes: number;
  truncated: boolean;
}

export function truncatePayload(value: unknown, maxPayloadBytes: number): TruncationResult {
  const result = prepareForCapture(value, undefined, maxPayloadBytes);
  return {
    value: result.value,
    bytes: result.bytes,
    truncated: result.truncated,
  };
}
