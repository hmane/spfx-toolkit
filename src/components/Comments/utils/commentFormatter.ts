/**
 * Comment Formatter
 *
 * Formats comment input data for the SharePoint Comments REST API.
 *
 * Mention format (SP native): @mention{N} with mentions array
 * Link format (custom): [LinkName](url) — markdown-style, human-readable fallback
 */

import type { IPrincipal } from '../../../types/listItemTypes';
import type { ICommentLink } from '../Comments.types';

export interface IFormattedComment {
  /** Text with @mention{N} tokens and [name](url) link encoding */
  text: string;
  /** Mentions array for SP API: { email, name } */
  mentions: Array<{ email: string; name: string }>;
}

/**
 * Encode special characters that could break SP comment storage.
 * Does NOT encode characters used in our token formats.
 */
function encodeSpecialChars(text: string): string {
  // SP comment API handles most chars fine, but we need to escape
  // angle brackets to prevent XSS and HTML interpretation
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Format a comment for posting to the SharePoint Comments API.
 *
 * Takes the raw text with inline display names and replaces them
 * with @mention{N} tokens. Links are encoded as [name](url).
 *
 * @param text - Raw text from the input (with @DisplayName and #LinkName chips already resolved)
 * @param mentions - Selected mentions (IPrincipal[])
 * @param links - Selected links (ICommentLink[])
 * @param mentionPlaceholders - Map of display positions to mention indexes
 * @param linkPlaceholders - Map of display positions to link indexes
 */
export function formatCommentForApi(
  text: string,
  mentions: IPrincipal[],
  links: ICommentLink[]
): IFormattedComment {
  let formattedText = text;

  // Replace mention placeholders: \x01M{index}\x01 → @mention{index}
  for (let i = 0; i < mentions.length; i++) {
    const placeholder = `\x01M${i}\x01`;
    formattedText = formattedText.replace(placeholder, `@mention{${i}}`);
  }

  // Replace link placeholders: \x01L{index}\x01 → [name](url)
  for (let i = 0; i < links.length; i++) {
    const placeholder = `\x01L${i}\x01`;
    const link = links[i];
    formattedText = formattedText.replace(placeholder, `[${link.name}](${link.url})`);
  }

  // Encode special chars in remaining text segments (not in tokens)
  // We do this carefully to avoid encoding our own tokens
  const parts = formattedText.split(/(@mention\{\d+\}|\[[^\]]+\]\([^)]+\))/);
  const encoded = parts
    .map((part, idx) => {
      // Odd indexes are token matches, keep as-is
      if (idx % 2 === 1) return part;
      return encodeSpecialChars(part);
    })
    .join('');

  // Build mentions array for SP API
  const spMentions = mentions.map((m) => ({
    email: m.email || '',
    name: m.title || '',
  }));

  return {
    text: encoded,
    mentions: spMentions,
  };
}

/**
 * Resolve a pasted SharePoint URL to a document name.
 * Uses SPContext imperatively (not a hook).
 */
export async function resolveSharePointUrl(
  url: string,
  sp: any // SPFI instance from SPContext.sp
): Promise<{ name: string; url: string } | null> {
  try {
    // Only resolve SharePoint URLs
    if (!url.includes('.sharepoint.com') && !url.includes('.sharepoint.us')) {
      return null;
    }

    const parsedUrl = new URL(url);
    const serverRelativePath = decodeURIComponent(parsedUrl.pathname);

    // Try to get file info
    const file = await sp.web.getFileByServerRelativePath(serverRelativePath)();
    return { name: file.Name, url };
  } catch {
    // URL not resolvable (not a file, no access, etc.)
    return null;
  }
}
