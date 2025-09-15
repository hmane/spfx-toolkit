import { SPFI } from '@pnp/sp';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import {
  ConflictDetectionOptions,
  ConflictInfo,
  ConflictDetectionResult,
  SharePointListItem,
  DEFAULT_CONFLICT_OPTIONS,
  ConflictDetectionError,
  CONFLICT_DETECTION_CONSTANTS,
} from './types';

export class ConflictDetector {
  private readonly listId: string;
  private readonly itemId: number;
  private options: ConflictDetectionOptions;
  private originalSnapshot: ConflictInfo | undefined = undefined;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPollingPaused = false;
  private isDisposed = false;
  private readonly sp: SPFI;

  constructor(
    sp: SPFI,
    listId: string,
    itemId: number,
    options: Partial<ConflictDetectionOptions> = {}
  ) {
    if (!sp) {
      throw new ConflictDetectionError('SP context is required', 'INVALID_SP_CONTEXT');
    }
    if (!listId?.trim()) {
      throw new ConflictDetectionError('ListId is required', 'INVALID_LIST_ID');
    }
    if (!itemId || itemId <= 0) {
      throw new ConflictDetectionError('Valid ItemId is required', 'INVALID_ITEM_ID');
    }

    this.sp = sp;
    this.listId = listId.trim();
    this.itemId = itemId;
    this.options = { ...DEFAULT_CONFLICT_OPTIONS, ...options };

    this.validateOptions();

    if (this.options.logConflicts) {
      console.log(`ConflictDetector initialized for List: ${listId}, Item: ${itemId}`);
    }
  }

  /**
   * Initialize conflict detection by taking a snapshot of current state
   */
  public async initialize(): Promise<ConflictDetectionResult> {
    if (this.isDisposed) {
      throw new ConflictDetectionError('ConflictDetector has been disposed', 'DETECTOR_DISPOSED');
    }

    try {
      const currentItem = await this.getCurrentItemInfo();
      if (!currentItem.success || !currentItem.conflictInfo) {
        return {
          success: false,
          conflictInfo: undefined,
          error: currentItem.error || 'Failed to get current item info',
        };
      }

      this.originalSnapshot = currentItem.conflictInfo;

      // Start polling if enabled
      if (this.options.checkInterval && this.options.checkInterval > 0) {
        this.startPolling();
      }

      if (this.options.logConflicts) {
        console.log('ConflictDetector initialized with snapshot:', this.originalSnapshot);
      }

      return {
        success: true,
        conflictInfo: this.originalSnapshot,
      };
    } catch (error) {
      const errorMessage = `Failed to initialize ConflictDetector: ${this.getErrorMessage(error)}`;
      console.error(errorMessage, error);
      return {
        success: false,
        conflictInfo: undefined,
        error: errorMessage,
      };
    }
  }

  /**
   * Check for conflicts against the original snapshot
   */
  public async checkForConflicts(): Promise<ConflictDetectionResult> {
    if (this.isDisposed) {
      throw new ConflictDetectionError('ConflictDetector has been disposed', 'DETECTOR_DISPOSED');
    }

    if (!this.originalSnapshot) {
      return {
        success: false,
        conflictInfo: undefined,
        error: 'ConflictDetector not initialized. Call initialize() first.',
      };
    }

    try {
      const currentItem = await this.getCurrentItemInfo();
      if (!currentItem.success || !currentItem.conflictInfo) {
        return {
          success: false,
          conflictInfo: undefined,
          error: currentItem.error || 'Failed to get current item info',
        };
      }

      const hasConflict = this.detectConflict(this.originalSnapshot, currentItem.conflictInfo);

      const conflictInfo: ConflictInfo = {
        ...currentItem.conflictInfo,
        hasConflict,
        originalVersion: this.originalSnapshot.currentVersion,
        originalModified: this.originalSnapshot.lastModified,
      };

      if (hasConflict) {
        if (this.options.logConflicts) {
          console.warn('Conflict detected:', {
            original: this.originalSnapshot,
            current: currentItem.conflictInfo,
          });
        }

        // Trigger custom callback if provided
        if (this.options.onConflictDetected) {
          try {
            this.options.onConflictDetected(conflictInfo);
          } catch (callbackError) {
            console.error('Error in onConflictDetected callback:', callbackError);
          }
        }
      }

      return {
        success: true,
        conflictInfo,
      };
    } catch (error) {
      const errorMessage = `Failed to check for conflicts: ${this.getErrorMessage(error)}`;
      console.error(errorMessage, error);
      return {
        success: false,
        conflictInfo: undefined,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if item has changed since last check (soft change detection)
   */
  public async hasChangedSinceLastCheck(): Promise<ConflictDetectionResult> {
    if (this.isDisposed) {
      throw new ConflictDetectionError('ConflictDetector has been disposed', 'DETECTOR_DISPOSED');
    }

    if (!this.originalSnapshot) {
      return {
        success: false,
        conflictInfo: undefined,
        error: 'ConflictDetector not initialized. Call initialize() first.',
      };
    }

    try {
      const currentItem = await this.getCurrentItemInfo();
      if (!currentItem.success || !currentItem.conflictInfo) {
        return currentItem;
      }

      const hasChanged = this.detectConflict(this.originalSnapshot, currentItem.conflictInfo);

      return {
        success: true,
        conflictInfo: {
          ...currentItem.conflictInfo,
          hasConflict: hasChanged,
          originalVersion: this.originalSnapshot.currentVersion,
          originalModified: this.originalSnapshot.lastModified,
        },
      };
    } catch (error) {
      const errorMessage = `Failed to check for changes: ${this.getErrorMessage(error)}`;
      console.error(errorMessage, error);
      return {
        success: false,
        conflictInfo: undefined,
        error: errorMessage,
      };
    }
  }

  /**
   * Update the original snapshot (call after successful save)
   */
  public async updateSnapshot(
    saveResponseData?: Partial<SharePointListItem>
  ): Promise<ConflictDetectionResult> {
    if (this.isDisposed) {
      throw new ConflictDetectionError('ConflictDetector has been disposed', 'DETECTOR_DISPOSED');
    }

    try {
      let result: ConflictDetectionResult;

      // Use save response data if provided (optimistic update)
      if (saveResponseData && this.isValidSaveResponse(saveResponseData)) {
        const conflictInfo = this.convertItemToConflictInfo(saveResponseData as SharePointListItem);
        this.originalSnapshot = conflictInfo;
        result = {
          success: true,
          conflictInfo,
        };
      } else {
        // Fetch fresh data from SharePoint
        result = await this.getCurrentItemInfo();
        if (result.success && result.conflictInfo) {
          this.originalSnapshot = result.conflictInfo;
        }
      }

      if (result.success && this.options.logConflicts) {
        console.log('Snapshot updated:', this.originalSnapshot);
      }

      if (result.success && this.options.onConflictResolved) {
        try {
          this.options.onConflictResolved();
        } catch (callbackError) {
          console.error('Error in onConflictResolved callback:', callbackError);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = `Failed to update snapshot: ${this.getErrorMessage(error)}`;
      console.error(errorMessage, error);
      return {
        success: false,
        conflictInfo: undefined,
        error: errorMessage,
      };
    }
  }

  /**
   * Start polling for conflicts
   */
  public startPolling(): void {
    if (this.isDisposed) {
      throw new ConflictDetectionError('ConflictDetector has been disposed', 'DETECTOR_DISPOSED');
    }

    if (!this.options.checkInterval || this.pollingInterval) {
      return;
    }

    this.isPollingPaused = false;
    this.pollingInterval = setInterval(async () => {
      if (this.isPollingPaused || this.isDisposed) {
        return;
      }

      try {
        const result = await this.checkForConflicts();
        if (result.success && result.conflictInfo?.hasConflict) {
          if (this.options.logConflicts) {
            console.log('Polling detected conflict');
          }
        }
      } catch (error) {
        console.error('Error during polling:', error);
      }
    }, this.options.checkInterval);

    if (this.options.logConflicts) {
      console.log(`Started polling every ${this.options.checkInterval}ms`);
    }
  }

  /**
   * Stop polling
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPollingPaused = false;

      if (this.options.logConflicts && !this.isDisposed) {
        console.log('Stopped polling');
      }
    }
  }

  /**
   * Pause polling temporarily
   */
  public pausePolling(): void {
    if (this.pollingInterval && !this.isPollingPaused) {
      this.isPollingPaused = true;

      if (this.options.logConflicts) {
        console.log('Paused polling');
      }
    }
  }

  /**
   * Resume polling
   */
  public resumePolling(): void {
    if (this.pollingInterval && this.isPollingPaused) {
      this.isPollingPaused = false;

      if (this.options.logConflicts) {
        console.log('Resumed polling');
      }
    }
  }

  /**
   * Check if polling is currently active
   */
  public isPollingActive(): boolean {
    return this.pollingInterval !== undefined && !this.isPollingPaused;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.stopPolling();
    this.originalSnapshot = undefined;
    this.isDisposed = true;

    if (this.options.logConflicts) {
      console.log('ConflictDetector disposed');
    }
  }

  /**
   * Get current options
   */
  public getOptions(): ConflictDetectionOptions {
    return { ...this.options };
  }

  /**
   * Update options
   */
  public updateOptions(newOptions: Partial<ConflictDetectionOptions>): void {
    if (this.isDisposed) {
      throw new ConflictDetectionError('ConflictDetector has been disposed', 'DETECTOR_DISPOSED');
    }

    const oldInterval = this.options.checkInterval;
    this.options = { ...this.options, ...newOptions };

    this.validateOptions();

    // Handle polling interval changes
    if (oldInterval !== this.options.checkInterval) {
      this.stopPolling();
      if (this.options.checkInterval && this.options.checkInterval > 0) {
        this.startPolling();
      }
    }

    if (this.options.logConflicts) {
      console.log('ConflictDetector options updated:', this.options);
    }
  }

  /**
   * Get current item information from SharePoint
   */
  private async getCurrentItemInfo(): Promise<ConflictDetectionResult> {
    try {
      const item: SharePointListItem = await this.sp.web.lists
        .getById(this.listId)
        .items.getById(this.itemId)
        .select('Id', 'Modified', 'Editor/Title', 'Editor/Email')
        .expand('Editor')();

      const conflictInfo = this.convertItemToConflictInfo(item);

      return {
        success: true,
        conflictInfo,
      };
    } catch (error) {
      const errorMessage = `Failed to get item info from SharePoint: ${this.getErrorMessage(
        error
      )}`;
      return {
        success: false,
        conflictInfo: undefined,
        error: errorMessage,
      };
    }
  }

  /**
   * Detect if there's a conflict between original and current state
   */
  private detectConflict(original: ConflictInfo, current: ConflictInfo): boolean {
    // Compare ETags (most reliable)
    if (original.currentVersion !== current.currentVersion) {
      return true;
    }

    // Fallback: Compare modified timestamps
    const originalTime = new Date(original.lastModified).getTime();
    const currentTime = new Date(current.lastModified).getTime();

    return currentTime > originalTime;
  }

  /**
   * Convert SharePoint item to ConflictInfo format
   */
  private convertItemToConflictInfo(item: SharePointListItem): ConflictInfo {
    return {
      hasConflict: false,
      originalVersion: item.__metadata.etag,
      currentVersion: item.__metadata.etag,
      lastModifiedBy: item.Editor?.Title || 'Unknown',
      lastModified: new Date(item.Modified),
      originalModified: new Date(item.Modified),
      itemId: this.itemId,
      listId: this.listId,
    };
  }

  /**
   * Validate save response data for optimistic updates
   */
  private isValidSaveResponse(data: Partial<SharePointListItem>): boolean {
    return !!(
      data &&
      data.Modified &&
      data.__metadata?.etag &&
      (data.Editor?.Title || data.Editor === undefined)
    );
  }

  /**
   * Validate configuration options
   */
  private validateOptions(): void {
    if (this.options.checkInterval !== undefined) {
      if (this.options.checkInterval < CONFLICT_DETECTION_CONSTANTS.MIN_POLLING_INTERVAL) {
        throw new ConflictDetectionError(
          `Polling interval must be at least ${CONFLICT_DETECTION_CONSTANTS.MIN_POLLING_INTERVAL}ms`,
          'INVALID_POLLING_INTERVAL'
        );
      }

      if (this.options.checkInterval > CONFLICT_DETECTION_CONSTANTS.MAX_POLLING_INTERVAL) {
        throw new ConflictDetectionError(
          `Polling interval must not exceed ${CONFLICT_DETECTION_CONSTANTS.MAX_POLLING_INTERVAL}ms`,
          'INVALID_POLLING_INTERVAL'
        );
      }
    }
  }

  /**
   * Extract error message safely
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }
}
