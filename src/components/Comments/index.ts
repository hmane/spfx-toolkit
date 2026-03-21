/**
 * Comments Component
 *
 * A customizable comments component for SharePoint list items with:
 * - @mentions with preferred user lists (uses IPrincipal from toolkit types)
 * - #links with document preview (uses DocumentLink from toolkit)
 * - Multiple layouts: classic, chat, compact, timeline
 * - Client-side search across loaded comments
 * - Proper special character handling
 * - Text selection/copy support
 */

import './Comments.css';

export { Comments } from './Comments';

export type {
  ICommentsProps,
  IComment,
  ICommentLink,
  ISystemEvent,
  CommentLayout,
  ICommentSegment,
  CommentSegmentType,
  ICommentsState,
  IUseCommentsReturn,
  IUseCommentInputReturn,
  IUseCommentSearchReturn,
} from './Comments.types';

export { COMMENTS_DEFAULTS } from './Comments.types';

export { useComments } from './hooks/useComments';
export { useCommentInput } from './hooks/useCommentInput';
export { useCommentSearch } from './hooks/useCommentSearch';

export { parseCommentText, extractLinksFromText, mapSPCommentToIComment, decodeHtmlEntities } from './utils/commentParser';
export { formatCommentForApi, resolveSharePointUrl } from './utils/commentFormatter';
