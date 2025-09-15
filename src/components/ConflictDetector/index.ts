// =====================================================================================
// SPFx Conflict Detection Utility - Main Export File
// =====================================================================================

import { getComponentsForScenario, getTemplateForScenario } from './ConflictDetectionComponents';
import { ConflictDetector } from './ConflictDetector';
import {
  ConflictDetectionOptions,
  ConflictInfo,
  ConflictSeverity,
  EnhancedConflictInfo,
} from './types';

// =====================================================================================
// Core Exports
// =====================================================================================

// Core class
export { ConflictDetector } from './ConflictDetector';

// All types and interfaces
export type {
  ConflictActionHandler, ConflictDetectionEventHandler, ConflictDetectionOptions, ConflictDetectionResult, ConflictDetectionState, ConflictInfo, ConflictResolutionAction, ConflictSeverity,
  EnhancedConflictInfo, PollingControl, PreSaveCheckResult, SharePointApiResponse, SharePointListItem, UseConflictDetectionProps, UseConflictDetectionReturn
} from './types';

// Constants and presets
export {
  CONFLICT_DETECTION_CONSTANTS, CONFLICT_DETECTION_PRESETS, ConflictDetectionError, DEFAULT_CONFLICT_OPTIONS, isConflictInfo,
  isSharePointListItem
} from './types';

// =====================================================================================
// React Hooks
// =====================================================================================

export {
  useConflictDetection, useConflictMonitor,
  useFormConflictDetection, usePreSaveConflictCheck
} from './useConflictDetection';

// =====================================================================================
// React Context and Provider
// =====================================================================================

export {
  ConflictDetectionFormProvider, ConflictDetectionProvider, useConflictContext,
  withConflictDetection
} from './ConflictContext';

export type {
  ConflictDetectionFormProviderProps, WithConflictDetectionProps
} from './ConflictContext';

// =====================================================================================
// UI Components
// =====================================================================================

// Notification components
export {
  ConflictNotification, ConflictNotificationBar, ConflictToast, SimpleConflictNotification, useConflictNotification
} from './ConflictNotificationBar';

// Dialog components
export {
  ConflictHandler, ConflictResolutionDialog,
  EnhancedConflictResolutionDialog, useConflictResolutionDialog
} from './ConflictResolutionDialog';

// =====================================================================================
// Component Helpers (from separate file)
// =====================================================================================

export {
  ComponentCombinations,
  ConflictDetectionTemplates,
  getComponentsForScenario,
  getTemplateForScenario,
  UsageGuide
} from './ConflictDetectionComponents';

// =====================================================================================
// Utility Functions
// =====================================================================================

export const ConflictDetectionUtils = {
  /**
   * Format dates consistently across components
   */
  formatDateTime: (date: Date): string => {
    try {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toString();
    }
  },

  /**
   * Format dates with relative time
   */
  formatRelativeDateTime: (date: Date): string => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

      return ConflictDetectionUtils.formatDateTime(date);
    } catch (error) {
      console.error('Error formatting relative date:', error);
      return ConflictDetectionUtils.formatDateTime(date);
    }
  },

  /**
   * Check if conflict is recent
   */
  isRecentConflict: (conflictInfo: ConflictInfo, thresholdMinutes = 5): boolean => {
    if (!conflictInfo.hasConflict) return false;

    try {
      const now = new Date().getTime();
      const conflictTime = new Date(conflictInfo.lastModified).getTime();
      const threshold = thresholdMinutes * 60 * 1000;
      return now - conflictTime < threshold;
    } catch (error) {
      console.error('Error checking recent conflict:', error);
      return false;
    }
  },

  /**
   * Get conflict severity
   */
  getConflictSeverity: (conflictInfo: ConflictInfo): ConflictSeverity => {
    if (!conflictInfo.hasConflict) return 'low';

    try {
      const now = new Date().getTime();
      const conflictTime = new Date(conflictInfo.lastModified).getTime();
      const timeDiff = now - conflictTime;

      const oneMinute = 60 * 1000;
      const fiveMinutes = 5 * 60 * 1000;

      if (timeDiff < oneMinute) return 'high';
      if (timeDiff < fiveMinutes) return 'medium';
      return 'low';
    } catch (error) {
      console.error('Error determining conflict severity:', error);
      return 'low';
    }
  },

  /**
   * Create enhanced conflict info
   */
  enhanceConflictInfo: (conflictInfo: ConflictInfo): EnhancedConflictInfo => {
    try {
      const timeSinceConflict =
        new Date().getTime() - new Date(conflictInfo.lastModified).getTime();

      return {
        ...conflictInfo,
        severity: ConflictDetectionUtils.getConflictSeverity(conflictInfo),
        timeSinceConflict,
        isRecentConflict: ConflictDetectionUtils.isRecentConflict(conflictInfo),
      };
    } catch (error) {
      console.error('Error enhancing conflict info:', error);
      return {
        ...conflictInfo,
        severity: 'low',
        timeSinceConflict: 0,
        isRecentConflict: false,
      };
    }
  },

  /**
   * Validate SP context and parameters
   */
  validateParameters: (
    sp: any,
    listId: string,
    itemId: number
  ): { isValid: boolean; error?: string } => {
    if (!sp) {
      return { isValid: false, error: 'SP context is required' };
    }

    if (!listId?.trim()) {
      return { isValid: false, error: 'Valid listId is required' };
    }

    if (!itemId || itemId <= 0) {
      return { isValid: false, error: 'Valid itemId is required' };
    }

    return { isValid: true };
  },
} as const;

// =====================================================================================
// Quick Access Functions
// =====================================================================================

/**
 * Get components for a specific scenario
 */
export const getConflictComponents = (scenario: string = 'complete'): readonly string[] => {
  return getComponentsForScenario(scenario);
};

/**
 * Get template code for a scenario
 */
export const getConflictTemplate = (scenario: string = 'basic'): string => {
  return getTemplateForScenario(scenario);
};

/**
 * Create a new ConflictDetector instance
 */
export const createConflictDetector = (
  sp: any,
  listId: string,
  itemId: number,
  options?: Partial<ConflictDetectionOptions>
) => {
  return new ConflictDetector(sp, listId, itemId, options);
};

// =====================================================================================
// Package Information
// =====================================================================================

export const packageInfo = {
  name: 'spfx-conflict-detection',
  version: '1.1.0',
  description:
    'SharePoint Framework utility for detecting and handling concurrent editing conflicts',
  author: 'SPFx Community',
  license: 'MIT',
  dependencies: {
    required: ['@pnp/sp', '@fluentui/react', 'react', 'typescript'],
    optional: ['@pnp/logging', '@pnp/common'],
  },
  features: [
    'Real-time conflict detection using SharePoint ETags',
    'Multiple integration patterns (Hooks, Context, Imperative API)',
    'Fluent UI v8 components',
    'TypeScript support',
    'Memory leak prevention',
    'Accessibility support',
  ],
} as const;
