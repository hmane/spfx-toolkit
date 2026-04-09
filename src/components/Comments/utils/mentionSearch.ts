import type { IPrincipal } from '../../../types/listItemTypes';
import { SPContext } from '../../../utilities/context';

const DEFAULT_MENTION_SUGGESTION_LIMIT = 25;
const MIN_REMOTE_MENTION_QUERY_LENGTH = 2;

export function getMentionPrincipalKey(user: IPrincipal): string {
  const candidates = [user.email, user.loginName, user.id, user.title];

  for (let i = 0; i < candidates.length; i++) {
    const value = String(candidates[i] || '').trim().toLowerCase();
    if (value) {
      return value;
    }
  }

  return '';
}

export function dedupeMentionPrincipals(users: IPrincipal[]): IPrincipal[] {
  const seen = new Set<string>();
  const deduped: IPrincipal[] = [];

  users.forEach((user) => {
    const key = getMentionPrincipalKey(user);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(user);
  });

  return deduped;
}

export function rankMentionPrincipals(users: IPrincipal[], query: string): IPrincipal[] {
  const normalizedQuery = normalizeMentionValue(query);
  if (!normalizedQuery) {
    return users.slice();
  }

  return users
    .slice()
    .sort((left, right) => {
      const scoreDiff = getMentionPrincipalScore(right, normalizedQuery) - getMentionPrincipalScore(left, normalizedQuery);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const leftName = normalizeMentionValue(left.title || left.email || left.loginName || left.id);
      const rightName = normalizeMentionValue(right.title || right.email || right.loginName || right.id);
      return leftName.localeCompare(rightName);
    });
}

export async function resolveBuiltInMentionPrincipals(query: string): Promise<IPrincipal[]> {
  if (!SPContext.isReady()) {
    return [];
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return getGraphSuggestedUsers();
  }

  if (normalizedQuery.length < MIN_REMOTE_MENTION_QUERY_LENGTH) {
    return [];
  }

  return searchGraphUsers(normalizedQuery);
}

function normalizeMentionValue(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getMentionPrincipalScore(user: IPrincipal, normalizedQuery: string): number {
  const title = normalizeMentionValue(user.title);
  const email = normalizeMentionValue(user.email);
  const loginName = normalizeMentionValue(user.loginName || user.value);
  const jobTitle = normalizeMentionValue(user.jobTitle);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return Math.max(
    getFieldScore(title, normalizedQuery, queryTokens, 1200, 1000, 900, 700),
    getFieldScore(email, normalizedQuery, queryTokens, 1150, 950, 850, 650),
    getFieldScore(loginName, normalizedQuery, queryTokens, 1125, 925, 825, 625),
    getFieldScore(jobTitle, normalizedQuery, queryTokens, 250, 200, 150, 100)
  );
}

function getFieldScore(
  value: string,
  normalizedQuery: string,
  queryTokens: string[],
  exactScore: number,
  prefixScore: number,
  tokenPrefixScore: number,
  containsScore: number
): number {
  if (!value) {
    return 0;
  }

  if (value === normalizedQuery) {
    return exactScore;
  }

  if (value.indexOf(normalizedQuery) === 0) {
    return prefixScore;
  }

  const wordScore = getWordPrefixScore(value, queryTokens);
  if (wordScore > 0) {
    return tokenPrefixScore + wordScore;
  }

  if (value.indexOf(normalizedQuery) >= 0) {
    return containsScore;
  }

  return 0;
}

function getWordPrefixScore(value: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const words = value.split(/[\s@._-]+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }

  const everyTokenMatches = queryTokens.every((token) =>
    words.some((word) => word.indexOf(token) === 0)
  );

  return everyTokenMatches ? queryTokens.length * 10 : 0;
}

async function getGraphSuggestedUsers(): Promise<IPrincipal[]> {
  const graphClient = await tryGetGraphClient();
  if (!graphClient) {
    return [];
  }

  const response = await graphClient
    .api('me/people')
    .header('ConsistencyLevel', 'eventual')
    .filter("personType/class eq 'Person' and personType/subclass eq 'OrganizationUser'")
    .orderby('displayName')
    .top(DEFAULT_MENTION_SUGGESTION_LIMIT)
    .get();

  const items = Array.isArray(response?.value) ? response.value : [];
  return dedupeMentionPrincipals(items.map(mapGraphSuggestedPersonToPrincipal).filter(hasMentionIdentity));
}

async function searchGraphUsers(query: string): Promise<IPrincipal[]> {
  const graphClient = await tryGetGraphClient();
  if (!graphClient) {
    return [];
  }

  const escapedQuery = escapeGraphFilterValue(query);
  const filter =
    "mail ne null AND (startswith(mail,'" +
    escapedQuery +
    "') OR startswith(displayName,'" +
    escapedQuery +
    "'))";

  const response = await graphClient
    .api('/users')
    .header('ConsistencyLevel', 'eventual')
    .filter(filter)
    .orderby('displayName')
    .count(true)
    .top(DEFAULT_MENTION_SUGGESTION_LIMIT)
    .get();

  const items = Array.isArray(response?.value) ? response.value : [];
  return dedupeMentionPrincipals(items.map(mapGraphUserToPrincipal).filter(hasMentionIdentity));
}

async function tryGetGraphClient(): Promise<any | undefined> {
  if (!SPContext.isReady()) {
    return undefined;
  }

  const factory = SPContext.peoplepickerContext?.msGraphClientFactory;
  if (!factory) {
    return undefined;
  }

  try {
    return await factory.getClient('3');
  } catch {
    return undefined;
  }
}

function mapGraphSuggestedPersonToPrincipal(user: any): IPrincipal {
  const scoredEmails = Array.isArray(user?.scoredEmailAddresses) ? user.scoredEmailAddresses : [];
  const firstAddress =
    scoredEmails.length > 0 ? String(scoredEmails[0]?.address || '').trim() : '';
  const upn = String(user?.userPrincipalName || '').trim();
  const email = firstAddress || upn;

  return {
    id: email || String(user?.id || '').trim(),
    email,
    title: String(user?.displayName || '').trim(),
    loginName: upn,
    department: String(user?.department || '').trim(),
    jobTitle: String(user?.jobTitle || '').trim(),
  };
}

function mapGraphUserToPrincipal(user: any): IPrincipal {
  const email = String(user?.mail || '').trim();

  return {
    id: email || String(user?.id || '').trim(),
    email,
    title: String(user?.displayName || '').trim(),
    loginName: '',
    department: '',
    jobTitle: '',
  };
}

function hasMentionIdentity(user: IPrincipal): boolean {
  return !!getMentionPrincipalKey(user);
}

function escapeGraphFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}
