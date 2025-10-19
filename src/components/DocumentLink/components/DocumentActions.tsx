import { IDocumentInfo } from '../DocumentLink.types';
import { buildDownloadUrl, buildPreviewUrl } from '../utils';
import { SPContext } from '../../../utilities/context';

/**
 * Downloads a document
 * @param document - Document information
 * @returns Promise that resolves when download is initiated
 */
export async function downloadDocument(document: IDocumentInfo): Promise<void> {
  try {
    const downloadUrl = buildDownloadUrl(document.url);

    // Create hidden anchor element and trigger download
    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = document.name;
    link.style.display = 'none';

    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);

    SPContext.logger?.info('Document download initiated', { documentName: document.name });
  } catch (error) {
    SPContext.logger?.error('Failed to download document', error, { documentName: document.name });
    throw error;
  }
}

/**
 * Opens document preview in modal (Office Online)
 * @param document - Document information
 * @param mode - Preview mode (view or edit)
 */
export function openPreviewModal(document: IDocumentInfo, mode: 'view' | 'edit'): void {
  try {
    const previewUrl = buildPreviewUrl(document.url, mode, document.serverRelativeUrl) || document.url;
    console.log('Opening preview modal:', { url: document.url, previewUrl, mode });

    // Create modal container
    const modal = window.document.createElement('div');
    modal.id = 'document-preview-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create iframe container
    const container = window.document.createElement('div');
    container.style.cssText = `
      width: 90%;
      height: 90%;
      background: white;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Create header with close button
    const header = window.document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #edebe9;
      background: #f3f2f1;
    `;

    const title = window.document.createElement('span');
    title.textContent = document.name;
    title.style.cssText = `
      font-weight: 600;
      font-size: 14px;
      color: #201f1e;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    const closeButton = window.document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
      border: none;
      background: transparent;
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      color: #605e5c;
      border-radius: 2px;
    `;
    closeButton.onmouseover = () => (closeButton.style.background = '#e1dfdd');
    closeButton.onmouseout = () => (closeButton.style.background = 'transparent');
    closeButton.onclick = () => {
      window.document.body.removeChild(modal);
    };

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create iframe
    const iframe = window.document.createElement('iframe');
    iframe.src = previewUrl;
    iframe.style.cssText = `
      flex: 1;
      border: none;
      width: 100%;
    `;

    // Assemble modal
    container.appendChild(header);
    container.appendChild(iframe);
    modal.appendChild(container);

    // Close modal on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        window.document.body.removeChild(modal);
      }
    };

    // Add to DOM
    window.document.body.appendChild(modal);

    SPContext.logger?.info('Document preview opened in modal', {
      documentName: document.name,
      mode,
    });
  } catch (error) {
    SPContext.logger?.error('Failed to open preview modal', error, {
      documentName: document.name,
    });
    throw error;
  }
}

/**
 * Opens document preview in new tab
 * @param document - Document information
 * @param mode - Preview mode (view or edit)
 */
export function openPreviewNewTab(document: IDocumentInfo, mode: 'view' | 'edit'): void {
  try {
    const previewUrl = buildPreviewUrl(document.url, mode, document.serverRelativeUrl) || document.url;
    console.log('Opening preview in new tab:', { url: document.url, previewUrl, mode });
    const newWindow = window.open(previewUrl, '_blank', 'noopener=yes,noreferrer=yes');

    // Fallback when pop-up blockers prevent opening a new tab
    if (!newWindow) {
      window.location.href = previewUrl;
    }

    SPContext.logger?.info('Document preview opened in new tab', {
      documentName: document.name,
      mode,
    });
  } catch (error) {
    SPContext.logger?.error('Failed to open preview in new tab', error, {
      documentName: document.name,
    });
    throw error;
  }
}
