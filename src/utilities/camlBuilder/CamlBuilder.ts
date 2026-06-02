// ============================================================
// CamlBuilder — fluent, type-safe CAML query builder
// ============================================================
// Output shape:
//   <View>
//     <Query>
//       <Where> ... </Where>          (omitted when using all())
//       <OrderBy> ... </OrderBy>       (omitted when no orderBy calls)
//     </Query>
//     <RowLimit>N</RowLimit>           (omitted when no rowLimit call)
//   </View>
//
// Logical nesting strategy: LEFT-FOLD
//   Given conditions [A, B, C] joined by ops [AND, OR]:
//   Step 1: A  (pending)
//   Step 2: AND → (A AND B) is now the accumulated condition
//   Step 3: OR  → ((A AND B) OR C) is the final condition
//   Each op() call reduces the two most-recently-available conditions
//   into a combined node, so the final tree is left-folded.
// ============================================================

/**
 * Supported CAML field types.
 */
export type CamlFieldType =
  | 'Text'
  | 'Number'
  | 'Integer'
  | 'Boolean'
  | 'DateTime'
  | 'Lookup'
  | 'User'
  | 'Choice'
  | 'Counter'
  | 'Note'
  | 'Guid';

/**
 * Special value: current user's ID (User fields).
 */
export interface IUserIdValue {
  userId: true;
}

/**
 * Special value: relative date offset from today (DateTime fields).
 */
export interface ITodayValue {
  today: true;
  offsetDays?: number;
}

/**
 * A scalar field value or one of the two special value types.
 */
export type CamlFieldValue = string | number | IUserIdValue | ITodayValue;

// -------------------------------------------------------
// Internal XML helpers
// -------------------------------------------------------

/**
 * Escape the 5 XML special characters in a string value.
 * Note: escapeHtml from stringUtils uses document.createElement which is DOM-only.
 * This pure-JS replacement is safe in all environments (SPFx, Node.js tests, etc.)
 */
function escapeXml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a CAML <Value> element for the given field type and value.
 * Handles the two special value types (userId, today) and plain strings.
 */
function renderValue(type: CamlFieldType, value: CamlFieldValue): string {
  if (typeof value === 'object' && value !== null) {
    // { userId: true }
    if ((value as IUserIdValue).userId === true) {
      return `<Value Type="${type}"><UserID /></Value>`;
    }
    // { today: true, offsetDays?: n }
    const todayVal = value as ITodayValue;
    if (todayVal.today === true) {
      if (todayVal.offsetDays !== undefined) {
        return `<Value Type="${type}"><Today OffsetDays="${todayVal.offsetDays}" /></Value>`;
      }
      return `<Value Type="${type}"><Today /></Value>`;
    }
  }
  return `<Value Type="${type}">${escapeXml(String(value))}</Value>`;
}

/**
 * Render a CAML <FieldRef Name="..." /> element.
 */
function renderFieldRef(name: string): string {
  return `<FieldRef Name="${escapeXml(name)}" />`;
}

/**
 * Wrap a condition XML string in a binary operator tag.
 */
function wrapOperator(op: string, inner: string): string {
  return `<${op}>${inner}</${op}>`;
}

// -------------------------------------------------------
// Condition node — internal representation
// -------------------------------------------------------

/** A fully resolved CAML condition fragment (no pending field ref). */
interface IConditionNode {
  xml: string;
}

/** A pending field ref awaiting an operator call. */
interface IPendingField {
  name: string;
  type: CamlFieldType;
}

// -------------------------------------------------------
// FieldRefBuilder — provides operator methods
// -------------------------------------------------------

/**
 * Returned by `.field(name, type?)`. Provides fluent operator methods
 * that complete the condition and return the parent QueryBuilder.
 */
export class FieldRefBuilder {
  private _owner: QueryBuilder;
  private _name: string;
  private _type: CamlFieldType;

  /** @internal */
  constructor(owner: QueryBuilder, name: string, type: CamlFieldType) {
    this._owner = owner;
    this._name = name;
    this._type = type;
  }

  private _binary(op: string, value: CamlFieldValue): QueryBuilder {
    const xml = wrapOperator(
      op,
      renderFieldRef(this._name) + renderValue(this._type, value)
    );
    return this._owner['_resolveCondition'](xml);
  }

  private _unary(op: string): QueryBuilder {
    const xml = `<${op}>${renderFieldRef(this._name)}</${op}>`;
    return this._owner['_resolveCondition'](xml);
  }

  /** Equal — emits `<Eq>` */
  eq(value: CamlFieldValue): QueryBuilder { return this._binary('Eq', value); }
  /** Not-equal — emits `<Neq>` */
  neq(value: CamlFieldValue): QueryBuilder { return this._binary('Neq', value); }
  /** Less-than — emits `<Lt>` */
  lt(value: CamlFieldValue): QueryBuilder { return this._binary('Lt', value); }
  /** Less-than-or-equal — emits `<Leq>` */
  lte(value: CamlFieldValue): QueryBuilder { return this._binary('Leq', value); }
  /** Greater-than — emits `<Gt>` */
  gt(value: CamlFieldValue): QueryBuilder { return this._binary('Gt', value); }
  /** Greater-than-or-equal — emits `<Geq>` */
  gte(value: CamlFieldValue): QueryBuilder { return this._binary('Geq', value); }
  /** Contains — emits `<Contains>` */
  contains(value: CamlFieldValue): QueryBuilder { return this._binary('Contains', value); }
  /** Begins-with — emits `<BeginsWith>` */
  beginsWith(value: CamlFieldValue): QueryBuilder { return this._binary('BeginsWith', value); }
  /** Is-null — emits `<IsNull>` (no Value) */
  isNull(): QueryBuilder { return this._unary('IsNull'); }
  /** Is-not-null — emits `<IsNotNull>` (no Value) */
  isNotNull(): QueryBuilder { return this._unary('IsNotNull'); }
}

// -------------------------------------------------------
// QueryBuilder — core fluent builder
// -------------------------------------------------------

/**
 * Fluent CAML query builder returned by `CamlBuilder.where()` and `CamlBuilder.all()`.
 */
export class QueryBuilder {
  /** Accumulated left-folded condition stack. Last entry is current resolved condition. */
  private _conditions: IConditionNode[] = [];
  /**
   * The pending logical operator to apply when the NEXT condition is resolved.
   * 'and' | 'or' | null
   */
  private _pendingOp: 'And' | 'Or' | null = null;
  /** True when a field() call is active but has not yet had an operator applied. */
  private _pendingField: IPendingField | null = null;
  /** Whether this builder was started with where() (true) or all() (false). */
  private _hasWhere: boolean;
  /** OrderBy field refs accumulated across multiple orderBy() calls. */
  private _orderByParts: string[] = [];
  /** Row limit (null = omit <RowLimit>). */
  private _rowLimit: number | null = null;

  /** @internal */
  constructor(hasWhere: boolean) {
    this._hasWhere = hasWhere;
  }

  // -------------------------------------------------------
  // Internal: condition resolution
  // -------------------------------------------------------

  /**
   * Called by FieldRefBuilder once an operator produces a complete condition XML.
   * Applies any pending logical operator to fold the new condition into the stack.
   * @internal
   */
  _resolveCondition(xml: string): QueryBuilder {
    this._pendingField = null;
    if (this._pendingOp !== null && this._conditions.length > 0) {
      const prev = this._conditions.pop()!;
      const op = this._pendingOp;
      this._pendingOp = null;
      this._conditions.push({
        xml: wrapOperator(op, prev.xml + xml),
      });
    } else {
      this._conditions.push({ xml: xml });
    }
    return this;
  }

  // -------------------------------------------------------
  // Public: field() — starts a new condition
  // -------------------------------------------------------

  /**
   * Begin a new field condition.
   *
   * @param name - Internal field name (maps to `Name` attribute of `<FieldRef>`)
   * @param type - CAML field type (default: `'Text'`)
   * @returns FieldRefBuilder to chain an operator
   *
   * @example
   * ```typescript
   * CamlBuilder.where().field('Status').eq('Active')
   * CamlBuilder.where().field('DueDate', 'DateTime').lt('2026-01-01')
   * ```
   */
  field(name: string, type: CamlFieldType = 'Text'): FieldRefBuilder {
    if (this._pendingField !== null) {
      throw new Error(
        `CamlBuilder: dangling field ref "${this._pendingField.name}" — ` +
        `call an operator (eq, neq, lt, ...) before calling .field() again or .build().`
      );
    }
    this._pendingField = { name, type };
    return new FieldRefBuilder(this, name, type);
  }

  // -------------------------------------------------------
  // Public: and() / or() — logical joins
  // -------------------------------------------------------

  /**
   * Logical AND join between the previous condition and the next.
   *
   * @throws If a field() is pending (no operator was called after the last .field())
   */
  and(): QueryBuilder {
    if (this._pendingField !== null) {
      throw new Error(
        `CamlBuilder: dangling field ref "${this._pendingField.name}" — ` +
        `call an operator before calling .and().`
      );
    }
    this._pendingOp = 'And';
    return this;
  }

  /**
   * Logical OR join between the previous condition and the next.
   *
   * @throws If a field() is pending (no operator was called after the last .field())
   */
  or(): QueryBuilder {
    if (this._pendingField !== null) {
      throw new Error(
        `CamlBuilder: dangling field ref "${this._pendingField.name}" — ` +
        `call an operator before calling .or().`
      );
    }
    this._pendingOp = 'Or';
    return this;
  }

  // -------------------------------------------------------
  // Public: orderBy()
  // -------------------------------------------------------

  /**
   * Add an `<OrderBy>` field reference.
   * Multiple calls append additional `<FieldRef>` elements inside the same `<OrderBy>`.
   *
   * @param fieldName - Field to sort by
   * @param ascending - Sort direction (default: `true`)
   */
  orderBy(fieldName: string, ascending: boolean = true): QueryBuilder {
    const asc = ascending ? 'TRUE' : 'FALSE';
    this._orderByParts.push(`<FieldRef Name="${escapeXml(fieldName)}" Ascending="${asc}" />`);
    return this;
  }

  // -------------------------------------------------------
  // Public: rowLimit()
  // -------------------------------------------------------

  /**
   * Set a row limit for the query.
   * Emits `<RowLimit>N</RowLimit>` inside `<View>` (not inside `<Query>`).
   *
   * @param limit - Maximum number of items to return
   */
  rowLimit(limit: number): QueryBuilder {
    this._rowLimit = limit;
    return this;
  }

  // -------------------------------------------------------
  // Public: build() — terminal method
  // -------------------------------------------------------

  /**
   * Compile the accumulated conditions, ordering, and row limit into a complete CAML XML string.
   *
   * Output shape:
   * ```xml
   * <View>
   *   <Query>
   *     <Where>...</Where>       <!-- omitted for all() -->
   *     <OrderBy>...</OrderBy>   <!-- omitted when no orderBy() calls -->
   *   </Query>
   *   <RowLimit>N</RowLimit>     <!-- omitted when no rowLimit() call -->
   * </View>
   * ```
   *
   * @throws If a field() call was made without a subsequent operator call (dangling field ref)
   * @returns CAML XML string
   */
  build(): string {
    if (this._pendingField !== null) {
      throw new Error(
        `CamlBuilder: dangling field ref "${this._pendingField.name}" — ` +
        `call an operator (eq, neq, lt, ...) before calling .build().`
      );
    }

    let queryInner = '';

    // <Where> block
    if (this._hasWhere) {
      if (this._conditions.length === 1) {
        queryInner += `<Where>${this._conditions[0].xml}</Where>`;
      } else if (this._conditions.length > 1) {
        // Shouldn't happen with proper use — extra conditions without operators
        // are folded as-is. Wrap remaining in a final And.
        let acc = this._conditions[0].xml;
        for (let i = 1; i < this._conditions.length; i++) {
          acc = wrapOperator('And', acc + this._conditions[i].xml);
        }
        queryInner += `<Where>${acc}</Where>`;
      }
    }

    // <OrderBy> block
    if (this._orderByParts.length > 0) {
      queryInner += `<OrderBy>${this._orderByParts.join('')}</OrderBy>`;
    }

    let viewInner = `<Query>${queryInner}</Query>`;

    // <RowLimit> — inside <View>, outside <Query>
    if (this._rowLimit !== null) {
      viewInner += `<RowLimit>${this._rowLimit}</RowLimit>`;
    }

    return `<View>${viewInner}</View>`;
  }
}

// -------------------------------------------------------
// ViewXmlTerminal — escape hatch
// -------------------------------------------------------

/** Return type of `CamlBuilder.viewXml()`. Wraps a raw CAML string. */
export interface IViewXmlTerminal {
  /** Return the raw CAML string as-is. */
  build(): string;
}

// -------------------------------------------------------
// CamlBuilder — static entry points
// -------------------------------------------------------

/**
 * Fluent, type-safe CAML query builder for SharePoint Framework.
 *
 * @example Basic filtered query
 * ```typescript
 * const caml = CamlBuilder
 *   .where()
 *   .field('Status').neq('Completed')
 *   .and()
 *   .field('DueDate', 'DateTime').lt('2026-01-01')
 *   .orderBy('DueDate', true)
 *   .rowLimit(50)
 *   .build();
 * ```
 *
 * @example Query with no filter
 * ```typescript
 * const caml = CamlBuilder.all().orderBy('Title').build();
 * ```
 *
 * @example Raw CAML escape hatch
 * ```typescript
 * const caml = CamlBuilder.viewXml('<View><Query>...</Query></View>').build();
 * ```
 */
export class CamlBuilder {
  /**
   * Start a filtered CAML query.
   * Use `.field()` chains to add conditions.
   *
   * @returns QueryBuilder with `_hasWhere = true`
   */
  static where(): QueryBuilder {
    return new QueryBuilder(true);
  }

  /**
   * Start an unfiltered CAML query (no `<Where>` element).
   * Useful for returning all items with just ordering / row limits.
   *
   * @returns QueryBuilder with `_hasWhere = false`
   */
  static all(): QueryBuilder {
    return new QueryBuilder(false);
  }

  /**
   * Raw CAML string escape hatch.
   * Returns an object whose `build()` method returns `raw` unchanged.
   * Use when you already have a hand-written CAML string you want to pass
   * through the same pipeline.
   *
   * @param raw - Complete CAML ViewXml string
   */
  static viewXml(raw: string): IViewXmlTerminal {
    return { build: () => raw };
  }
}
