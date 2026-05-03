import { IFieldMetadata } from '../types/fieldMetadata';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/**
 * Normalises a SharePoint field value to a stable comparable form, regardless
 * of whether it came from the form (extracted) or from the raw `items.getById()`
 * payload (server shape). Returns `null` for empty/missing values.
 */
export function normaliseFieldValue(field: IFieldMetadata, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;

  switch (field.fieldType) {
    case 'User':
    case 'UserMulti': {
      // Server shape: { Id, Title, EMail } | array | { results: [...] }
      // Form shape:   { Id, Title, EMail } | array | null
      const arr = Array.isArray(value)
        ? value
        : Array.isArray((value as any).results)
          ? (value as any).results
          : [value];
      const ids = arr
        .map((u: any) => (u?.Id ?? u?.id ?? null))
        .filter((id: number | null) => id !== null && id !== undefined)
        .sort((a: number, b: number) => a - b);
      return ids.length === 0 ? null : ids.join(',');
    }

    case 'Lookup':
    case 'LookupMulti': {
      const arr = Array.isArray(value)
        ? value
        : Array.isArray((value as any).results)
          ? (value as any).results
          : [value];
      const ids = arr
        .map((u: any) => (u?.Id ?? u?.id ?? null))
        .filter((id: number | null) => id !== null && id !== undefined)
        .sort((a: number, b: number) => a - b);
      return ids.length === 0 ? null : ids.join(',');
    }

    case 'TaxonomyFieldType':
    case 'TaxonomyFieldTypeMulti': {
      const arr = Array.isArray(value)
        ? value
        : Array.isArray((value as any).results)
          ? (value as any).results
          : [value];
      const guids = arr
        .map((t: any) => (t?.TermGuid ?? t?.id ?? null))
        .filter((g: string | null) => !!g && g !== EMPTY_GUID)
        .map((g: string) => g.toLowerCase())
        .sort();
      return guids.length === 0 ? null : guids.join(',');
    }

    // SPUrlField emits { Url: '', Description: '' } for empty values; the unwrap below handles it.
    case 'URL': {
      // SP returns { Url, Description }; form sends same shape
      const url = (value as any)?.Url ?? value;
      return url ? String(url).trim() : null;
    }

    case 'DateTime': {
      const date = value instanceof Date ? value : new Date(value as string);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    case 'Boolean': {
      if (value === true || value === 'true' || value === 1 || value === '1' || value === 'Yes') return true;
      if (value === false || value === 'false' || value === 0 || value === '0' || value === 'No') return false;
      return null;
    }

    case 'Number':
    case 'Currency': {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(num) ? null : num;
    }

    case 'MultiChoice': {
      const arr = Array.isArray(value)
        ? value
        : Array.isArray((value as any).results)
          ? (value as any).results
          : typeof value === 'string'
            ? value.split(/[;|]/).filter(Boolean)
            : [value];
      return arr.length === 0 ? null : arr.map(String).sort().join('||');
    }

    case 'Guid':
      // Stable comparison — GUIDs can arrive in mixed case across SP REST shapes
      return String(value).toLowerCase();

    default:
      // Text, Note, Choice, single value — direct compare
      return String(value);
  }
}

export function fieldValueChanged(
  field: IFieldMetadata,
  formValue: unknown,
  originalValue: unknown
): boolean {
  return normaliseFieldValue(field, formValue) !== normaliseFieldValue(field, originalValue);
}
