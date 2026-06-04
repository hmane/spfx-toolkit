/**
 * Tests for CamlBuilder
 *
 * TDD — written BEFORE implementation. All tests are expected to FAIL until
 * CamlBuilder is implemented in src/utilities/camlBuilder/ and compiled to lib/.
 *
 * Run: node --test --test-reporter=spec 'tests/utilities/camlBuilder/*.test.mjs'
 * (after `npm run build`)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CamlBuilder } = require('../../../lib/utilities/camlBuilder/index.js');

// ---------------------------------------------------------------------------
// Helper: extract the inner XML of a given tag from the built CAML string.
// We parse structurally rather than using a full XML parser to stay zero-dep.
// ---------------------------------------------------------------------------
function innerXml(xml, tag) {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  const end = xml.lastIndexOf(close);
  if (start === -1 || end === -1) return null;
  return xml.slice(start + open.length, end);
}

function hasTag(xml, tag) {
  return xml.includes(`<${tag}`) || xml.includes(`</${tag}>`);
}

// ---------------------------------------------------------------------------
// SECTION 1: Single-condition operators
// ---------------------------------------------------------------------------
describe('CamlBuilder – single conditions', () => {

  test('eq: emits <Eq> with FieldRef and Value Type="Text"', () => {
    const xml = CamlBuilder.where().field('Status').eq('Active').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where, 'Expected <Where> element');
    assert.ok(where.includes('<Eq>'), 'Expected <Eq>');
    assert.ok(where.includes("<FieldRef Name=\"Status\" />"), 'Expected FieldRef Name="Status"');
    assert.ok(where.includes('<Value Type="Text">Active</Value>'), 'Expected Value Type Text');
  });

  test('neq: emits <Neq>', () => {
    const xml = CamlBuilder.where().field('Status').neq('Completed').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Neq>'), 'Expected <Neq>');
    assert.ok(where.includes('<Value Type="Text">Completed</Value>'));
  });

  test('lt: emits <Lt>', () => {
    const xml = CamlBuilder.where().field('Priority', 'Number').lt('5').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Lt>'), 'Expected <Lt>');
    assert.ok(where.includes('<Value Type="Number">5</Value>'));
  });

  test('lte: emits <Leq>', () => {
    const xml = CamlBuilder.where().field('Priority', 'Number').lte('10').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Leq>'), 'Expected <Leq>');
  });

  test('gt: emits <Gt>', () => {
    const xml = CamlBuilder.where().field('Score', 'Number').gt('50').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Gt>'), 'Expected <Gt>');
  });

  test('gte: emits <Geq>', () => {
    const xml = CamlBuilder.where().field('Score', 'Number').gte('0').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Geq>'), 'Expected <Geq>');
  });

  test('contains: emits <Contains>', () => {
    const xml = CamlBuilder.where().field('Title').contains('Budget').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Contains>'), 'Expected <Contains>');
    assert.ok(where.includes('<Value Type="Text">Budget</Value>'));
  });

  test('includes: emits <Includes> for multi-value fields', () => {
    const xml = CamlBuilder.where().field('Tags', 'MultiChoice').includes('Legal').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Includes><FieldRef Name="Tags" /><Value Type="MultiChoice">Legal</Value></Includes>'
    );
  });

  test('notIncludes: emits <NotIncludes> for multi-value fields', () => {
    const xml = CamlBuilder.where().field('Tags', 'MultiChoice').notIncludes('Closed').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<NotIncludes><FieldRef Name="Tags" /><Value Type="MultiChoice">Closed</Value></NotIncludes>'
    );
  });

  test('beginsWith: emits <BeginsWith>', () => {
    const xml = CamlBuilder.where().field('Title').beginsWith('Q1').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<BeginsWith>'), 'Expected <BeginsWith>');
  });

  test('isNull: emits <IsNull> with no <Value>', () => {
    const xml = CamlBuilder.where().field('AssignedTo').isNull().build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<IsNull>'), 'Expected <IsNull>');
    assert.ok(!where.includes('<Value'), 'IsNull must not contain <Value>');
  });

  test('isNotNull: emits <IsNotNull> with no <Value>', () => {
    const xml = CamlBuilder.where().field('AssignedTo').isNotNull().build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<IsNotNull>'), 'Expected <IsNotNull>');
    assert.ok(!where.includes('<Value'), 'IsNotNull must not contain <Value>');
  });

  test('DateTime type propagates to Value Type attribute', () => {
    const xml = CamlBuilder.where().field('DueDate', 'DateTime').lt('2026-01-01').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Value Type="DateTime">2026-01-01</Value>'), 'Expected DateTime value');
  });

  test('Number field type propagates to Value', () => {
    const xml = CamlBuilder.where().field('Amount', 'Number').gte('100').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Value Type="Number">100</Value>'));
  });

  test('Boolean field type', () => {
    const xml = CamlBuilder.where().field('IsActive', 'Boolean').eq('1').build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Value Type="Boolean">1</Value>'));
  });

  test('Boolean field accepts true and renders SharePoint boolean 1', () => {
    const xml = CamlBuilder.where().field('IsActive', 'Boolean').eq(true).build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Eq><FieldRef Name="IsActive" /><Value Type="Boolean">1</Value></Eq>'
    );
  });

  test('Boolean field accepts false and renders SharePoint boolean 0', () => {
    const xml = CamlBuilder.where().field('IsActive', 'Boolean').eq(false).build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Eq><FieldRef Name="IsActive" /><Value Type="Boolean">0</Value></Eq>'
    );
  });

  test('Lookup field type', () => {
    const xml = CamlBuilder.where().field('Category', 'Lookup').eq('3').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Eq><FieldRef Name="Category" LookupId="TRUE" /><Value Type="Lookup">3</Value></Eq>'
    );
  });

  test('Lookup field type applies LookupId="TRUE" across binary operators', () => {
    const xml = CamlBuilder.where().field('Department', 'Lookup').neq('7').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Neq><FieldRef Name="Department" LookupId="TRUE" /><Value Type="Lookup">7</Value></Neq>'
    );
  });

  test('LookupMulti field type is supported and uses LookupId="TRUE"', () => {
    const xml = CamlBuilder.where().field('Departments', 'LookupMulti').contains('7').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Contains><FieldRef Name="Departments" LookupId="TRUE" /><Value Type="LookupMulti">7</Value></Contains>'
    );
  });

  test('TaxonomyFieldType uses LookupId="TRUE" and Integer WssId values', () => {
    const xml = CamlBuilder.where().field('Topic', 'TaxonomyFieldType').eq('42').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Eq><FieldRef Name="Topic" LookupId="TRUE" /><Value Type="Integer">42</Value></Eq>'
    );
  });

  test('TaxonomyFieldTypeMulti uses LookupId="TRUE" and Integer WssId values', () => {
    const xml = CamlBuilder.where().field('Topics', 'TaxonomyFieldTypeMulti').includes(42).build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Includes><FieldRef Name="Topics" LookupId="TRUE" /><Value Type="Integer">42</Value></Includes>'
    );
  });

  test('LookupMulti includes uses LookupId="TRUE" for membership checks', () => {
    const xml = CamlBuilder.where().field('Departments', 'LookupMulti').includes('7').build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Includes><FieldRef Name="Departments" LookupId="TRUE" /><Value Type="LookupMulti">7</Value></Includes>'
    );
  });

  test('UserMulti includes supports current user membership checks', () => {
    const xml = CamlBuilder.where().field('Approvers', 'UserMulti').includes({ userId: true }).build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Includes><FieldRef Name="Approvers" LookupId="TRUE" /><Value Type="Integer"><UserID /></Value></Includes>'
    );
  });

  test('typed unary operators preserve LookupId="TRUE" on lookup-like fields', () => {
    const xml = CamlBuilder.where().field('Topics', 'TaxonomyFieldTypeMulti').isNotNull().build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<IsNotNull><FieldRef Name="Topics" LookupId="TRUE" /></IsNotNull>'
    );
  });

  test('Currency and URL field types pass through as normal values', () => {
    const currencyXml = CamlBuilder.where().field('Budget', 'Currency').gte(1000).build();
    const urlXml = CamlBuilder.where().field('Website', 'URL').contains('contoso').build();

    assert.equal(
      innerXml(currencyXml, 'Where'),
      '<Geq><FieldRef Name="Budget" /><Value Type="Currency">1000</Value></Geq>'
    );
    assert.equal(
      innerXml(urlXml, 'Where'),
      '<Contains><FieldRef Name="Website" /><Value Type="URL">contoso</Value></Contains>'
    );
  });

  test('document and system field types pass through as normal values', () => {
    const fileXml = CamlBuilder.where().field('FileLeafRef', 'File').beginsWith('Q1').build();
    const contentTypeXml = CamlBuilder.where().field('ContentTypeId', 'ContentTypeId').beginsWith('0x0101').build();
    const attachmentsXml = CamlBuilder.where().field('Attachments', 'Attachments').eq(true).build();
    const modStatXml = CamlBuilder.where().field('_ModerationStatus', 'ModStat').eq(0).build();

    assert.equal(
      innerXml(fileXml, 'Where'),
      '<BeginsWith><FieldRef Name="FileLeafRef" /><Value Type="File">Q1</Value></BeginsWith>'
    );
    assert.equal(
      innerXml(contentTypeXml, 'Where'),
      '<BeginsWith><FieldRef Name="ContentTypeId" /><Value Type="ContentTypeId">0x0101</Value></BeginsWith>'
    );
    assert.equal(
      innerXml(attachmentsXml, 'Where'),
      '<Eq><FieldRef Name="Attachments" /><Value Type="Attachments">1</Value></Eq>'
    );
    assert.equal(
      innerXml(modStatXml, 'Where'),
      '<Eq><FieldRef Name="_ModerationStatus" /><Value Type="ModStat">0</Value></Eq>'
    );
  });

  test('calculated and computed field types pass through as normal values', () => {
    const calculatedXml = CamlBuilder.where().field('Total', 'Calculated').eq('100').build();
    const computedXml = CamlBuilder.where().field('LinkTitle', 'Computed').contains('Project').build();

    assert.equal(
      innerXml(calculatedXml, 'Where'),
      '<Eq><FieldRef Name="Total" /><Value Type="Calculated">100</Value></Eq>'
    );
    assert.equal(
      innerXml(computedXml, 'Where'),
      '<Contains><FieldRef Name="LinkTitle" /><Value Type="Computed">Project</Value></Contains>'
    );
  });
});

// ---------------------------------------------------------------------------
// SECTION 2: Logical joins (AND / OR)
// ---------------------------------------------------------------------------
describe('CamlBuilder – logical joins', () => {

  test('2-condition AND wraps in single <And>', () => {
    const xml = CamlBuilder
      .where()
      .field('Status').eq('Active')
      .and()
      .field('Priority', 'Number').gt('3')
      .build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<And>'), 'Expected <And>');
    assert.ok(where.includes('<Eq>'), 'Expected <Eq> inside And');
    assert.ok(where.includes('<Gt>'), 'Expected <Gt> inside And');
  });

  test('2-condition OR wraps in single <Or>', () => {
    const xml = CamlBuilder
      .where()
      .field('Status').eq('Active')
      .or()
      .field('Status').eq('Pending')
      .build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.includes('<Or>'), 'Expected <Or>');
  });

  test('3-condition AND nests as left-folded binary <And>', () => {
    // Expected structure: <And><And><A><B></And><C></And>
    // i.e. left-fold: ((A AND B) AND C)
    const xml = CamlBuilder
      .where()
      .field('Status').eq('Active')
      .and()
      .field('Priority', 'Number').gt('3')
      .and()
      .field('Category').eq('HR')
      .build();
    const where = innerXml(xml, 'Where');

    // Count <And> occurrences — should be 2 for 3 conditions
    const andCount = (where.match(/<And>/g) || []).length;
    assert.equal(andCount, 2, `Expected 2 <And> tags for 3 conditions, got ${andCount}`);

    // The outer And should contain an inner And — left-fold pattern
    assert.ok(
      where.match(/<And>.*<And>/s),
      'Expected outer <And> containing inner <And> (left-fold)'
    );
  });

  test('3-condition OR nests as left-folded binary <Or>', () => {
    const xml = CamlBuilder
      .where()
      .field('A').eq('1')
      .or()
      .field('B').eq('2')
      .or()
      .field('C').eq('3')
      .build();
    const where = innerXml(xml, 'Where');
    const orCount = (where.match(/<Or>/g) || []).length;
    assert.equal(orCount, 2, `Expected 2 <Or> tags for 3 conditions, got ${orCount}`);
  });

  test('mixed AND then OR nests correctly', () => {
    // a AND b OR c → (a AND b) OR c
    const xml = CamlBuilder
      .where()
      .field('Status').eq('Active')
      .and()
      .field('Priority', 'Number').gt('3')
      .or()
      .field('Category').eq('Urgent')
      .build();
    const where = innerXml(xml, 'Where');
    // Outer element should be <Or>, containing the inner <And>
    assert.ok(where.startsWith('<Or>'), `Expected <Or> as outermost element, got: ${where.substring(0, 30)}`);
    assert.ok(where.includes('<And>'), 'Expected <And> nested within <Or>');
  });

  test('mixed OR then AND nests correctly', () => {
    // a OR b AND c → (a OR b) AND c
    const xml = CamlBuilder
      .where()
      .field('Status').eq('Active')
      .or()
      .field('Status').eq('Pending')
      .and()
      .field('Priority', 'Number').gt('1')
      .build();
    const where = innerXml(xml, 'Where');
    assert.ok(where.startsWith('<And>'), `Expected <And> as outermost element, got: ${where.substring(0, 30)}`);
    assert.ok(where.includes('<Or>'), 'Expected <Or> nested within <And>');
  });
});

// ---------------------------------------------------------------------------
// SECTION 3: OrderBy and RowLimit
// ---------------------------------------------------------------------------
describe('CamlBuilder – orderBy and rowLimit', () => {

  test('orderBy single field ascending (default)', () => {
    const xml = CamlBuilder.where().field('Title').eq('Test').orderBy('Title').build();
    const query = innerXml(xml, 'Query');
    assert.ok(query, 'Expected <Query> element');
    assert.ok(query.includes('<OrderBy>'), 'Expected <OrderBy>');
    assert.ok(query.includes('<FieldRef Name="Title" Ascending="TRUE" />'), 'Expected ascending FieldRef');
  });

  test('orderBy single field descending', () => {
    const xml = CamlBuilder.where().field('Modified', 'DateTime').lt('2026-01-01').orderBy('Modified', false).build();
    const query = innerXml(xml, 'Query');
    assert.ok(query.includes('<FieldRef Name="Modified" Ascending="FALSE" />'), 'Expected descending FieldRef');
  });

  test('multiple orderBy calls append FieldRefs', () => {
    const xml = CamlBuilder
      .where()
      .field('Status').eq('Active')
      .orderBy('Priority', false)
      .orderBy('Title', true)
      .build();
    const query = innerXml(xml, 'Query');
    assert.ok(query.includes('<FieldRef Name="Priority" Ascending="FALSE" />'));
    assert.ok(query.includes('<FieldRef Name="Title" Ascending="TRUE" />'));
    // Both should be inside one <OrderBy> block
    const orderByContent = innerXml(xml, 'OrderBy');
    assert.ok(orderByContent.includes('Priority'));
    assert.ok(orderByContent.includes('Title'));
  });

  test('rowLimit emits <RowLimit> inside <View>', () => {
    const xml = CamlBuilder.where().field('Status').eq('Active').rowLimit(50).build();
    // RowLimit is inside <View>, outside <Query>
    const view = innerXml(xml, 'View');
    assert.ok(view.includes('<RowLimit>50</RowLimit>'), `Expected <RowLimit>50</RowLimit> in view: ${view}`);
    // It must NOT be inside <Query>
    const query = innerXml(xml, 'Query');
    assert.ok(!query.includes('<RowLimit>'), 'RowLimit must not be inside Query');
  });

  test('orderBy is inside <Query>, not outside', () => {
    const xml = CamlBuilder.where().field('Title').eq('X').orderBy('Title').build();
    const query = innerXml(xml, 'Query');
    assert.ok(query.includes('<OrderBy>'), 'OrderBy must be inside Query');
  });

  test('rowLimit rejects zero, negative, and fractional values', () => {
    assert.throws(() => CamlBuilder.all().rowLimit(0), /rowLimit|positive integer/i);
    assert.throws(() => CamlBuilder.all().rowLimit(-1), /rowLimit|positive integer/i);
    assert.throws(() => CamlBuilder.all().rowLimit(1.5), /rowLimit|positive integer/i);
  });
});

// ---------------------------------------------------------------------------
// SECTION 4: all() — no Where clause
// ---------------------------------------------------------------------------
describe('CamlBuilder – all()', () => {

  test('all() produces no <Where>', () => {
    const xml = CamlBuilder.all().build();
    assert.ok(!xml.includes('<Where>'), 'all() must not produce <Where>');
  });

  test('all() still wraps in <View><Query>', () => {
    const xml = CamlBuilder.all().build();
    assert.ok(xml.includes('<View>'), 'Expected <View>');
    assert.ok(xml.includes('<Query>'), 'Expected <Query>');
  });

  test('all() supports orderBy', () => {
    const xml = CamlBuilder.all().orderBy('Title').build();
    assert.ok(xml.includes('<OrderBy>'));
    assert.ok(xml.includes('<FieldRef Name="Title" Ascending="TRUE" />'));
  });

  test('all() supports rowLimit', () => {
    const xml = CamlBuilder.all().rowLimit(100).build();
    assert.ok(xml.includes('<RowLimit>100</RowLimit>'));
  });
});

// ---------------------------------------------------------------------------
// SECTION 5: XML escaping
// ---------------------------------------------------------------------------
describe('CamlBuilder – XML escaping', () => {

  test('ampersand in value is escaped to &amp;', () => {
    const xml = CamlBuilder.where().field('Title').eq('Fish & Chips').build();
    assert.ok(xml.includes('Fish &amp; Chips'), 'Expected &amp;');
    assert.ok(!xml.includes('Fish & Chips'), 'Raw & must not appear in value');
  });

  test('less-than in value is escaped to &lt;', () => {
    const xml = CamlBuilder.where().field('Title').contains('A<B').build();
    assert.ok(xml.includes('A&lt;B'), 'Expected &lt;');
  });

  test('greater-than in value is escaped to &gt;', () => {
    const xml = CamlBuilder.where().field('Title').eq('3>2').build();
    assert.ok(xml.includes('3&gt;2'), 'Expected &gt;');
  });

  test('double-quote in value is escaped to &quot;', () => {
    const xml = CamlBuilder.where().field('Title').eq('say "hello"').build();
    assert.ok(xml.includes('say &quot;hello&quot;'), 'Expected &quot;');
  });

  test('single-quote in value is escaped to &apos;', () => {
    const xml = CamlBuilder.where().field('Title').eq("it's done").build();
    assert.ok(xml.includes("it&apos;s done"), 'Expected &apos;');
  });

  test('multiple special chars in one value', () => {
    const xml = CamlBuilder.where().field('Data').eq('<a href="x">Tom & Jerry\'s</a>').build();
    assert.ok(xml.includes('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;'));
  });
});

// ---------------------------------------------------------------------------
// SECTION 6: Special value types — userId and today
// ---------------------------------------------------------------------------
describe('CamlBuilder – special values', () => {

  test('{ userId: true } emits <UserID /> as an Integer lookup comparison', () => {
    const xml = CamlBuilder.where().field('Author', 'User').eq({ userId: true }).build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Eq><FieldRef Name="Author" LookupId="TRUE" /><Value Type="Integer"><UserID /></Value></Eq>'
    );
  });

  test('{ userId: true } works with UserMulti contains queries', () => {
    const xml = CamlBuilder.where().field('Approvers', 'UserMulti').contains({ userId: true }).build();
    const where = innerXml(xml, 'Where');
    assert.equal(
      where,
      '<Contains><FieldRef Name="Approvers" LookupId="TRUE" /><Value Type="Integer"><UserID /></Value></Contains>'
    );
  });

  test('{ today: true } emits <Today /> inside DateTime Value', () => {
    const xml = CamlBuilder.where().field('DueDate', 'DateTime').lte({ today: true }).build();
    const where = innerXml(xml, 'Where');
    assert.ok(
      where.includes('<Value Type="DateTime"><Today /></Value>'),
      `Expected Today in value, got: ${where}`
    );
  });

  test('{ today: true, offsetDays: 7 } emits <Today OffsetDays="7" />', () => {
    const xml = CamlBuilder.where()
      .field('DueDate', 'DateTime')
      .lte({ today: true, offsetDays: 7 })
      .build();
    const where = innerXml(xml, 'Where');
    assert.ok(
      where.includes('<Value Type="DateTime"><Today OffsetDays="7" /></Value>'),
      `Expected Today OffsetDays="7", got: ${where}`
    );
  });

  test('{ today: true, offsetDays: -3 } emits <Today OffsetDays="-3" />', () => {
    const xml = CamlBuilder.where()
      .field('DueDate', 'DateTime')
      .gte({ today: true, offsetDays: -3 })
      .build();
    const where = innerXml(xml, 'Where');
    assert.ok(
      where.includes('<Value Type="DateTime"><Today OffsetDays="-3" /></Value>'),
      `Expected Today OffsetDays="-3", got: ${where}`
    );
  });

  test('{ today: true } rejects non-integer offsetDays', () => {
    assert.throws(
      () => CamlBuilder.where().field('DueDate', 'DateTime').lte({ today: true, offsetDays: 1.5 }).build(),
      /offsetDays|integer/i
    );
  });
});

// ---------------------------------------------------------------------------
// SECTION 7: Guard — dangling field ref
// ---------------------------------------------------------------------------
describe('CamlBuilder – dangling field guard', () => {

  test('build() throws if field() called without operator', () => {
    // .field() returns a FieldRefBuilder, not a QueryBuilder, so we cannot call
    // .build() directly on it.  The guard is: calling .field() a second time on
    // a QueryBuilder that still has a pending FieldRef throws a clear error.
    const qb = CamlBuilder.where();
    qb.field('Status'); // pending — no operator called
    assert.throws(
      () => qb.field('Other'),
      /dangling|operator|incomplete|field/i,
      'Expected error about missing operator on dangling field ref'
    );
  });

  test('calling and() after field() without operator throws', () => {
    assert.throws(
      () => CamlBuilder.where().field('Status').and(),
      /dangling|operator|incomplete|field/i,
      'Expected error when chaining and() on an incomplete condition'
    );
  });

  test('calling and() before any condition throws', () => {
    assert.throws(
      () => CamlBuilder.where().and(),
      /condition|operator|and/i,
      'Expected error when and() has no previous condition'
    );
  });

  test('calling or() before any condition throws', () => {
    assert.throws(
      () => CamlBuilder.where().or(),
      /condition|operator|or/i,
      'Expected error when or() has no previous condition'
    );
  });

  test('consecutive logical operators throw instead of overwriting the first operator', () => {
    assert.throws(
      () => CamlBuilder.where().field('Status').eq('Active').and().or(),
      /condition|operator|pending|or/i,
      'Expected error for consecutive logical operators'
    );
  });
});

// ---------------------------------------------------------------------------
// SECTION 8: viewXml escape hatch
// ---------------------------------------------------------------------------
describe('CamlBuilder – viewXml escape hatch', () => {

  test('viewXml returns the raw string unchanged from build()', () => {
    const raw = '<View><Query><Where><Eq><FieldRef Name="ID" /><Value Type="Counter">1</Value></Eq></Where></Query></View>';
    const result = CamlBuilder.viewXml(raw).build();
    assert.equal(result, raw);
  });
});

// ---------------------------------------------------------------------------
// SECTION 9: Output shape
// ---------------------------------------------------------------------------
describe('CamlBuilder – output shape', () => {

  test('build() wraps everything in <View><Query>...</Query></View>', () => {
    const xml = CamlBuilder.where().field('Title').eq('Hello').build();
    assert.ok(xml.startsWith('<View>'), 'Must start with <View>');
    assert.ok(xml.endsWith('</View>'), 'Must end with </View>');
    assert.ok(xml.includes('<Query>'), 'Must contain <Query>');
    assert.ok(xml.includes('</Query>'), 'Must contain </Query>');
  });

  test('<Where> is inside <Query>', () => {
    const xml = CamlBuilder.where().field('Title').eq('Hello').build();
    const query = innerXml(xml, 'Query');
    assert.ok(query.includes('<Where>'), 'Where must be inside Query');
  });

  test('<RowLimit> is inside <View> but outside <Query>', () => {
    const xml = CamlBuilder.where().field('Title').eq('Hello').rowLimit(25).build();
    const view = innerXml(xml, 'View');
    const query = innerXml(xml, 'Query');
    assert.ok(view.includes('<RowLimit>25</RowLimit>'));
    assert.ok(!query.includes('<RowLimit>'));
  });
});

// ---------------------------------------------------------------------------
// SECTION 10: End-to-end realistic query
// ---------------------------------------------------------------------------
describe('CamlBuilder – end-to-end', () => {

  test('3-condition mixed query matches expected CAML string', () => {
    const xml = CamlBuilder
      .where()
      .field('Status').neq('Completed')
      .and()
      .field('DueDate', 'DateTime').lt('2026-01-01')
      .or()
      .field('Priority', 'Number').gte('5')
      .orderBy('DueDate', true)
      .rowLimit(50)
      .build();

    // Shape: (Status neq Completed AND DueDate lt 2026-01-01) OR Priority gte 5
    // Left-folded: conditions are combined left-to-right as they appear.
    // After: neq AND lt  → And(neq, lt)
    // Then:  And(neq,lt) OR gte → Or(And(neq,lt), gte)
    const expected =
      '<View>' +
        '<Query>' +
          '<Where>' +
            '<Or>' +
              '<And>' +
                '<Neq><FieldRef Name="Status" /><Value Type="Text">Completed</Value></Neq>' +
                '<Lt><FieldRef Name="DueDate" /><Value Type="DateTime">2026-01-01</Value></Lt>' +
              '</And>' +
              '<Geq><FieldRef Name="Priority" /><Value Type="Number">5</Value></Geq>' +
            '</Or>' +
          '</Where>' +
          '<OrderBy><FieldRef Name="DueDate" Ascending="TRUE" /></OrderBy>' +
        '</Query>' +
        '<RowLimit>50</RowLimit>' +
      '</View>';

    assert.equal(xml, expected, `Output did not match expected CAML.\nGot:      ${xml}\nExpected: ${expected}`);
  });

  test('all() with orderBy and rowLimit — full shape', () => {
    const xml = CamlBuilder.all().orderBy('Title', true).rowLimit(100).build();
    const expected =
      '<View>' +
        '<Query>' +
          '<OrderBy><FieldRef Name="Title" Ascending="TRUE" /></OrderBy>' +
        '</Query>' +
        '<RowLimit>100</RowLimit>' +
      '</View>';
    assert.equal(xml, expected);
  });

  test('single condition no orderBy no rowLimit', () => {
    const xml = CamlBuilder.where().field('ID', 'Counter').eq('42').build();
    const expected =
      '<View>' +
        '<Query>' +
          '<Where>' +
            '<Eq><FieldRef Name="ID" /><Value Type="Counter">42</Value></Eq>' +
          '</Where>' +
        '</Query>' +
      '</View>';
    assert.equal(xml, expected);
  });
});
