/**
 * UserPersona Component Types
 * Reusable persona component with photo loading and LivePersona integration
 */

export type UserPersonaSize = 24 | 28 | 32 | 40 | 48 | 56 | 72 | 100;

export type UserPersonaDisplayMode = 'avatar' | 'name' | 'avatarAndName';

export interface IUserPersonaProps {
  /**
   * User identifier - can be email, loginName, or User Principal Name
   */
  userIdentifier: string;

  /**
   * Display name for the user
   */
  displayName: string;

  /**
   * Email address (optional, improves photo loading)
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
   * @default true
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

export interface IUserPersonaState {
  /**
   * Photo URL if successfully loaded
   */
  photoUrl: string | null;

  /**
   * Whether photo loading failed
   */
  photoLoadFailed: boolean;

  /**
   * Whether photo is currently loading
   */
  isLoadingPhoto: boolean;
}

export interface IPhotoCache {
  /**
   * Photo URL (or null if load failed)
   */
  url: string | null;

  /**
   * Timestamp when cached
   */
  timestamp: number;

  /**
   * Whether the photo load failed
   */
  failed: boolean;
}

/**
 * Default props for UserPersona component
 */
export const DefaultUserPersonaProps = {
  size: 32 as UserPersonaSize,
  displayMode: 'avatar' as UserPersonaDisplayMode,
  showLivePersona: true,
  showSecondaryText: true,
};
