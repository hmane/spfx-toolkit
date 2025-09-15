import { IconButton } from '@fluentui/react/lib/Button';
import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MaximizedViewProps } from '../Card.types';
import { DEFAULT_ICONS, Z_INDEX } from '../utils/constants';

/**
 * FIXED Enhanced maximized view props
 */
export interface FixedMaximizedViewProps extends MaximizedViewProps {
  showCloseButton?: boolean; // FIXED: Control close button visibility
}

/**
 * FIXED Enhanced maximized view component - removed duplicate restore button
 */
export const MaximizedView: React.FC<FixedMaximizedViewProps> = ({
  cardId,
  children,
  onRestore,
  className = '',
  style,
  backdrop = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  restoreIcon = DEFAULT_ICONS.RESTORE,
  showCloseButton = true, // FIXED: Only show one close button
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previous focus element and body overflow
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalOverflow;

      // Restore focus when unmounting
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        try {
          previousFocusRef.current.focus();
        } catch (error) {
          // Focus might not be available, ignore error
        }
      }
    };
  }, []);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onRestore();
      }
    },
    [closeOnEscape, onRestore]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnBackdropClick && event.target === backdropRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onRestore();
      }
    },
    [closeOnBackdropClick, onRestore]
  );

  // Handle close button click
  const handleCloseClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onRestore();
    },
    [onRestore]
  );

  // Set up event listeners
  useEffect(() => {
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown, true);
    }

    // Focus management - focus the content container
    if (contentRef.current) {
      contentRef.current.focus();
    }

    return () => {
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown, true);
      }
    };
  }, [closeOnEscape, handleKeyDown]);

  // Backdrop styles
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: Z_INDEX.MAXIMIZED_CARD,
    backgroundColor: backdrop ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
    padding: 0,
    margin: 0,
    backdropFilter: backdrop ? 'blur(4px)' : 'none',
    animation: 'fadeIn 300ms ease-out',
  };

  // Content styles for full-screen experience
  const contentStyle: React.CSSProperties = {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    maxWidth: '100vw',
    maxHeight: '100vh',
    backgroundColor: 'var(--white, #ffffff)',
    borderRadius: 0,
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    outline: 'none',
    margin: 0,
    padding: 0,
    ...style,
  };

  // FIXED: Close button styles - only show when enabled
  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: Z_INDEX.MAXIMIZED_CARD + 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--neutralLight, #edebe9)',
    borderRadius: '50%',
    width: 40,
    height: 40,
    minWidth: 40,
    padding: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const maximizedContent = (
    <div
      ref={backdropRef}
      className={`spfx-card-maximized-backdrop ${className}`}
      style={backdropStyle}
      onClick={handleBackdropClick}
      role='dialog'
      aria-modal='true'
      aria-labelledby={`card-header-${cardId}`}
      aria-describedby={`card-content-${cardId}`}
    >
      <div
        ref={contentRef}
        className='spfx-card-maximized-content'
        style={contentStyle}
        tabIndex={-1}
        onClick={e => e.stopPropagation()} // Prevent backdrop click when clicking content
      >
        {/* FIXED: Close Button - Only show when enabled */}
        {showCloseButton && (
          <IconButton
            iconProps={{ iconName: restoreIcon }}
            title='Restore card to normal size'
            onClick={handleCloseClick}
            style={closeButtonStyle}
            styles={{
              root: {
                selectors: {
                  ':hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  },
                  ':active': {
                    transform: 'scale(0.95)',
                  },
                  ':focus': {
                    outline: '2px solid var(--themePrimary, #0078d4)',
                    outlineOffset: '2px',
                  },
                },
              },
              icon: {
                fontSize: '16px',
                color: 'var(--neutralPrimary, #323130)',
              },
            }}
          />
        )}

        {/* Card Content - Enhanced for maximized view */}
        <div
          className='spfx-card-maximized-body'
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  // Render into portal
  return createPortal(maximizedContent, document.body);
};

/**
 * Alternative custom maximized view with configurable sizing
 */
export const CustomMaximizedView: React.FC<
  MaximizedViewProps & {
    width?: string | number;
    height?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
    centered?: boolean;
  }
> = ({
  cardId,
  children,
  onRestore,
  className = '',
  style,
  backdrop = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  restoreIcon = DEFAULT_ICONS.RESTORE,
  width = '95vw',
  height = '95vh',
  maxWidth = '1400px',
  maxHeight = '900px',
  centered = true,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault();
        onRestore();
      }
    },
    [closeOnEscape, onRestore]
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnBackdropClick && event.currentTarget === event.target) {
        onRestore();
      }
    },
    [closeOnBackdropClick, onRestore]
  );

  useEffect(() => {
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown);
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus management
    if (contentRef.current) {
      contentRef.current.focus();
    }

    return () => {
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown);
      }
      document.body.style.overflow = originalOverflow;
    };
  }, [closeOnEscape, handleKeyDown]);

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: Z_INDEX.MAXIMIZED_CARD,
    backgroundColor: backdrop ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
    display: 'flex',
    alignItems: centered ? 'center' : 'flex-start',
    justifyContent: centered ? 'center' : 'flex-start',
    padding: '20px',
    backdropFilter: backdrop ? 'blur(2px)' : 'none',
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
    maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
    backgroundColor: 'var(--white, #ffffff)',
    borderRadius: '8px',
    boxShadow: '0 25.6px 57.6px 0 rgba(0, 0, 0, 0.22), 0 4.8px 14.4px 0 rgba(0, 0, 0, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    outline: 'none',
    ...style,
  };

  const maximizedContent = (
    <div
      ref={backdropRef}
      className={`spfx-card-custom-maximized-backdrop ${className}`}
      style={backdropStyle}
      onClick={handleBackdropClick}
      role='dialog'
      aria-modal='true'
      aria-labelledby={`card-header-${cardId}`}
    >
      <div
        ref={contentRef}
        className='spfx-card-custom-maximized-content'
        style={contentStyle}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Close Button */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1,
          }}
        >
          <IconButton
            iconProps={{ iconName: restoreIcon }}
            title='Restore card'
            onClick={onRestore}
            styles={{
              root: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid var(--neutralLight, #edebe9)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
              },
            }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(maximizedContent, document.body);
};

/**
 * Inject required CSS animations for maximized views
 */
const injectMaximizedAnimations = () => {
  const styleId = 'spfx-maximized-animations';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes maximizeIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes maximizeOut {
      from {
        transform: scale(1);
        opacity: 1;
      }
      to {
        transform: scale(0.9);
        opacity: 0;
      }
    }

    /* Enhanced maximized content styles */
    .spfx-card-maximized-content,
    .spfx-card-custom-maximized-content {
      animation: maximizeIn 300ms ease-out;
    }

    .spfx-card-maximized-content:focus {
      outline: none;
    }

    /* Ensure proper layout in maximized view */
    .spfx-card-maximized-content .spfx-card {
      height: 100%;
      width: 100%;
      border: none;
      border-radius: 0;
      box-shadow: none;
      display: flex;
      flex-direction: column;
    }

    .spfx-card-maximized-content .spfx-card-header-fixed {
      flex-shrink: 0;
      border-radius: 0;
    }

    .spfx-card-maximized-content .spfx-card-content {
      flex: 1;
      overflow: auto;
      max-height: none !important;
      opacity: 1 !important;
    }

    .spfx-card-maximized-content .spfx-card-content .spfx-card-body {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .spfx-card-maximized-content .spfx-card-footer {
      flex-shrink: 0;
      margin-top: auto;
      display: block !important;
      border-radius: 0;
    }

    /* Responsive maximized view */
    @media (max-width: 768px) {
      .spfx-card-maximized-content,
      .spfx-card-custom-maximized-content {
        margin: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
      }

      .spfx-card-maximized-backdrop,
      .spfx-card-custom-maximized-backdrop {
        padding: 0 !important;
      }

      .spfx-card-maximized-content .spfx-card-close-btn {
        top: 12px !important;
        right: 12px !important;
        width: 36px !important;
        height: 36px !important;
      }
    }

    /* High contrast mode */
    @media (forced-colors: active) {
      .spfx-card-maximized-content,
      .spfx-card-custom-maximized-content {
        border: 2px solid ButtonBorder;
        background: ButtonFace;
      }

      .spfx-card-maximized-backdrop,
      .spfx-card-custom-maximized-backdrop {
        background: rgba(0, 0, 0, 0.8);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .spfx-card-maximized-backdrop,
      .spfx-card-maximized-content,
      .spfx-card-custom-maximized-content {
        animation: none !important;
      }
    }

    /* Print mode - hide maximized views */
    @media print {
      .spfx-card-maximized-backdrop,
      .spfx-card-custom-maximized-backdrop {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);
};

// Initialize animations when module loads
if (typeof document !== 'undefined') {
  injectMaximizedAnimations();
}

export default MaximizedView;
