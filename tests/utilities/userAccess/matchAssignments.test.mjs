/**
 * Tests for matchAssignments — D1 hardening
 *
 * Verifies that:
 *  - PrincipalType 1 (user) assignments are confirmed-matched with principalKind='user'.
 *  - PrincipalType 8 (SP group) assignments are confirmed-matched with principalKind='spGroup'.
 *  - PrincipalType 4 (Entra/AD security group) assignments are surfaced as
 *    membershipUnverified=true / principalKind='securityGroupOrClaim'.
 *  - "Everyone" / "Everyone except external users" claim assignments are surfaced.
 *  - Non-matching type-1/type-8 principals are NOT included.
 *  - Unverified sources do NOT contribute to permission-level derivation.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('module');
const origLoad = Module._load;

// Stub SPContext so the module loads without a real SP environment
const loggedInfos = [];
const spContextStub = {
  sp: {},
  logger: {
    warn: () => {},
    error: () => {},
    info: (...args) => { loggedInfos.push(args); },
    debug: () => {},
  },
};

Module._load = function (request, parent, isMain) {
  if (request.startsWith('@microsoft/')) return {};
  if (request === '../context') return { SPContext: spContextStub };
  return origLoad.apply(this, arguments);
};

globalThis.window = globalThis.window || globalThis;

const { matchAssignments, buildDirectListPermission } = require('../../../lib/utilities/userAccess/userAccessService.js');

// ─── fixtures ────────────────────────────────────────────────────────────────

const user = { id: 42, loginName: 'i:0#.f|membership|alice@contoso.com', title: 'Alice' };
const groupIds = new Set([10, 20]); // user is a member of SP groups 10 and 20

/** A minimal role-definition binding */
function roleDef(name = 'Read') {
  return [{ Id: 1073741826, Name: name, Hidden: false }];
}

function makeAssignment(principalType, id, title, loginName) {
  return {
    Member: { PrincipalType: principalType, Id: id, Title: title, LoginName: loginName ?? '' },
    RoleDefinitionBindings: roleDef(),
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('matchAssignments — D1 principal surfacing', () => {
  before(() => { loggedInfos.length = 0; });

  test('type-1 user assignment: matched when Id === user.id, principalKind=user, not unverified', () => {
    const assignments = [makeAssignment(1, 42, 'Alice', user.loginName)];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 1);
    assert.equal(result[0].principalKind, 'user');
    assert.equal(result[0].membershipUnverified, false);
  });

  test('type-1 user assignment: NOT matched when Id !== user.id', () => {
    const assignments = [makeAssignment(1, 99, 'Bob', 'i:0#.f|membership|bob@contoso.com')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 0, 'should not match a different user');
  });

  test('type-8 SP group assignment: matched when groupId in groupIds, principalKind=spGroup, not unverified', () => {
    const assignments = [makeAssignment(8, 10, 'Members', 'c:0t.c|tenant|members')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 1);
    assert.equal(result[0].principalKind, 'spGroup');
    assert.equal(result[0].membershipUnverified, false);
  });

  test('type-8 SP group assignment: NOT matched when groupId NOT in groupIds', () => {
    const assignments = [makeAssignment(8, 99, 'Owners', 'c:0t.c|tenant|owners')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 0, 'user is not in group 99');
  });

  test('type-4 Entra security group: surfaced as membershipUnverified=true, principalKind=securityGroupOrClaim', () => {
    const assignments = [makeAssignment(4, 555, 'HR Security Group', 'c:0+.w|s-1-5-21-...')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 1, 'type-4 principal should be included');
    assert.equal(result[0].principalKind, 'securityGroupOrClaim');
    assert.equal(result[0].membershipUnverified, true);
  });

  test('Everyone claim (by Title): surfaced as membershipUnverified=true', () => {
    const assignments = [makeAssignment(4, 1, 'Everyone', 'c:0(.s|true')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 1);
    assert.equal(result[0].principalKind, 'securityGroupOrClaim');
    assert.equal(result[0].membershipUnverified, true);
  });

  test('Everyone except external users claim (by Title): surfaced as membershipUnverified=true', () => {
    const assignments = [makeAssignment(4, 2, 'Everyone except external users', 'c:0-.f|rolemanager|spo-grid-all-users/tenant-id')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 1);
    assert.equal(result[0].principalKind, 'securityGroupOrClaim');
    assert.equal(result[0].membershipUnverified, true);
  });

  test('spo-grid-all-users in LoginName: surfaced as membershipUnverified=true', () => {
    const assignments = [makeAssignment(4, 3, 'All Users', 'c:0(.s|spo-grid-all-users/00000000-dead-beef-0000-000000000000')];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 1);
    assert.equal(result[0].membershipUnverified, true);
  });

  test('mixed: returns confirmed + unverified, correct count and kinds', () => {
    const assignments = [
      makeAssignment(1, 42,  'Alice',           user.loginName),              // matched user
      makeAssignment(8, 10,  'Members',          'c:0t.c|tenant|members'),    // matched group
      makeAssignment(8, 99,  'Owners',           'c:0t.c|tenant|owners'),     // NOT in groupIds
      makeAssignment(4, 555, 'HR Sec Group',     'c:0+.w|s-1-5-21-...'),     // type-4 unverified
      makeAssignment(4, 1,   'Everyone',         'c:0(.s|true'),              // Everyone unverified
    ];
    const result = matchAssignments(assignments, user, groupIds);
    assert.equal(result.length, 4, 'user + group-10 + type-4 + Everyone = 4');

    const kinds = result.map(r => r.principalKind);
    assert.ok(kinds.includes('user'), 'should include user match');
    assert.ok(kinds.includes('spGroup'), 'should include spGroup match');
    const unverified = result.filter(r => r.membershipUnverified);
    assert.equal(unverified.length, 2, 'type-4 + Everyone are unverified');
  });

  test('logger.info is called for unverified sources', () => {
    loggedInfos.length = 0;
    const assignments = [
      makeAssignment(4, 555, 'HR Group', 'c:0+.w|s-1-5-21-...'),
      makeAssignment(4, 1,   'Everyone', 'c:0(.s|true'),
    ];
    matchAssignments(assignments, user, groupIds);
    assert.ok(loggedInfos.length >= 2, `expected at least 2 logger.info calls, got ${loggedInfos.length}`);
  });
});

// ─── buildDirectListPermission propagation tests ─────────────────────────────

const mockList = { id: 'list-guid-1', title: 'Documents', hidden: false };

function makeMatchedAssignment(principalType, id, title, principalKind, membershipUnverified) {
  return {
    raw: {
      Member: { PrincipalType: principalType, Id: id, Title: title, LoginName: '' },
      RoleDefinitionBindings: [{ Id: 1073741826, Name: 'Read', Hidden: false }],
    },
    principalKind,
    membershipUnverified,
  };
}

describe('buildDirectListPermission — unverified flag propagation', () => {
  test('confirmed direct (type-1 user) assignment: membershipUnverified absent, principalKind=user', () => {
    const matched = makeMatchedAssignment(1, 42, 'Alice', 'user', false);
    const result = buildDirectListPermission(mockList, matched, user);
    assert.strictEqual(result.source, 'Direct');
    assert.strictEqual(result.principalKind, 'user');
    assert.strictEqual(result.membershipUnverified, undefined,
      'confirmed user match must NOT carry membershipUnverified');
  });

  test('confirmed SP-group (type-8) assignment: membershipUnverified absent, principalKind=spGroup', () => {
    const matched = makeMatchedAssignment(8, 10, 'Members', 'spGroup', false);
    const result = buildDirectListPermission(mockList, matched, user);
    assert.deepStrictEqual(result.source, { viaGroupId: 10, viaGroupTitle: 'Members' });
    assert.strictEqual(result.principalKind, 'spGroup');
    assert.strictEqual(result.membershipUnverified, undefined,
      'confirmed SP-group match must NOT carry membershipUnverified');
  });

  test('type-4 security group (unverified): membershipUnverified=true propagated', () => {
    const matched = makeMatchedAssignment(4, 555, 'HR Sec Group', 'securityGroupOrClaim', true);
    const result = buildDirectListPermission(mockList, matched, user);
    assert.deepStrictEqual(result.source, { viaGroupId: 555, viaGroupTitle: 'HR Sec Group' });
    assert.strictEqual(result.principalKind, 'securityGroupOrClaim');
    assert.strictEqual(result.membershipUnverified, true,
      'type-4 unverified match MUST carry membershipUnverified=true');
  });

  test('Everyone claim (unverified): membershipUnverified=true propagated', () => {
    const matched = makeMatchedAssignment(4, 1, 'Everyone', 'securityGroupOrClaim', true);
    const result = buildDirectListPermission(mockList, matched, user);
    assert.strictEqual(result.membershipUnverified, true,
      'Everyone claim MUST carry membershipUnverified=true');
    assert.strictEqual(result.principalKind, 'securityGroupOrClaim');
  });

  test('permissionLevel is correctly derived for unverified entries', () => {
    const matched = makeMatchedAssignment(4, 1, 'Everyone', 'securityGroupOrClaim', true);
    const result = buildDirectListPermission(mockList, matched, user);
    assert.strictEqual(result.permissionLevel, 'Visitor',
      'Read role should map to Visitor regardless of unverified flag');
  });
});
