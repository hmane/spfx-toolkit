import { createSPExtractor } from '../../../utilities/listItemHelper';
import { IFieldMetadata } from '../types/fieldMetadata';

/**
 * Convert a raw SharePoint item into the form-shape expected by SPDynamicForm.
 *
 * Output shapes per field type (these match what useDynamicFormData has been
 * producing for single-item edit — SPField components rely on them):
 *
 *   Lookup            → { Id, Title } | null
 *   LookupMulti       → Array<{ Id, Title }>
 *   User              → IPrincipal | null  (extractor.user shape)
 *   UserMulti         → IPrincipal[]
 *   TaxonomyFieldType → { Label, TermGuid, WssId } | null
 *   TaxonomyFieldTypeMulti → Array<{ Label, TermGuid, WssId }>
 *   URL               → { Url, Description } | null
 *   DateTime          → Date | undefined
 *   Boolean           → boolean | undefined
 *   Number / Currency / Integer / Counter → number | undefined
 *   MultiChoice       → string[]
 *   Text / Note / Choice → string | undefined
 */
export function extractItemValues(
  item: Record<string, unknown>,
  fields: IFieldMetadata[]
): Record<string, unknown> {
  const extractor = createSPExtractor(item);
  const out: Record<string, unknown> = {};

  fields.forEach((field) => {
    const name = field.internalName;
    let value: unknown;

    switch (field.fieldType) {
      case 'Text':
      case 'Note':
      case 'Choice':
        value = extractor.string(name);
        break;
      case 'Number':
      case 'Currency':
      case 'Integer':
      case 'Counter':
        value = extractor.number(name);
        break;
      case 'Boolean':
        value = extractor.boolean(name);
        break;
      case 'DateTime':
        value = extractor.date(name);
        break;
      case 'MultiChoice':
        value = extractor.multiChoice(name);
        break;
      case 'User':
        value = extractor.user(name) || null;
        break;
      case 'UserMulti':
        value = extractor.userMulti(name);
        break;
      case 'Lookup': {
        const lookup = extractor.lookup(name);
        // PascalCase reshape — SPLookupField expects { Id, Title }, not { id, title }.
        value = lookup && lookup.id ? { Id: lookup.id, Title: lookup.title || '' } : null;
        break;
      }
      case 'LookupMulti': {
        const lookups = extractor.lookupMulti(name);
        value = lookups
          .filter((l) => l.id !== undefined)
          .map((l) => ({ Id: l.id as number, Title: l.title || '' }));
        break;
      }
      case 'TaxonomyFieldType': {
        const taxonomy = extractor.taxonomy(name);
        value = taxonomy
          ? { Label: taxonomy.label, TermGuid: taxonomy.termId, WssId: taxonomy.wssId }
          : null;
        break;
      }
      case 'TaxonomyFieldTypeMulti': {
        const taxonomies = extractor.taxonomyMulti(name);
        value = taxonomies.map((t) => ({
          Label: t.label,
          TermGuid: t.termId,
          WssId: t.wssId,
        }));
        break;
      }
      case 'URL': {
        const urlObj = extractor.url(name);
        value = urlObj
          ? { Url: urlObj.url || '', Description: urlObj.description || '' }
          : null;
        break;
      }
      default:
        value = (item as any)[name];
        break;
    }

    out[name] = value;
  });

  return out;
}
