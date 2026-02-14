import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import {
  ILoadingState,
  ILoadingOptions,
  IDialogState,
  IAlertOptions,
  IConfirmOptions,
  IConfirmButton,
} from './DialogService.types';

/**
 * Singleton class for managing loading overlays and dialogs
 */
class DialogServiceManager {
  private loadingStates: Map<string, ILoadingState> = new Map();
  private loaderIdCounter: number = 0;

  private dialogState: IDialogState = {
    isVisible: false,
    type: null,
    options: null,
    resolve: null,
  };

  private listeners: Set<() => void> = new Set();
  private containerElement: HTMLDivElement | null = null;
  private isDisposed: boolean = false;
  private renderToken: number = 0;

  /**
   * Generate a unique loader ID
   */
  private generateLoaderId(): string {
    return `loader-${Date.now()}-${++this.loaderIdCounter}`;
  }

  /**
   * Initialize the dialog service and mount the React container
   */
  public initialize(): void {
    if (this.containerElement) {
      return; // Already initialized
    }

    this.isDisposed = false;
    this.containerElement = document.createElement('div');
    this.containerElement.id = 'spfx-toolkit-dialog-container';
    document.body.appendChild(this.containerElement);

    // Initial render
    this.render();
  }

  /**
   * Clean up and unmount the dialog service
   */
  public dispose(): void {
    if (this.containerElement) {
      ReactDOM.unmountComponentAtNode(this.containerElement);
      if (this.containerElement.parentNode) {
        this.containerElement.parentNode.removeChild(this.containerElement);
      }
      this.containerElement = null;
    }
    this.isDisposed = true;
    this.listeners.clear();
  }

  /**
   * Subscribe to state changes
   */
  private subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  private notify(): void {
    this.listeners.forEach((callback) => callback());
    this.render();
  }

  /**
   * Render the React components
   */
  private render(): void {
    if (!this.containerElement) {
      return;
    }

    const container = this.containerElement;
    const token = ++this.renderToken;

    // Import ReactDOM dynamically to avoid bundling issues
    import('react-dom').then(({ render }) => {
      if (this.isDisposed || !this.containerElement || this.containerElement !== container) {
        return;
      }
      if (token !== this.renderToken) {
        return;
      }

      render(
        <DialogServiceRenderer
          loadingStates={Array.from(this.loadingStates.values())}
          dialogState={this.dialogState}
          onDialogDismiss={() => this.handleDialogDismiss()}
          onDialogAction={(value: any) => this.handleDialogAction(value)}
        />,
        container
      );
    });
  }

  /**
   * Show loading overlay
   * @param message - Loading message (string or JSX)
   * @param options - Loading options (containerId for scoped loading)
   * @returns Loader ID for tracking
   */
  public showLoading(message: React.ReactNode = 'Loading...', options?: ILoadingOptions): string {
    this.initialize();

    const targetContainerId = options?.containerId;

    // If containerId is provided, validate it exists
    if (targetContainerId) {
      const container = document.getElementById(targetContainerId);
      if (!container) {
        console.warn(
          `DialogService: Container '#${targetContainerId}' not found. Using global overlay instead.`
        );
        // Will use global loader instead
      }
    }

    // Check if we already have a loader for this container (or global)
    let existingLoaderId: string | null = null;
    this.loadingStates.forEach((state, id) => {
      if (state.containerId === targetContainerId) {
        existingLoaderId = id;
      }
    });

    // If updating existing loader, reuse its ID
    const loaderId = existingLoaderId || this.generateLoaderId();
    const loadingState: ILoadingState = {
      id: loaderId,
      message,
      containerId: targetContainerId && document.getElementById(targetContainerId) ? targetContainerId : undefined,
      customIcon: options?.customIcon,
      timestamp: Date.now(),
    };

    this.loadingStates.set(loaderId, loadingState);
    this.notify();
    return loaderId;
  }

  /**
   * Hide loading overlay
   * @param containerId - Optional container ID to hide specific scoped loader, or undefined to hide all
   */
  public hideLoading(containerId?: string): void {
    if (containerId === undefined) {
      // Hide all loaders
      this.loadingStates.clear();
    } else {
      // Hide specific loader by containerId
      const loadersToRemove: string[] = [];
      this.loadingStates.forEach((state, id) => {
        if (state.containerId === containerId || (containerId === '__global__' && !state.containerId)) {
          loadersToRemove.push(id);
        }
      });
      loadersToRemove.forEach((id) => this.loadingStates.delete(id));
    }
    this.notify();
  }

  /**
   * Show alert dialog
   */
  public alert(message: React.ReactNode, options?: Partial<IAlertOptions>): Promise<void> {
    this.initialize();

    const alertOptions: IAlertOptions = {
      message,
      title: options?.title || 'Alert',
      buttonText: options?.buttonText || 'OK',
      isDismissable: options?.isDismissable !== undefined ? options.isDismissable : true,
      dialogContentProps: options?.dialogContentProps,
      className: options?.className,
    };

    return new Promise<void>((resolve) => {
      this.dialogState = {
        isVisible: true,
        type: 'alert',
        options: alertOptions,
        resolve: () => resolve(),
      };
      this.notify();
    });
  }

  /**
   * Show confirm dialog
   */
  public confirm(message: React.ReactNode, options?: Partial<IConfirmOptions>): Promise<any> {
    this.initialize();

    const defaultButtons: IConfirmButton[] = [
      { text: 'OK', primary: true, value: true },
      { text: 'Cancel', value: false },
    ];

    const confirmOptions: IConfirmOptions = {
      message,
      title: options?.title || 'Confirm',
      buttons: options?.buttons || defaultButtons,
      isDismissable: options?.isDismissable !== undefined ? options.isDismissable : true,
      dialogContentProps: options?.dialogContentProps,
      className: options?.className,
    };

    return new Promise<any>((resolve) => {
      this.dialogState = {
        isVisible: true,
        type: 'confirm',
        options: confirmOptions,
        resolve,
      };
      this.notify();
    });
  }

  /**
   * Handle dialog dismissal (ESC or backdrop click)
   */
  private handleDialogDismiss(): void {
    if (this.dialogState.type === 'confirm') {
      // For confirm, dismissal returns false
      this.handleDialogAction(false);
    } else {
      // For alert, just close
      this.handleDialogAction(undefined);
    }
  }

  /**
   * Handle dialog action (button click)
   */
  private handleDialogAction(value: any): void {
    if (this.dialogState.resolve) {
      this.dialogState.resolve(value);
    }

    this.dialogState = {
      isVisible: false,
      type: null,
      options: null,
      resolve: null,
    };
    this.notify();
  }

  /**
   * Get all current loading states
   */
  public getLoadingStates(): ILoadingState[] {
    return Array.from(this.loadingStates.values());
  }

  /**
   * Get current dialog state
   */
  public getDialogState(): IDialogState {
    return { ...this.dialogState };
  }
}

/**
 * React component for rendering loading overlay and dialogs
 */
interface IDialogServiceRendererProps {
  loadingStates: ILoadingState[];
  dialogState: IDialogState;
  onDialogDismiss: () => void;
  onDialogAction: (value: any) => void;
}

const DialogServiceRenderer: React.FC<IDialogServiceRendererProps> = ({
  loadingStates,
  dialogState,
  onDialogDismiss,
  onDialogAction,
}) => {
  const globalOverlayClass = mergeStyles({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const scopedOverlayClass = mergeStyles({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Lighter opacity for scoped loaders
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const loadingContentClass = mergeStyles({
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '4px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    minWidth: '300px',
    textAlign: 'center',
  });

  // Render a single loading overlay
  const renderLoadingOverlay = (state: ILoadingState) => {
    const overlayContent = (
      <div className={state.containerId ? scopedOverlayClass : globalOverlayClass}>
        <div className={loadingContentClass}>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Use customIcon if provided, otherwise default Spinner with stable key */}
            {state.customIcon ? (
              state.customIcon
            ) : (
              <Spinner key="spinner" size={SpinnerSize.large} />
            )}
            <div style={{ fontSize: '16px', fontWeight: 500 }}>{state.message}</div>
          </Stack>
        </div>
      </div>
    );

    // If containerId is specified, render inside that container using portal
    if (state.containerId) {
      const container = document.getElementById(state.containerId);
      if (container) {
        return ReactDOM.createPortal(overlayContent, container);
      }
    }

    // Otherwise render globally
    return overlayContent;
  };

  return (
    <>
      {/* Loading Overlays */}
      {loadingStates.map((state) => (
        <React.Fragment key={state.id}>{renderLoadingOverlay(state)}</React.Fragment>
      ))}

      {/* Alert Dialog */}
      {dialogState.isVisible && dialogState.type === 'alert' && (() => {
        const alertOpts = dialogState.options as IAlertOptions;
        const dialogStyles: any = {};
        if (alertOpts?.width) dialogStyles.width = alertOpts.width;
        if (alertOpts?.maxWidth) dialogStyles.maxWidth = alertOpts.maxWidth;
        if (alertOpts?.minWidth) dialogStyles.minWidth = alertOpts.minWidth;

        return (
          <Dialog
            hidden={false}
            onDismiss={alertOpts?.isDismissable ? onDialogDismiss : undefined}
            dialogContentProps={{
              type: DialogType.normal,
              title: alertOpts?.title as any,
              styles: Object.keys(dialogStyles).length > 0 ? { inner: dialogStyles } : undefined,
              ...alertOpts?.dialogContentProps,
            }}
            modalProps={{
              isBlocking: !alertOpts?.isDismissable,
              className: alertOpts?.className,
            }}
          >
            <div>{alertOpts?.message}</div>
            <DialogFooter>
              <PrimaryButton
                text={alertOpts?.buttonText || 'OK'}
                onClick={() => onDialogAction(undefined)}
              />
            </DialogFooter>
          </Dialog>
        );
      })()}

      {/* Confirm Dialog */}
      {dialogState.isVisible && dialogState.type === 'confirm' && (() => {
        const confirmOpts = dialogState.options as IConfirmOptions;
        const buttons = confirmOpts?.buttons || [];

        // Auto-enable vertical stack if more than 3 buttons (unless explicitly set)
        const shouldStackButtons = confirmOpts?.stackButtons !== undefined
          ? confirmOpts.stackButtons
          : buttons.length > 3;

        const dialogStyles: any = {};
        if (confirmOpts?.width) dialogStyles.width = confirmOpts.width;
        if (confirmOpts?.maxWidth) dialogStyles.maxWidth = confirmOpts.maxWidth;
        if (confirmOpts?.minWidth) dialogStyles.minWidth = confirmOpts.minWidth;

        return (
          <Dialog
            hidden={false}
            onDismiss={confirmOpts?.isDismissable ? onDialogDismiss : undefined}
            dialogContentProps={{
              type: DialogType.normal,
              title: confirmOpts?.title as any,
              styles: Object.keys(dialogStyles).length > 0 ? { inner: dialogStyles } : undefined,
              ...confirmOpts?.dialogContentProps,
            }}
            modalProps={{
              isBlocking: !confirmOpts?.isDismissable,
              className: confirmOpts?.className,
            }}
          >
            <div>{confirmOpts?.message}</div>
            <DialogFooter>
              {shouldStackButtons ? (
                <Stack tokens={{ childrenGap: 8 }} styles={{ root: { width: '100%' } }}>
                  {buttons.map((button, index) => {
                    const ButtonComponent = button.primary ? PrimaryButton : DefaultButton;
                    return (
                      <ButtonComponent
                        key={index}
                        text={button.text}
                        onClick={() => onDialogAction(button.value !== undefined ? button.value : index)}
                        styles={{ root: { width: '100%' } }}
                        {...button.props}
                      />
                    );
                  })}
                </Stack>
              ) : (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  {buttons.map((button, index) => {
                    const ButtonComponent = button.primary ? PrimaryButton : DefaultButton;
                    return (
                      <ButtonComponent
                        key={index}
                        text={button.text}
                        onClick={() => onDialogAction(button.value !== undefined ? button.value : index)}
                        {...button.props}
                      />
                    );
                  })}
                </Stack>
              )}
            </DialogFooter>
          </Dialog>
        );
      })()}
    </>
  );
};

// Export singleton instance
export const DialogService = new DialogServiceManager();

/**
 * Show loading overlay with a message
 * @param message - Loading message to display (can be string or JSX)
 * @param options - Loading options (containerId for scoped loading, customIcon for custom spinner)
 * @returns Loader ID for tracking
 * @example
 * ```typescript
 * // Global loading
 * showLoading('Loading data...');
 *
 * // Scoped loading to a specific container
 * showLoading('Loading chart...', { containerId: 'chart-container' });
 *
 * // Custom loading icon (prevents spinner restart on updates)
 * showLoading('Loading...', {
 *   customIcon: <div className="custom-spinner" />
 * });
 *
 * // JSX message with custom icon
 * showLoading(
 *   <div>
 *     <strong>Loading data...</strong>
 *     <div>Please wait while we fetch your information.</div>
 *   </div>,
 *   { customIcon: <MyCustomSpinner /> }
 * );
 *
 * // ... perform async operation
 * hideLoading();
 * ```
 */
export const showLoading = (message?: React.ReactNode, options?: ILoadingOptions): string => {
  return DialogService.showLoading(message, options);
};

/**
 * Hide loading overlay
 * @param containerId - Optional container ID to hide specific scoped loader, or undefined to hide all
 * @example
 * ```typescript
 * // Hide all loaders
 * hideLoading();
 *
 * // Hide specific scoped loader
 * hideLoading('chart-container');
 *
 * // Usage with scoped loading
 * showLoading('Loading chart...', { containerId: 'chart-1' });
 * await loadData();
 * hideLoading('chart-1');
 * ```
 */
export const hideLoading = (containerId?: string): void => {
  DialogService.hideLoading(containerId);
};

/**
 * Show an alert dialog
 * @param message - Alert message (can be string or JSX)
 * @param options - Additional alert options
 * @returns Promise that resolves when the dialog is dismissed
 * @example
 * ```typescript
 * // String message
 * await alert('Operation completed successfully!');
 *
 * // JSX message
 * await alert(
 *   <div>
 *     <p>Your changes have been saved.</p>
 *     <ul>
 *       <li>Item 1 updated</li>
 *       <li>Item 2 created</li>
 *     </ul>
 *   </div>,
 *   { title: 'Success' }
 * );
 * ```
 */
export const alert = (message: React.ReactNode, options?: Partial<IAlertOptions>): Promise<void> => {
  return DialogService.alert(message, options);
};

/**
 * Show a confirm dialog
 * @param message - Confirm message (can be string or JSX)
 * @param options - Additional confirm options
 * @returns Promise that resolves with the selected button value
 * @example
 * ```typescript
 * // Simple yes/no
 * const result = await confirm('Are you sure?');
 * if (result) {
 *   // User clicked OK
 * }
 *
 * // JSX message
 * const result = await confirm(
 *   <div>
 *     <strong>Warning:</strong> This action cannot be undone.
 *     <p>Are you sure you want to proceed?</p>
 *   </div>,
 *   { title: 'Confirm Delete' }
 * );
 *
 * // Custom buttons
 * const choice = await confirm('Choose an option', {
 *   title: 'Select Action',
 *   buttons: [
 *     { text: 'Save', primary: true, value: 'save' },
 *     { text: 'Discard', value: 'discard' },
 *     { text: 'Cancel', value: 'cancel' }
 *   ]
 * });
 *
 * if (choice === 'save') {
 *   // Save action
 * }
 * ```
 */
export const confirm = (message: React.ReactNode, options?: Partial<IConfirmOptions>): Promise<any> => {
  return DialogService.confirm(message, options);
};
