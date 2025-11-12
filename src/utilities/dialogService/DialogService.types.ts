import * as React from 'react';
import { IButtonProps } from '@fluentui/react/lib/Button';
import { IDialogContentProps } from '@fluentui/react/lib/Dialog';

/**
 * Type for content that can be either string or JSX
 */
export type DialogContent = string | React.ReactNode;

/**
 * Configuration for confirm dialog buttons
 */
export interface IConfirmButton {
  /**
   * Button text to display
   */
  text: string;

  /**
   * Whether this is the primary action button
   * @default false
   */
  primary?: boolean;

  /**
   * Additional button properties from Fluent UI
   */
  props?: Partial<IButtonProps>;

  /**
   * Value returned when this button is clicked
   */
  value?: any;
}

/**
 * Configuration for confirm dialog
 */
export interface IConfirmOptions {
  /**
   * Dialog title/heading (can be string or JSX)
   */
  title?: DialogContent;

  /**
   * Dialog message/content (can be string or JSX)
   */
  message: DialogContent;

  /**
   * Array of buttons to display
   * @default [{ text: 'OK', primary: true, value: true }, { text: 'Cancel', value: false }]
   */
  buttons?: IConfirmButton[];

  /**
   * Additional dialog content properties
   */
  dialogContentProps?: Partial<IDialogContentProps>;

  /**
   * Whether the dialog can be dismissed by clicking outside or pressing ESC
   * @default true
   */
  isDismissable?: boolean;

  /**
   * Custom CSS class name for the dialog
   */
  className?: string;

  /**
   * Dialog width (CSS value: '400px', '50%', 'auto', etc.)
   * @default undefined (Fluent UI default)
   */
  width?: string;

  /**
   * Dialog max width (CSS value: '600px', '90vw', etc.)
   * @default undefined (Fluent UI default: 340px)
   */
  maxWidth?: string;

  /**
   * Dialog min width (CSS value: '300px', etc.)
   * @default undefined
   */
  minWidth?: string;

  /**
   * Stack buttons vertically when true, horizontally when false
   * @default false (horizontal), auto-enables when > 3 buttons
   */
  stackButtons?: boolean;
}

/**
 * Configuration for alert dialog
 */
export interface IAlertOptions {
  /**
   * Alert title/heading (can be string or JSX)
   */
  title?: DialogContent;

  /**
   * Alert message/content (can be string or JSX)
   */
  message: DialogContent;

  /**
   * Button text
   * @default 'OK'
   */
  buttonText?: string;

  /**
   * Additional dialog content properties
   */
  dialogContentProps?: Partial<IDialogContentProps>;

  /**
   * Whether the dialog can be dismissed by clicking outside or pressing ESC
   * @default true
   */
  isDismissable?: boolean;

  /**
   * Custom CSS class name for the dialog
   */
  className?: string;

  /**
   * Dialog width (CSS value: '400px', '50%', 'auto', etc.)
   * @default undefined (Fluent UI default)
   */
  width?: string;

  /**
   * Dialog max width (CSS value: '600px', '90vw', etc.)
   * @default undefined (Fluent UI default: 340px)
   */
  maxWidth?: string;

  /**
   * Dialog min width (CSS value: '300px', etc.)
   * @default undefined
   */
  minWidth?: string;
}

/**
 * Options for loading overlay
 */
export interface ILoadingOptions {
  /**
   * Optional container ID to scope the loading overlay to a specific element
   * If not provided, loading will be global (full screen)
   */
  containerId?: string;

  /**
   * Custom loading indicator (replaces the default Fluent UI Spinner)
   * Can be any React element (e.g., custom spinner, animated icon, etc.)
   */
  customIcon?: React.ReactNode;
}

/**
 * Internal state for a single loading overlay
 */
export interface ILoadingState {
  /**
   * Unique identifier for this loader
   */
  id: string;

  /**
   * Loading message content
   */
  message: DialogContent;

  /**
   * Optional container ID for scoped loading
   * If undefined, loader is global
   */
  containerId?: string;

  /**
   * Custom loading icon (if provided)
   */
  customIcon?: React.ReactNode;

  /**
   * Timestamp when loader was created
   */
  timestamp: number;
}

/**
 * Internal state for dialog
 */
export interface IDialogState {
  isVisible: boolean;
  type: 'alert' | 'confirm' | null;
  options: IAlertOptions | IConfirmOptions | null;
  resolve: ((value: any) => void) | null;
}
