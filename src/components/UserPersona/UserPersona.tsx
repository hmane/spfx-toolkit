import { Persona, PersonaSize, TooltipHost } from '@fluentui/react';
import { LivePersona } from '@pnp/spfx-controls-react/lib/LivePersona';
import * as React from 'react';
import { SPContext } from '../../utilities/context';
import { DefaultUserPersonaProps, IUserPersonaProps, UserPersonaSize } from './types';
import './UserPersona.css';
import {
  getInitials,
  getPersonaColor,
  getPhotoSize,
  getUserPhotoUrl,
  isValidForPhotoLoad,
  normalizeUserIdentifier,
} from './UserPersonaUtils';

export const UserPersona: React.FC<IUserPersonaProps> = props => {
  const {
    userIdentifier,
    displayName,
    email,
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

  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [photoLoadFailed, setPhotoLoadFailed] = React.useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = React.useState(false);

  const siteUrl = SPContext.spfxContext.pageContext.web.absoluteUrl;

  // Load user photo on mount
  React.useEffect(() => {
    const loadPhoto = async () => {
      const identifier = email || normalizeUserIdentifier(userIdentifier);

      if (!isValidForPhotoLoad(identifier)) {
        setPhotoLoadFailed(true);
        setIsLoadingPhoto(false);
        return;
      }

      setIsLoadingPhoto(true);

      try {
        const photoSize = getPhotoSize(size);
        const photoUrlAttempt = getUserPhotoUrl(siteUrl, identifier, photoSize);

        // Load and validate the image
        const img = new Image();
        let timeoutId: number;

        const loadPromise = new Promise<boolean>(resolve => {
          img.onload = () => {
            clearTimeout(timeoutId);
            // Only reject if it's clearly the default 1x1 transparent pixel
            // or the generic placeholder (typically 10x10 or very small)
            if ((img.width === 1 && img.height === 1) || (img.width <= 10 && img.height <= 10)) {
              resolve(false);
            } else {
              resolve(true);
            }
          };

          img.onerror = () => {
            clearTimeout(timeoutId);
            resolve(false);
          };

          // 5 second timeout
          timeoutId = window.setTimeout(() => {
            img.src = '';
            resolve(false);
          }, 5000);
        });

        img.src = photoUrlAttempt;
        const isValidPhoto = await loadPromise;

        if (isValidPhoto) {
          setPhotoUrl(photoUrlAttempt);
          setPhotoLoadFailed(false);
        } else {
          setPhotoUrl(null);
          setPhotoLoadFailed(true);
        }
      } catch (error) {
        SPContext.logger.warn('UserPersona failed to load photo', {
          error,
          userIdentifier,
          displayName,
        });
        setPhotoUrl(null);
        setPhotoLoadFailed(true);
      } finally {
        setIsLoadingPhoto(false);
      }
    };

    loadPhoto();
  }, [userIdentifier, email, size, siteUrl, displayName]);

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

  const renderAvatar = () => {
    const initialsToShow = customInitials || getInitials(displayName);
    const colorToUse = customInitialsColor ?? getPersonaColor(displayName);
    const upnForLivePersona = email || normalizeUserIdentifier(userIdentifier);

    // Loading state
    if (isLoadingPhoto) {
      return (
        <div
          className={`user-persona-loading user-persona-size-${size}`}
          style={{ width: size, height: size }}
        />
      );
    }

    // Photo loaded successfully
    if (photoUrl && !photoLoadFailed) {
      return (
        <div className='user-persona-avatar-wrapper' style={{ width: size, height: size }}>
          <img
            src={photoUrl}
            alt={displayName}
            className='user-persona-avatar-photo'
            style={{ width: size, height: size }}
          />
          {showLivePersona && isValidForPhotoLoad(upnForLivePersona) && (
            <div className='user-persona-live-overlay'>
              <LivePersona
                upn={upnForLivePersona}
                disableHover={false}
                serviceScope={SPContext.spfxContext.serviceScope}
              />
            </div>
          )}
        </div>
      );
    }

    // Photo failed or not available - show initials
    return (
      <div className='user-persona-avatar-wrapper' style={{ width: size, height: size }}>
        <Persona
          size={getFluentPersonaSize(size)}
          text=''
          imageInitials={initialsToShow}
          initialsColor={colorToUse}
          className='user-persona-initials'
          styles={{
            root: { width: size, height: size },
            primaryText: { display: 'none' },
          }}
        />
        {showLivePersona && isValidForPhotoLoad(upnForLivePersona) && (
          <div className='user-persona-live-overlay'>
            <LivePersona
              upn={upnForLivePersona}
              disableHover={false}
              serviceScope={SPContext.spfxContext.serviceScope}
            />
          </div>
        )}
      </div>
    );
  };

  const renderText = () => {
    if (displayMode === 'avatar') {
      return null;
    }

    return (
      <div className='user-persona-text'>
        <div className='user-persona-name'>{displayName}</div>
        {showSecondaryText && email && displayMode === 'avatarAndName' && (
          <div className='user-persona-email'>{email}</div>
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
      onKeyPress={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
              }
            }
          : undefined
      }
    >
      {renderAvatar()}
      {renderText()}
    </div>
  );

  if (tooltipContent && displayMode === 'avatar') {
    return <TooltipHost content={tooltipContent}>{content}</TooltipHost>;
  }

  return content;
};
