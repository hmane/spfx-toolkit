import { SPContext } from '../../../utilities/context';
import { IFieldMetadata, ISectionMetadata } from '../types/fieldMetadata';
import { ISectionConfig } from '../SPDynamicForm.types';

/**
 * Groups fields by their ContentType group
 */
export function groupFieldsByContentTypeGroup(fields: IFieldMetadata[]): ISectionMetadata[] {
  const timer = SPContext.logger.startTimer('groupFieldsByContentTypeGroup');

  // Group fields by their group property
  const groupMap = new Map<string, IFieldMetadata[]>();

  fields.forEach((field) => {
    const groupName = field.group || '_Default';
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, []);
    }
    groupMap.get(groupName)!.push(field);
  });

  // Convert to section metadata
  const sections: ISectionMetadata[] = [];
  const sortOrder = ['_Hidden', '_Default', 'Base Columns', 'Core Document Columns'];

  groupMap.forEach((groupFields, groupName) => {
    // Skip hidden groups
    if (groupName === '_Hidden') {
      return;
    }

    // Create section
    const section: ISectionMetadata = {
      name: groupName.replace(/[^a-zA-Z0-9]/g, '_'),
      title: groupName === '_Default' ? 'General' : groupName,
      fields: groupFields,
      defaultExpanded: true, // First section expanded by default
      collapsible: true,
      originalGroup: groupName,
    };

    sections.push(section);
  });

  // Sort sections by priority
  sections.sort((a, b) => {
    const aIndex = sortOrder.indexOf(a.originalGroup || '');
    const bIndex = sortOrder.indexOf(b.originalGroup || '');

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) {
      return -1;
    }
    if (bIndex !== -1) {
      return 1;
    }

    return a.title.localeCompare(b.title);
  });

  // Set first section as default expanded
  if (sections.length > 0) {
    sections.forEach((s, i) => {
      s.defaultExpanded = i === 0;
    });
  }

  const duration = timer();
  SPContext.logger.info(`Grouped ${fields.length} fields into ${sections.length} sections in ${duration}ms`);

  return sections;
}

/**
 * Creates sections from manual configuration
 */
export function createManualSections(
  fields: IFieldMetadata[],
  sectionConfigs: ISectionConfig[]
): ISectionMetadata[] {
  const timer = SPContext.logger.startTimer('createManualSections');

  const fieldMap = new Map(fields.map((f) => [f.internalName, f]));
  const usedFields = new Set<string>();
  const sections: ISectionMetadata[] = [];

  // Create sections from config
  sectionConfigs.forEach((config) => {
    const sectionFields: IFieldMetadata[] = [];

    config.fields.forEach((fieldName) => {
      const field = fieldMap.get(fieldName);
      if (field) {
        sectionFields.push(field);
        usedFields.add(fieldName);
      } else {
        SPContext.logger.warn(`Field "${fieldName}" in section "${config.name}" not found`);
      }
    });

    if (sectionFields.length > 0) {
      sections.push({
        name: config.name,
        title: config.title,
        fields: sectionFields,
        defaultExpanded: config.defaultExpanded !== false,
        collapsible: config.collapsible !== false,
        description: config.description,
      });
    }
  });

  // Add remaining fields to "Other" section
  const remainingFields = fields.filter((f) => !usedFields.has(f.internalName));
  if (remainingFields.length > 0) {
    sections.push({
      name: 'other',
      title: 'Other Fields',
      fields: remainingFields,
      defaultExpanded: false,
      collapsible: true,
    });
  }

  const duration = timer();
  SPContext.logger.info(`Created ${sections.length} manual sections in ${duration}ms`);

  return sections;
}

/**
 * Resolves sections based on configuration
 */
export function resolveSections(
  fields: IFieldMetadata[],
  useContentTypeGroups: boolean = true,
  manualSections?: ISectionConfig[]
): ISectionMetadata[] {
  // Manual sections take precedence
  if (manualSections && manualSections.length > 0) {
    return createManualSections(fields, manualSections);
  }

  // Use ContentType groups
  if (useContentTypeGroups) {
    const sections = groupFieldsByContentTypeGroup(fields);

    // If only one section, don't use sections
    if (sections.length <= 1) {
      SPContext.logger.info('Only one section found, using flat layout');
      return [];
    }

    return sections;
  }

  // No sections
  return [];
}

/**
 * Flattens sections back to a single field array
 */
export function flattenSections(sections: ISectionMetadata[]): IFieldMetadata[] {
  const fields: IFieldMetadata[] = [];

  sections.forEach((section) => {
    fields.push(...section.fields);
  });

  return fields;
}

/**
 * Adds a field to a specific section by name
 */
export function addFieldToSection(
  sections: ISectionMetadata[],
  fieldName: string,
  field: IFieldMetadata,
  sectionName: string
): ISectionMetadata[] {
  const section = sections.find((s) => s.name === sectionName);

  if (section) {
    // Check if field already exists
    if (!section.fields.find((f) => f.internalName === fieldName)) {
      section.fields.push(field);
    }
  } else {
    SPContext.logger.warn(`Section "${sectionName}" not found`);
  }

  return sections;
}
