import { IFieldMetadata } from '../types/fieldMetadata';
import { SPContext } from '../../../utilities/context';

/**
 * A field matcher narrows which field(s) an override applies to.
 *  - `string` — exact internal-name match (case-sensitive, the SharePoint canonical form)
 *  - `RegExp` — matched against `internalName` first, then `displayName`
 *  - `function` — full custom predicate
 */
export type FieldMatcher = string | RegExp | ((field: IFieldMetadata) => boolean);

export function fieldMatches(matcher: FieldMatcher, field: IFieldMetadata): boolean {
  if (typeof matcher === 'string') {
    return field.internalName === matcher;
  }
  if (matcher instanceof RegExp) {
    // Reset lastIndex defensively in case the caller passed a /g flag
    matcher.lastIndex = 0;
    if (matcher.test(field.internalName)) return true;
    matcher.lastIndex = 0;
    return matcher.test(field.displayName);
  }
  if (typeof matcher === 'function') {
    try {
      return matcher(field);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resolves the effective matcher for an override-like config that supports
 * BOTH the new `field` matcher and the deprecated `fieldName` string. If both
 * are set, `field` wins and a single deprecation warning is logged per name
 * per session.
 */
const warnedFieldNames = new Set<string>();
export function effectiveMatcher(o: { field?: FieldMatcher; fieldName?: string }): FieldMatcher | null {
  if (o.field !== undefined && o.fieldName !== undefined) {
    const key = typeof o.fieldName === 'string' ? o.fieldName : '<non-string>';
    if (!warnedFieldNames.has(key)) {
      warnedFieldNames.add(key);
      SPContext.logger.warn(
        'SPDynamicForm: override has both `field` and `fieldName`; `field` wins. Drop `fieldName` to silence.',
        { fieldName: o.fieldName }
      );
    }
    return o.field;
  }
  if (o.field !== undefined) return o.field;
  if (typeof o.fieldName === 'string' && o.fieldName.length > 0) return o.fieldName;
  return null;
}
