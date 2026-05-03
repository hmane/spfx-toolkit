import { SPContext } from '../../../utilities/context';
import { IFieldMetadata } from '../types/fieldMetadata';
import { ILookupFieldConfig } from '../SPDynamicForm.types';
import { effectiveMatcher, fieldMatches } from './fieldOverrideMatcher';

/** Cancellation signal checked during async lookup optimization. */
export interface IOptimizeOptions {
  signal?: { readonly aborted: boolean };
}

/**
 * Optimizes lookup field rendering based on item count
 * Large lookup lists (>threshold) are rendered as autocomplete instead of dropdown
 */
export async function optimizeLookupField(
  field: IFieldMetadata,
  globalThreshold: number = 5000,
  lookupFieldConfig?: ILookupFieldConfig[]
): Promise<IFieldMetadata> {
  // Only process lookup fields
  if (!field.isLookup || !field.lookupListId) {
    return field;
  }

  try {
    const timer = SPContext.logger.startTimer('optimizeLookupField');

    // Check for field-specific configuration. Honour both the new `field`
    // matcher (string | RegExp | function) and the deprecated `fieldName` alias
    // via `effectiveMatcher`.
    const fieldConfig = lookupFieldConfig?.find((c) => {
      const m = effectiveMatcher(c);
      return m !== null && fieldMatches(m, field);
    });

    // If render mode is explicitly set, use it
    if (fieldConfig?.renderMode) {
      field.recommendedRenderMode = fieldConfig.renderMode;
      SPContext.logger.info(
        `Lookup field "${field.internalName}": Using explicit render mode "${fieldConfig.renderMode}"`
      );
      return field;
    }

    // Get item count from the lookup list
    const lookupList = SPContext.sp.web.lists.getById(field.lookupListId);
    const listInfo = await lookupList.select('ItemCount')();
    const itemCount = listInfo.ItemCount || 0;

    field.lookupItemCount = itemCount;

    // Determine threshold (field-specific > global > default 5000)
    const threshold = fieldConfig?.threshold ?? globalThreshold ?? 5000;

    // Determine recommended render mode
    field.recommendedRenderMode = itemCount >= threshold ? 'autocomplete' : 'dropdown';

    const duration = timer();
    SPContext.logger.info(
      `Lookup field "${field.internalName}": ${itemCount} items, mode: ${field.recommendedRenderMode} (threshold: ${threshold}) [${duration}ms]`
    );
  } catch (error) {
    // On error, default to dropdown (safe fallback)
    field.recommendedRenderMode = 'dropdown';
    SPContext.logger.warn(
      `Failed to optimize lookup field "${field.internalName}", using dropdown mode`,
      error
    );
  }

  return field;
}

/**
 * Optimizes multiple lookup fields in parallel
 */
export async function optimizeLookupFields(
  fields: IFieldMetadata[],
  globalThreshold: number = 5000,
  lookupFieldConfig?: ILookupFieldConfig[],
  options: IOptimizeOptions = {}
): Promise<IFieldMetadata[]> {
  const { signal } = options;
  const timer = SPContext.logger.startTimer('optimizeLookupFields');

  // Find all lookup fields
  const lookupFields = fields.filter((f) => f.isLookup && f.lookupListId);

  if (lookupFields.length === 0) {
    SPContext.logger.info('No lookup fields to optimize');
    return fields;
  }

  SPContext.logger.info(`Optimizing ${lookupFields.length} lookup field(s)...`);

  // Optimize all lookup fields in parallel; each checks the signal before side effects
  const optimizedLookups = await Promise.all(
    lookupFields.map(async (field) => {
      if (signal?.aborted) return field;
      const result = await optimizeLookupField(field, globalThreshold, lookupFieldConfig);
      if (signal?.aborted) return field;
      return result;
    })
  );

  // Create a map for quick lookup
  const optimizedMap = new Map(optimizedLookups.map((f) => [f.internalName, f]));

  // Replace optimized fields in the original array
  const result = fields.map((field) => optimizedMap.get(field.internalName) || field);

  const duration = timer();
  SPContext.logger.success(`Optimized ${lookupFields.length} lookup field(s) in ${duration}ms`);

  return result;
}

/**
 * Gets the render mode for a lookup field (with override support)
 */
export function getLookupRenderMode(
  field: IFieldMetadata,
  fieldOverrideMode?: 'auto' | 'dropdown' | 'autocomplete'
): 'dropdown' | 'autocomplete' {
  // 1. Field-level override takes precedence — UNLESS it's 'auto' (the default,
  //    meaning "let the optimizer decide based on item count").
  if (fieldOverrideMode && fieldOverrideMode !== 'auto') {
    return fieldOverrideMode;
  }

  // 2. Use recommended mode from optimization (also collapse 'auto' to size-driven default).
  if (field.recommendedRenderMode && field.recommendedRenderMode !== 'auto') {
    return field.recommendedRenderMode;
  }

  // 3. Default to dropdown (size-driven default if optimizer hasn't run).
  return 'dropdown';
}
