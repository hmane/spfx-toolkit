# CamlBuilder

A fluent, type-safe CAML query builder for SharePoint Framework. Produces valid
`<View>/<Query>` XML strings consumed by PnP's `getItemsByCAMLQuery` and the
raw SharePoint REST API.

Zero runtime dependencies — pure TypeScript, compiled to ES5/CommonJS.

---

## Quick start

```typescript
import { CamlBuilder } from 'spfx-toolkit/lib/utilities/camlBuilder';

// Filtered query
const caml = CamlBuilder
  .where()
  .field('Status').neq('Completed')
  .and()
  .field('DueDate', 'DateTime').lt('2026-01-01')
  .orderBy('DueDate', true)
  .rowLimit(50)
  .build();

// Use with PnP
const items = await sp.web.lists
  .getByTitle('Tasks')
  .getItemsByCAMLQuery({ ViewXml: caml });
```

---

## Output shape

`build()` always returns a complete `<View>` string:

```xml
<View>
  <Query>
    <Where>...</Where>         <!-- omitted when using CamlBuilder.all() -->
    <OrderBy>...</OrderBy>     <!-- omitted when no .orderBy() calls -->
  </Query>
  <RowLimit>N</RowLimit>       <!-- omitted when no .rowLimit() call -->
</View>
```

`<RowLimit>` is placed **inside `<View>` but outside `<Query>`** — the standard
CAML placement required by SharePoint.

---

## Entry points

| Method | Description |
|--------|-------------|
| `CamlBuilder.where()` | Start a filtered query — adds `<Where>` |
| `CamlBuilder.all()` | Start an unfiltered query — no `<Where>` |
| `CamlBuilder.viewXml(raw)` | Escape hatch — wraps a raw string; `build()` returns it unchanged |

---

## Field conditions

```typescript
.field(name: string, type?: CamlFieldType)
```

Returns a `FieldRefBuilder` with these operators:

| Method | CAML element | Notes |
|--------|-------------|-------|
| `.eq(value)` | `<Eq>` | |
| `.neq(value)` | `<Neq>` | |
| `.lt(value)` | `<Lt>` | |
| `.lte(value)` | `<Leq>` | |
| `.gt(value)` | `<Gt>` | |
| `.gte(value)` | `<Geq>` | |
| `.contains(value)` | `<Contains>` | |
| `.includes(value)` | `<Includes>` | Multi-value membership checks |
| `.notIncludes(value)` | `<NotIncludes>` | Multi-value membership exclusions |
| `.beginsWith(value)` | `<BeginsWith>` | |
| `.isNull()` | `<IsNull>` | No value argument |
| `.isNotNull()` | `<IsNotNull>` | No value argument |

`type` defaults to `'Text'`. Supported types: `Text`, `Number`, `Integer`,
`Boolean`, `DateTime`, `Lookup`, `LookupMulti`, `User`, `UserMulti`, `Choice`,
`MultiChoice`, `TaxonomyFieldType`, `TaxonomyFieldTypeMulti`, `Counter`, `Note`,
`Guid`, `Currency`, `URL`, `File`, `Calculated`, `Computed`, `ContentTypeId`,
`Attachments`, `ModStat`.

### Lookup, user, and taxonomy fields

`Lookup`, `LookupMulti`, `User`, `UserMulti`, `TaxonomyFieldType`, and
`TaxonomyFieldTypeMulti` fields are treated as ID-based filters. The generated
`<FieldRef>` includes `LookupId="TRUE"`.

For lookup/user fields, pass the lookup item ID or user ID rather than display
text. For taxonomy fields, pass the term's list-local WssId, not the term GUID
or label:

```typescript
CamlBuilder.where().field('Department', 'Lookup').eq('7')
// → <Eq><FieldRef Name="Department" LookupId="TRUE" /><Value Type="Lookup">7</Value></Eq>

CamlBuilder.where().field('Approvers', 'UserMulti').includes({ userId: true })
// → <Includes><FieldRef Name="Approvers" LookupId="TRUE" /><Value Type="Integer"><UserID /></Value></Includes>

CamlBuilder.where().field('Topic', 'TaxonomyFieldType').eq('42')
// → <Eq><FieldRef Name="Topic" LookupId="TRUE" /><Value Type="Integer">42</Value></Eq>

CamlBuilder.where().field('Topics', 'TaxonomyFieldTypeMulti').includes(42)
// → <Includes><FieldRef Name="Topics" LookupId="TRUE" /><Value Type="Integer">42</Value></Includes>
```

For multi-value fields (`LookupMulti`, `UserMulti`, `MultiChoice`,
`TaxonomyFieldTypeMulti`), prefer `.includes()` / `.notIncludes()` when you mean
"one of the values equals this value." Keep `.contains()` for text-style
contains queries.

Other field types are emitted as normal CAML value types unless called out below.

### Boolean fields

`Boolean` and `Attachments` fields accept real booleans and render the
SharePoint CAML form:

```typescript
CamlBuilder.where().field('IsActive', 'Boolean').eq(true)
// → <Value Type="Boolean">1</Value>

CamlBuilder.where().field('Attachments', 'Attachments').eq(false)
// → <Value Type="Attachments">0</Value>
```

---

## Special values

### Current user ID

```typescript
.field('AssignedTo', 'User').eq({ userId: true })
// → <Eq><FieldRef Name="AssignedTo" LookupId="TRUE" /><Value Type="Integer"><UserID /></Value></Eq>
```

### Today / date offset

```typescript
.field('DueDate', 'DateTime').lte({ today: true })
// → <Value Type="DateTime"><Today /></Value>

.field('DueDate', 'DateTime').lte({ today: true, offsetDays: 7 })
// → <Value Type="DateTime"><Today OffsetDays="7" /></Value>

.field('DueDate', 'DateTime').gte({ today: true, offsetDays: -3 })
// → <Value Type="DateTime"><Today OffsetDays="-3" /></Value>
```

---

## Logical joins and nesting strategy

`.and()` and `.or()` connect conditions. CAML requires binary nesting —
three conditions need two `<And>` or `<Or>` elements.

**Fold direction: LEFT-FOLD** — conditions are combined left-to-right as they
appear in the chain:

```
A AND B AND C  →  <And><And>A B</And>C</And>
```

Mixed operators follow the same left-fold rule:

```typescript
.field('Status').neq('Completed')
.and()
.field('DueDate', 'DateTime').lt('2026-01-01')
.or()
.field('Priority', 'Number').gte('5')
```

Produces `(Status≠Completed AND DueDate<2026-01-01) OR Priority≥5`:

```xml
<Or>
  <And>
    <Neq>...</Neq>
    <Lt>...</Lt>
  </And>
  <Geq>...</Geq>
</Or>
```

---

## Ordering and limits

```typescript
// Single field, ascending (default)
.orderBy('Title')

// Descending
.orderBy('Modified', false)

// Multiple fields — append additional FieldRefs to the same <OrderBy>
.orderBy('Priority', false)
.orderBy('Title', true)

// Row limit
.rowLimit(100)
```

`rowLimit()` must be a positive integer. Invalid limits throw before invalid
CAML is emitted.

---

## XML escaping

All field **values** are automatically XML-escaped (`& < > " '`).
Field **names** are also escaped. No manual escaping is needed:

```typescript
.field('Title').eq("Tom & Jerry's <Adventure>")
// → <Value Type="Text">Tom &amp; Jerry&apos;s &lt;Adventure&gt;</Value>
```

---

## Guard: dangling field refs

Calling `.field()` again before an operator is applied on the previous
`.field()` call throws a descriptive error:

```typescript
const qb = CamlBuilder.where();
qb.field('Status');          // pending — no operator
qb.field('Other');           // throws: "dangling field ref 'Status'..."
```

Similarly, calling `.and()` or `.or()` while a field ref is pending throws.

---

## Examples

```typescript
// Single condition
CamlBuilder.where().field('ID', 'Counter').eq('42').build();

// All items, sorted
CamlBuilder.all().orderBy('Title').rowLimit(500).build();

// User-specific items
CamlBuilder.where()
  .field('Author', 'User').eq({ userId: true })
  .orderBy('Created', false)
  .rowLimit(20)
  .build();

// Items due this week
CamlBuilder.where()
  .field('DueDate', 'DateTime').gte({ today: true })
  .and()
  .field('DueDate', 'DateTime').lte({ today: true, offsetDays: 7 })
  .orderBy('DueDate')
  .build();

// Escape hatch for hand-written CAML
CamlBuilder.viewXml('<View><Query>...</Query></View>').build();
```

---

## Import paths

```typescript
// Recommended (tree-shakable)
import { CamlBuilder } from 'spfx-toolkit/lib/utilities/camlBuilder';

// Or via the utilities barrel (imports more)
import { CamlBuilder } from 'spfx-toolkit/lib/utilities';
```
