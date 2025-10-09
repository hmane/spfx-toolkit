import { Persona, PersonaSize } from '@fluentui/react/lib/Persona';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { SPComponentLoader } from '@microsoft/sp-loader';
import { CachingPessimisticRefresh } from '@pnp/queryable';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { DefaultUserPersonaProps, IUserPersonaProps, IUserProfile, UserPersonaSize } from './types';
import './UserPersona.css';
import {
  cacheProfile,
  getCachedProfile,
  getInitials,
  getPersonaColor,
  isValidUserIdentifier,
  normalizeUserIdentifier,
} from './UserPersonaUtils';

// SharePoint default image hashes
const DEFAULT_PERSONA_IMG_HASH = '7ad602295f8386b7615b582d87bcc294';
const DEFAULT_IMAGE_PLACEHOLDER_HASH = '4a48f26592f4e1498d7a478a4c48609c';
const MD5_MODULE_ID = '8494e7d7-6b99-47b2-a741-59873e42f16f';

/**
 * Load SP component by ID
 */
const loadSPComponentById = async (componentId: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    SPComponentLoader.loadComponentById(componentId)
      .then((component: any) => {
        resolve(component);
      })
      .catch(error => {
        reject(error);
      });
  });
};

/**
 * Get image as base64
 */
const getImageBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get MD5Hash for the image url
 */
const getMd5HashForUrl = async (url: string): Promise<string> => {
  const library: any = await loadSPComponentById(MD5_MODULE_ID);
  try {
    const md5Hash = library.Md5Hash;
    if (md5Hash) {
      const convertedHash: string = md5Hash(url);
      return convertedHash;
    }
  } catch {
    return url;
  }
  return url;
};

/**
 * Gets user photo
 */
const getUserPhoto = async (
  siteUrl: string,
  userId: string,
  size: 'S' | 'M' | 'L'
): Promise<string | undefined> => {
  try {
    const personaImgUrl = `${siteUrl}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(
      userId
    )}`;
    const base64 = await getImageBase64(personaImgUrl);
    const hash = await getMd5HashForUrl(base64);

    if (hash !== DEFAULT_PERSONA_IMG_HASH && hash !== DEFAULT_IMAGE_PLACEHOLDER_HASH) {
      return 'data:image/png;base64,' + base64;
    } else {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
};

export const UserPersona: React.FC<IUserPersonaProps> = props => {
  const {
    userIdentifier,
    displayName: providedDisplayName,
    email: providedEmail,
    size = DefaultUserPersonaProps.size,
    displayMode = DefaultUserPersonaProps.displayMode,
    showLivePersona = DefaultUserPersonaProps.showLivePersona,
    showSecondaryText = DefaultUserPersonaProps.showSecondaryText,
    onClick,
    className,
    title,
    customInitials,
    customInitialsColor,
  } = props;

  const [displayName, setDisplayName] = React.useState(providedDisplayName || '');
  const [email, setEmail] = React.useState(providedEmail || '');
  const [photoUrl, setPhotoUrl] = React.useState<string | undefined>(undefined);

  const siteUrl = SPContext.spfxContext.pageContext.web.absoluteUrl;
  const normalizedIdentifier = normalizeUserIdentifier(userIdentifier);

  // Load user profile
  React.useEffect(() => {
    const loadUserProfile = async () => {
      if (!isValidUserIdentifier(userIdentifier)) {
        setDisplayName(providedDisplayName || '');
        setEmail(providedEmail || '');
        return;
      }

      const cached = getCachedProfile(normalizedIdentifier);
      if (cached) {
        setDisplayName(cached.profile.displayName);
        setEmail(cached.profile.email);
        return;
      }

      try {
        const user = await SPContext.sp
          .using(CachingPessimisticRefresh())
          .web.ensureUser(normalizedIdentifier);

        const profile: IUserProfile = {
          displayName: user.data.Title || providedDisplayName || '',
          email: user.data.Email || providedEmail || normalizedIdentifier,
          loginName: user.data.LoginName || normalizedIdentifier,
        };

        cacheProfile(normalizedIdentifier, profile);
        setDisplayName(profile.displayName);
        setEmail(profile.email);

        SPContext.logger.info('UserPersona profile loaded', {
          userIdentifier,
          displayName: profile.displayName,
        });
      } catch (error) {
        SPContext.logger.warn('UserPersona failed to load profile', {
          error,
          userIdentifier,
        });
        setDisplayName(providedDisplayName || '');
        setEmail(providedEmail || normalizedIdentifier);
      }
    };

    loadUserProfile();
  }, [userIdentifier, providedDisplayName, providedEmail, normalizedIdentifier]);

  // Load and validate user photo
  React.useEffect(() => {
    const loadPhoto = async () => {
      if (!isValidUserIdentifier(normalizedIdentifier)) {
        setPhotoUrl(undefined);
        return;
      }

      const photoSize = size <= 32 ? 'S' : size <= 48 ? 'M' : 'L';

      try {
        const photo = await getUserPhoto(siteUrl, normalizedIdentifier, photoSize);
        setPhotoUrl(photo);
      } catch (error) {
        SPContext.logger.warn('UserPersona failed to load photo', {
          error,
          userIdentifier,
        });
        setPhotoUrl(undefined);
      }
    };

    loadPhoto();
  }, [normalizedIdentifier, size, siteUrl, userIdentifier]);

  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick(userIdentifier, displayName);
    }
  }, [onClick, userIdentifier, displayName]);

  const getFluentPersonaSize = (personaSize: UserPersonaSize): PersonaSize => {
    const sizeMap: Record<UserPersonaSize, PersonaSize> = {
      24: PersonaSize.size24,
      28: PersonaSize.size28,
      32: PersonaSize.size32,
      40: PersonaSize.size40,
      48: PersonaSize.size48,
      56: PersonaSize.size56,
      72: PersonaSize.size72,
      100: PersonaSize.size100,
    };
    return sizeMap[personaSize];
  };

  const renderContent = () => {
    const initialsToShow = customInitials || getInitials(displayName);
    const colorToUse = customInitialsColor ?? getPersonaColor(displayName);

    if (displayMode === 'nameOnly') {
      return <div className='user-persona-name'>{displayName}</div>;
    }

    const personaElement = (
      <Persona
        size={getFluentPersonaSize(size)}
        text={displayName}
        secondaryText={showSecondaryText && email ? email : undefined}
        imageUrl={photoUrl}
        imageInitials={initialsToShow}
        initialsColor={colorToUse}
        hidePersonaDetails={displayMode === 'avatar'}
        coinSize={size}
      />
    );

    if (displayMode === 'avatar') {
      const avatar = (
        <div className='user-persona-avatar-wrapper' style={{ width: size, height: size }}>
          {showLivePersona && isValidUserIdentifier(normalizedIdentifier) ? (
            <LivePersona
              upn={normalizedIdentifier}
              template={personaElement}
              serviceScope={SPContext.spfxContext.serviceScope}
            />
          ) : (
            personaElement
          )}
        </div>
      );

      return avatar;
    }

    return (
      <div className='user-persona-text'>
        {showLivePersona && isValidUserIdentifier(normalizedIdentifier) ? (
          <LivePersona
            upn={normalizedIdentifier}
            template={personaElement}
            serviceScope={SPContext.spfxContext.serviceScope}
          />
        ) : (
          personaElement
        )}
      </div>
    );
  };

  const containerClassName = [
    'user-persona-container',
    `user-persona-size-${size}`,
    onClick ? 'clickable' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const tooltipContent =
    title || (displayMode === 'avatar' ? `${displayName}${email ? ` (${email})` : ''}` : undefined);

  const content = (
    <div
      className={containerClassName}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent default space scrolling
                handleClick();
              }
            }
          : undefined
      }
    >
      {renderContent()}
    </div>
  );

  if (tooltipContent && displayMode === 'avatar') {
    return <TooltipHost content={tooltipContent}>{content}</TooltipHost>;
  }

  return content;
};
