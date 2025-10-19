import * as React from 'react';
import { FileTypeIcon, IconType, ApplicationType } from '@pnp/spfx-controls-react/lib/FileTypeIcon';

/**
 * Props for DocumentIcon component
 */
interface IDocumentIconProps {
  /** File extension (e.g., 'pdf', 'docx') */
  extension: string;
  /** File path (optional, used as fallback for icon detection) */
  path?: string;
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * DocumentIcon component
 * Wraps PnP FileTypeIcon for consistent file type icon display
 * @param props - Component props
 * @returns React element
 * @example
 * ```typescript
 * <DocumentIcon extension="pdf" size={20} />
 * <DocumentIcon extension="docx" path="/documents/file.docx" />
 * ```
 */
export const DocumentIcon: React.FC<IDocumentIconProps> = React.memo(
  ({ extension, path, size = 20, className }) => {
    // Determine application type from extension
    const getApplicationType = (ext: string): ApplicationType => {
      const extLower = ext.toLowerCase();

      // Microsoft Office
      if (['docx', 'doc', 'docm', 'dotx', 'dot'].includes(extLower))
        return ApplicationType.Word;
      if (['xlsx', 'xls', 'xlsm', 'xltx', 'xlt'].includes(extLower))
        return ApplicationType.Excel;
      if (['pptx', 'ppt', 'pptm', 'potx', 'pot'].includes(extLower))
        return ApplicationType.PowerPoint;
      if (['one', 'onetoc2'].includes(extLower)) return ApplicationType.OneNote;

      // Other Microsoft apps
      if (['pub'].includes(extLower)) return ApplicationType.Publisher;
      if (['vsd', 'vsdx', 'vss', 'vst'].includes(extLower)) return ApplicationType.Visio;
      if (['mpp', 'mpt'].includes(extLower)) return ApplicationType.Project;

      // Adobe
      if (['pdf'].includes(extLower)) return ApplicationType.PDF;

      // Media
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'tiff', 'ico'].includes(extLower))
        return ApplicationType.Image;

      // Code
      if (['html', 'htm'].includes(extLower)) return ApplicationType.HTML;
      if (['css'].includes(extLower)) return ApplicationType.CSS;
      if (['csv'].includes(extLower)) return ApplicationType.CSV;

      // Default - Use Code type as fallback (most generic supported type)
      return ApplicationType.Code;
    };

    const applicationType = getApplicationType(extension);

    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <FileTypeIcon
          type={IconType.image}
          application={applicationType}
          path={path}
          size={size}
        />
      </span>
    );
  }
);

DocumentIcon.displayName = 'DocumentIcon';
