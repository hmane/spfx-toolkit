/**
 * UserPersona Component Types
 * Reusable persona component with automatic profile fetching and photo loading
 */

export type UserPersonaSize = 24 | 28 | 32 | 40 | 48 | 56 | 72 | 100;

export type UserPersonaDisplayMode = 'avatar' | 'nameOnly' | 'avatarAndName';

export interface IUserPersonaProps {
  /**
   * User identifier - can be email, loginName, or User Principal Name
   */
  userIdentifier: string;

  /**
   * Display name for the user (optional - will be fetched from profile if not provided)
   */
  displayName?: string;

  /**
   * Email address (optional - will be fetched from profile if not provided)
   */
  email?: string;

  /**
   * Size of the avatar in pixels
   * @default 32
   */
  size?: UserPersonaSize;

  /**
   * Display mode for the persona
   * @default 'avatar'
   */
  displayMode?: UserPersonaDisplayMode;

  /**
   * Whether to show LivePersona hover card
   * @default false
   */
  showLivePersona?: boolean;

  /**
   * Optional click handler
   */
  onClick?: (userIdentifier: string, displayName: string) => void;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional title/tooltip text (overrides default)
   */
  title?: string;

  /**
   * Whether to show secondary text (email) in avatarAndName mode
   * @default true
   */
  showSecondaryText?: boolean;

  /**
   * Custom initials (overrides auto-generated)
   */
  customInitials?: string;

  /**
   * Custom initials color
   */
  customInitialsColor?: number;
}

export interface IUserProfile {
  /**
   * Display name from user profile
   */
  displayName: string;

  /**
   * Email from user profile
   */
  email: string;

  /**
   * Login name
   */
  loginName: string;
}

export interface IProfileCache {
  /**
   * User profile data
   */
  profile: IUserProfile;

  /**
   * Timestamp when cached
   */
  timestamp: number;
}

/**
 * Default props for UserPersona component
 */
export const DefaultUserPersonaProps = {
  size: 32 as UserPersonaSize,
  displayMode: 'avatar' as UserPersonaDisplayMode,
  showLivePersona: false,
  showSecondaryText: true,
};
