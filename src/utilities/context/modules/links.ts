/**
 * src/context/modules/links.ts
 * Optional link builder module
 */

import type { ContextConfig, ContextModule, LinkBuilder, SPFxContextInput } from '../types';

export class LinksModule implements ContextModule {
  name = 'links';

  async initialize(context: SPFxContextInput, config: ContextConfig): Promise<LinkBuilder> {
    const webUrl = context.pageContext.web.absoluteUrl;

    return {
      file: {
        view: (path: string) => this.buildFileUrl(webUrl, path, 'view'),
        edit: (path: string) => this.buildFileUrl(webUrl, path, 'edit'),
        download: (path: string) => this.buildFileUrl(webUrl, path, 'download'),
      },

      listItem: {
        view: (listUrl: string, itemId: number) =>
          this.buildListItemUrl(webUrl, listUrl, itemId, 'DispForm.aspx'),
        edit: (listUrl: string, itemId: number) =>
          this.buildListItemUrl(webUrl, listUrl, itemId, 'EditForm.aspx'),
        newItem: (listUrl: string) => this.buildListItemUrl(webUrl, listUrl, null, 'NewForm.aspx'),
      },
    };
  }

  private buildFileUrl(webUrl: string, path: string, action: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fileUrl = `${webUrl.replace(/\/$/, '')}${cleanPath}`;

    switch (action) {
      case 'edit':
        return `${webUrl}/_layouts/15/WopiFrame.aspx?sourcedoc=${encodeURIComponent(
          fileUrl
        )}&action=edit`;
      case 'download':
        return `${fileUrl}?download=1`;
      case 'view':
      default:
        return fileUrl;
    }
  }

  private buildListItemUrl(
    webUrl: string,
    listUrl: string,
    itemId: number | null,
    form: string
  ): string {
    const cleanListUrl = listUrl.startsWith('/') ? listUrl : `/${listUrl}`;
    const baseUrl = `${webUrl.replace(/\/$/, '')}${cleanListUrl}/${form}`;

    return itemId ? `${baseUrl}?ID=${itemId}` : baseUrl;
  }
}
