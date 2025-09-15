export interface ConflictDetectionOptions {
  // Detection settings
  checkOnSave: boolean;
  checkInterval?: number; // milliseconds for polling (optional)

  // UI behavior
  showNotification: boolean;
  blockSave: boolean;
  logConflicts: boolean;

  // Customization
  notificationPosition: 'top' | 'bottom' | 'inline';
  customMessage?: string;
  onConflictDetected?: (conflict: ConflictInfo) => void;
  onConflictResolved?: () => void;
}

export interface ConflictInfo {
  hasConflict: boolean;
  originalVersion: string;
  currentVersion: string;
  lastModifiedBy: string;
  lastModified: Date;
  originalModified: Date;
  itemId: number;
  listId: string;
}

export interface ConflictDetectionState {
  isChecking: boolean;
  hasConflict: boolean;
  conflictInfo: ConflictInfo | undefined;
  lastChecked: Date | undefined;
  error: string | undefined;
}

export interface ConflictDetectionResult {
  success: boolean;
  conflictInfo: ConflictInfo | undefined;
  error?: string;
}

export interface ConflictResolutionAction {
  type: 'refresh' | 'overwrite' | 'cancel';
  message: string;
}

// Enhanced detection hook return interface
export interface UseConflictDetectionReturn {
  // State
  isChecking: boolean;
  hasConflict: boolean;
  conflictInfo: ConflictInfo | undefined;
  lastChecked: Date | undefined;
  error: string | undefined;
  isPollingActive: boolean;

  // Actions
  checkForConflicts: () => Promise<boolean>;
  hasChangedSinceLastCheck: () => Promise<boolean>;
  updateSnapshot: () => Promise<boolean>;
  initialize: () => Promise<boolean>;
  dispose: () => void;
  pausePolling: () => void;
  resumePolling: () => void;

  // Utilities
  getDetector: () => ConflictDetector | undefined;
  refreshState: () => ConflictDetectionState;
}

export interface UseConflictDetectionProps {
  listId: string;
  itemId: number;
  options?: Partial<ConflictDetectionOptions>;
  enabled?: boolean;
}

export interface PreSaveCheckResult {
  canSave: boolean;
  hasConflict: boolean;
  conflictInfo: ConflictInfo | undefined;
}

// Default options
export const DEFAULT_CONFLICT_OPTIONS: ConflictDetectionOptions = {
  checkOnSave: true,
  showNotification: true,
  blockSave: false,
  logConflicts: true,
  notificationPosition: 'top',
} as const;

// SharePoint API interfaces
export interface SharePointListItem {
  Id: number;
  Modified: string;
  Editor?: {
    Title: string;
    Email: string;
  };
  __metadata: {
    etag: string;
  };
}

export interface SharePointApiResponse {
  d: SharePointListItem;
}

// Enhanced polling control interface
export interface PollingControl {
  isActive: boolean;
  interval: number | undefined;
  pause: () => void;
  resume: () => void;
  updateInterval: (newInterval: number) => void;
}

// Conflict severity levels
export type ConflictSeverity = 'low' | 'medium' | 'high';

// Enhanced conflict info with additional metadata
export interface EnhancedConflictInfo extends ConflictInfo {
  severity?: ConflictSeverity;
  timeSinceConflict?: number; // milliseconds
  isRecentConflict?: boolean;
}

// Forward declaration for ConflictDetector (to avoid circular dependency)
export interface ConflictDetector {
  initialize(): Promise<ConflictDetectionResult>;
  checkForConflicts(): Promise<ConflictDetectionResult>;
  hasChangedSinceLastCheck(): Promise<ConflictDetectionResult>;
  updateSnapshot(): Promise<ConflictDetectionResult>;
  startPolling(): void;
  stopPolling(): void;
  pausePolling(): void;
  resumePolling(): void;
  isPollingActive(): boolean;
  dispose(): void;
  getOptions(): ConflictDetectionOptions;
  updateOptions(newOptions: Partial<ConflictDetectionOptions>): void;
}

// Error types for better error handling
export class ConflictDetectionError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'GENERAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'ConflictDetectionError';
    this.code = code;
    this.details = details;
  }
}

// Pre-configured option presets
export const CONFLICT_DETECTION_PRESETS = {
  // Silent monitoring - just log conflicts
  silent: {
    checkOnSave: true,
    showNotification: false,
    blockSave: false,
    logConflicts: true,
    notificationPosition: 'top' as const,
  },

  // Notification only - inform but don't block
  notify: {
    checkOnSave: true,
    showNotification: true,
    blockSave: false,
    logConflicts: true,
    notificationPosition: 'top' as const,
  },

  // Strict mode - block saves on conflicts
  strict: {
    checkOnSave: true,
    showNotification: true,
    blockSave: true,
    logConflicts: true,
    notificationPosition: 'top' as const,
  },

  // Real-time monitoring with polling
  realtime: {
    checkOnSave: true,
    checkInterval: 30000, // 30 seconds
    showNotification: true,
    blockSave: false,
    logConflicts: true,
    notificationPosition: 'top' as const,
  },

  // Form customizer optimized
  formCustomizer: {
    checkOnSave: true,
    showNotification: true,
    blockSave: false,
    logConflicts: true,
    notificationPosition: 'inline' as const,
  },
} as const satisfies Record<string, ConflictDetectionOptions>;

// Type guards for runtime type checking
export const isConflictInfo = (obj: unknown): obj is ConflictInfo => {
  return (
    typeof obj === 'object' &&
    obj !== undefined &&
    obj !== null &&
    'hasConflict' in obj &&
    'originalVersion' in obj &&
    'currentVersion' in obj &&
    'lastModifiedBy' in obj &&
    'lastModified' in obj &&
    'originalModified' in obj &&
    'itemId' in obj &&
    'listId' in obj
  );
};

export const isSharePointListItem = (obj: unknown): obj is SharePointListItem => {
  return (
    typeof obj === 'object' &&
    obj !== undefined &&
    obj !== null &&
    'Id' in obj &&
    'Modified' in obj &&
    '__metadata' in obj &&
    typeof (obj as any).Id === 'number' &&
    typeof (obj as any).Modified === 'string' &&
    typeof (obj as any).__metadata === 'object' &&
    (obj as any).__metadata !== undefined &&
    'etag' in (obj as any).__metadata
  );
};

// Utility types
export type ConflictDetectionEventHandler = (state: ConflictDetectionState) => void;
export type ConflictActionHandler = (action: ConflictResolutionAction) => void | Promise<void>;

// Constants
export const CONFLICT_DETECTION_CONSTANTS = {
  DEFAULT_POLLING_INTERVAL: 30000, // 30 seconds
  MIN_POLLING_INTERVAL: 5000, // 5 seconds
  MAX_POLLING_INTERVAL: 300000, // 5 minutes
  RECENT_CONFLICT_THRESHOLD: 300000, // 5 minutes
  HIGH_SEVERITY_THRESHOLD: 60000, // 1 minute
  MEDIUM_SEVERITY_THRESHOLD: 300000, // 5 minutes
} as const;
