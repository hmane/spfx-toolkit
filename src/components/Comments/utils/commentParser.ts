/**
 * Comment Parser
 *
 * Parses SharePoint comment text containing:
 * - @mention{N} tokens (SP native format, returned as @mention&#123;N&#125;)
 * - [LinkName](url) markdown-style link tokens (custom encoding)
 *
 * Returns an array of segments for rendering.
 */

import type { IPrincipal } from '../../../types/listItemTypes';
import type { ICommentLink, ICommentSegment, ISPCommentResponse, IComment } from '../Comments.types';

// Regex for SP mention tokens (HTML-encoded braces in GET response)
const MENTION_REGEX_ENCODED = /@mention&#123;(\d+)&#125;/g;
// Regex for SP mention tokens (raw braces, as stored)
const MENTION_REGEX_RAW = /@mention\{(\d+)\}/g;
// Regex for markdown-style links: [name](url)
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Decode HTML entities commonly returned by SharePoint comment API
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Parse comment text into renderable segments.
 * Handles both @mention tokens and [name](url) link tokens.
 */
export function parseCommentText(
  text: string,
  mentions: IPrincipal[],
  links: ICommentLink[]
): ICommentSegment[] {
  if (!text) return [];

  // First decode HTML entities from SP response
  const decoded = decodeHtmlEntities(text);

  // Build a unified list of tokens with their positions
  const tokens: Array<{
    index: number;
    length: number;
    segment: ICommentSegment;
  }> = [];

  // Find mention tokens
  let match: RegExpExecArray | null;
  const mentionRegex = new RegExp(MENTION_REGEX_RAW.source, 'g');
  while ((match = mentionRegex.exec(decoded)) !== null) {
    const mentionIndex = parseInt(match[1], 10);
    if (mentionIndex >= 0 && mentionIndex < mentions.length) {
      tokens.push({
        index: match.index,
        length: match[0].length,
        segment: { type: 'mention', mentionIndex },
      });
    }
  }

  // Find link tokens
  const linkRegex = new RegExp(LINK_REGEX.source, 'g');
  let linkIdx = 0;
  while ((match = linkRegex.exec(decoded)) !== null) {
    // Match links from the parsed text to the links array
    const matchedLinkIndex = links.findIndex(
      (l) => l.url === match![2] || l.name === match![1]
    );
    const finalIndex = matchedLinkIndex >= 0 ? matchedLinkIndex : linkIdx;

    tokens.push({
      index: match.index,
      length: match[0].length,
      segment: { type: 'link', linkIndex: finalIndex },
    });
    linkIdx++;
  }

  // Sort tokens by position
  tokens.sort((a, b) => a.index - b.index);

  // Build segments
  const segments: ICommentSegment[] = [];
  let cursor = 0;

  for (const token of tokens) {
    // Add text before this token
    if (token.index > cursor) {
      const textBefore = decoded.substring(cursor, token.index);
      if (textBefore) {
        segments.push({ type: 'text', text: textBefore });
      }
    }
    segments.push(token.segment);
    cursor = token.index + token.length;
  }

  // Add remaining text
  if (cursor < decoded.length) {
    const remaining = decoded.substring(cursor);
    if (remaining) {
      segments.push({ type: 'text', text: remaining });
    }
  }

  return segments;
}

/**
 * Extract links from comment text encoded as [name](url).
 */
export function extractLinksFromText(text: string): ICommentLink[] {
  if (!text) return [];
  const decoded = decodeHtmlEntities(text);
  const links: ICommentLink[] = [];
  const linkRegex = new RegExp(LINK_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(decoded)) !== null) {
    const url = match[2];
    const ext = url.split('.').pop()?.toLowerCase() || '';
    links.push({
      name: match[1],
      url: url,
      fileType: ext,
    });
  }

  return links;
}

/**
 * Map SP API comment response to IComment.
 */
export function mapSPCommentToIComment(spComment: ISPCommentResponse): IComment {
  const decodedText = decodeHtmlEntities(spComment.text);
  const links = extractLinksFromText(decodedText);
  const mentionValues = Array.isArray(spComment.mentions)
    ? spComment.mentions
    : spComment.mentions?.results || [];

  const mentions: IPrincipal[] = mentionValues.map((m) => ({
    id: String(m.id || ''),
    email: m.email,
    title: m.name,
    loginName: m.loginName,
  }));

  const authorName = spComment.author?.name || (spComment.author as any)?.title || '';
  const authorEmail = spComment.author?.email || (spComment.author as any)?.Email || '';
  const authorLoginName = spComment.author?.loginName || (spComment.author as any)?.LoginName || '';
  const authorJobTitle = spComment.author?.jobTitle || (spComment.author as any)?.JobTitle || '';
  const authorId = spComment.author?.id ?? (spComment.author as any)?.Id ?? '';

  return {
    id: typeof spComment.id === 'string' ? parseInt(spComment.id, 10) : spComment.id,
    text: spComment.text,
    author: {
      id: String(authorId),
      email: authorEmail,
      title: authorName,
      loginName: authorLoginName,
      jobTitle: authorJobTitle,
    },
    mentions,
    links,
    createdDate: new Date(spComment.createdDate),
    likeCount: spComment.likeCount,
    isLiked: spComment.isLikedByUser ?? spComment.isLiked ?? false,
  };
}
