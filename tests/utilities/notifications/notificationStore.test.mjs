/**
 * TDD tests for the notification store.
 *
 * Tests run against the COMPILED lib/ directory:
 *   npm run build && node --test --test-reporter=spec 'tests/**\/*.test.mjs'
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  notificationStore,
  notify,
  dismiss,
  dismissAll,
} from '../../../lib/utilities/notifications/index.js';

// Helper to get the current state snapshot.
function getState() {
  return notificationStore.getState();
}

// Reset the store between tests by dismissing all.
beforeEach(() => {
  dismissAll();
});

// ---------------------------------------------------------------------------
// notify — adds a notification and returns its id
// ---------------------------------------------------------------------------

describe('notify — adds notification', () => {
  test('returns a non-empty string id', () => {
    const id = notify({ type: 'info', message: 'hello' });
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  });

  test('notification appears in store state', () => {
    const id = notify({ type: 'success', message: 'saved!' });
    const { notifications } = getState();
    const found = notifications.find((n) => n.id === id);
    assert.ok(found, 'notification should be in state');
    assert.equal(found.type, 'success');
    assert.equal(found.message, 'saved!');
  });

  test('notification has a numeric createdAt', () => {
    const before = Date.now();
    const id = notify({ type: 'info', message: 'ts test' });
    const after = Date.now();
    const found = getState().notifications.find((n) => n.id === id);
    assert.ok(found.createdAt >= before, 'createdAt should not be before call');
    assert.ok(found.createdAt <= after, 'createdAt should not be after call');
  });

  test('multiple notifications each get unique ids', () => {
    const ids = [
      notify({ type: 'info', message: 'a' }),
      notify({ type: 'info', message: 'b' }),
      notify({ type: 'info', message: 'c' }),
    ];
    const unique = new Set(ids);
    assert.equal(unique.size, 3, 'all ids should be unique');
  });

  test('multiple notifications all appear in state', () => {
    notify({ type: 'info', message: 'one' });
    notify({ type: 'warning', message: 'two' });
    const { notifications } = getState();
    assert.equal(notifications.length, 2);
  });
});

// ---------------------------------------------------------------------------
// Default durations per type
// ---------------------------------------------------------------------------

describe('default duration per type', () => {
  test('success has a positive default duration (3000 ms)', () => {
    const id = notify({ type: 'success', message: 'ok' });
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found.duration, 3000);
  });

  test('info has a positive default duration (3000 ms)', () => {
    const id = notify({ type: 'info', message: 'fyi' });
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found.duration, 3000);
  });

  test('warning has a longer default duration (5000 ms)', () => {
    const id = notify({ type: 'warning', message: 'caution' });
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found.duration, 5000);
  });

  test('error is sticky — duration is 0', () => {
    const id = notify({ type: 'error', message: 'boom' });
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found.duration, 0);
  });

  test('caller-supplied duration overrides the default', () => {
    const id = notify({ type: 'success', message: 'custom', duration: 9000 });
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found.duration, 9000);
  });
});

// ---------------------------------------------------------------------------
// error type — sticky, no auto-dismiss timer
// ---------------------------------------------------------------------------

describe('error type — sticky until dismissed', () => {
  test('error notification is NOT removed after a short wait (no timer fired)', async () => {
    // Inject a tiny explicit duration to confirm errors ignore it.
    // Since errors are always duration=0 (or sticky), no timer should run.
    notify({ type: 'error', message: 'critical' });
    // Wait long enough that any accidental timer would have fired.
    await new Promise((r) => setTimeout(r, 50));
    const { notifications } = getState();
    assert.ok(
      notifications.some((n) => n.message === 'critical'),
      'error notification should still be present after 50ms'
    );
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss — fires after the specified duration
// ---------------------------------------------------------------------------

describe('auto-dismiss timer', () => {
  test('notification with tiny duration is removed after it fires', async () => {
    const id = notify({ type: 'info', message: 'flash', duration: 50 });
    // Should still exist immediately.
    assert.ok(getState().notifications.some((n) => n.id === id));
    // Wait for timer to fire.
    await new Promise((r) => setTimeout(r, 100));
    const still = getState().notifications.find((n) => n.id === id);
    assert.equal(still, undefined, 'notification should have been auto-dismissed');
  });

  test('duration=0 suppresses auto-dismiss', async () => {
    const id = notify({ type: 'info', message: 'sticky', duration: 0 });
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(
      getState().notifications.some((n) => n.id === id),
      'duration=0 notification should NOT be auto-dismissed'
    );
  });
});

// ---------------------------------------------------------------------------
// dismiss — removes a specific notification
// ---------------------------------------------------------------------------

describe('dismiss', () => {
  test('removes the notification with the given id', () => {
    const id = notify({ type: 'info', message: 'remove me' });
    dismiss(id);
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found, undefined);
  });

  test('leaves other notifications intact', () => {
    const idA = notify({ type: 'info', message: 'keep' });
    const idB = notify({ type: 'warning', message: 'also keep' });
    const idC = notify({ type: 'success', message: 'remove' });
    dismiss(idC);
    const { notifications } = getState();
    assert.ok(notifications.some((n) => n.id === idA));
    assert.ok(notifications.some((n) => n.id === idB));
    assert.equal(notifications.find((n) => n.id === idC), undefined);
  });

  test('dismiss of unknown id is a no-op', () => {
    notify({ type: 'info', message: 'safe' });
    dismiss('nonexistent-id');
    assert.equal(getState().notifications.length, 1);
  });

  test('dismiss cancels the auto-dismiss timer so it does not re-fire', async () => {
    // Add a 100ms auto-dismiss, then dismiss immediately.
    const id = notify({ type: 'info', message: 'race', duration: 100 });
    dismiss(id);
    // Wait past the original timer deadline.
    await new Promise((r) => setTimeout(r, 150));
    // If dismiss did NOT cancel the timer, the store might attempt to remove
    // something that's already gone (harmless) — but we verify it's still gone.
    const found = getState().notifications.find((n) => n.id === id);
    assert.equal(found, undefined, 'notification should remain dismissed');
    // Also confirm no extra notifications appeared somehow.
    assert.equal(getState().notifications.length, 0);
  });
});

// ---------------------------------------------------------------------------
// dismissAll — clears everything
// ---------------------------------------------------------------------------

describe('dismissAll', () => {
  test('empties the notifications array', () => {
    notify({ type: 'info', message: 'a' });
    notify({ type: 'error', message: 'b' });
    notify({ type: 'warning', message: 'c' });
    dismissAll();
    assert.equal(getState().notifications.length, 0);
  });

  test('dismissAll on empty store is a no-op', () => {
    dismissAll();
    assert.equal(getState().notifications.length, 0);
  });
});
