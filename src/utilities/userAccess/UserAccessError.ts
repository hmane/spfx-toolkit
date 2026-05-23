import type { ListRef } from './types';

export type UserAccessErrorCode =
  | 'USER_NOT_FOUND'
  | 'LIST_NOT_FOUND'
  | 'ITEM_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface IUserAccessErrorContext {
  login?: string;
  listRef?: ListRef;
  itemId?: number;
  cause?: unknown;
}

export class UserAccessError extends Error {
  public readonly code: UserAccessErrorCode;
  public readonly login?: string;
  public readonly listRef?: ListRef;
  public readonly itemId?: number;
  public readonly cause?: unknown;

  constructor(
    code: UserAccessErrorCode,
    message: string,
    context: IUserAccessErrorContext = {}
  ) {
    super(message);
    this.name = 'UserAccessError';
    this.code = code;
    this.login = context.login;
    this.listRef = context.listRef;
    this.itemId = context.itemId;
    this.cause = context.cause;
    Object.setPrototypeOf(this, UserAccessError.prototype);
  }
}
