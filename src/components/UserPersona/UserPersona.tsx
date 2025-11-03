import { Persona, PersonaSize } from '@fluentui/react/lib/Persona';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { CachingPessimisticRefresh } from '@pnp/queryable';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { getUserPhoto, pixelSizeToPhotoSize } from '../../utilities/userPhotoHelper';
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
  const [isDefaultPhoto, setIsDefaultPhoto] = React.useState(true);

  // Load user profile
  React.useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async () => {
      if (!isValidUserIdentifier(userIdentifier)) {
        if (isMounted) {
          setDisplayName(providedDisplayName || '');
          setEmail(providedEmail || '');
        }
        return;
      }

      const cached = getCachedProfile(normalizedIdentifier);
      if (cached) {
        if (isMounted) {
          setDisplayName(cached.profile.displayName);
          setEmail(cached.profile.email);
        }
        return;
      }

      try {
        const user = await SPContext.sp
          .using(CachingPessimisticRefresh())
          .web.ensureUser(normalizedIdentifier);

        if (!isMounted) return;

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
        if (!isMounted) return;

        SPContext.logger.warn('UserPersona failed to load profile', {
          error,
          userIdentifier,
        });
        setDisplayName(providedDisplayName || '');
        setEmail(providedEmail || normalizedIdentifier);
      }
    };

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [userIdentifier, providedDisplayName, providedEmail, normalizedIdentifier]);

  // Load and validate user photo
  React.useEffect(() => {
    let isMounted = true;

    const loadPhoto = async () => {
      if (!isValidUserIdentifier(normalizedIdentifier)) {
        if (isMounted) {
          setPhotoUrl(undefined);
        }
        return;
      }

      const photoSize = pixelSizeToPhotoSize(size);

      try {
        const photo = await getUserPhoto(siteUrl, normalizedIdentifier, photoSize);

        if (!isMounted) return;

        setIsDefaultPhoto(!photo);
        setPhotoUrl(photo);
      } catch (error) {
        if (!isMounted) return;

        SPContext.logger.warn('UserPersona failed to load photo', {
          error,
          userIdentifier,
        });
        setIsDefaultPhoto(true);
        setPhotoUrl(undefined);
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
    };
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
        imageInitials={isDefaultPhoto ? initialsToShow : undefined}
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
