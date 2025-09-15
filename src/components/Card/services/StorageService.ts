import { CardState, PersistedCardState, StorageConfig } from '../Card.types';
import { ERROR_MESSAGES, STORAGE_KEYS, VALIDATION } from '../utils/constants';

/**
 * Storage service for persisting card states
 * Handles localStorage with fallback to sessionStorage
 * Includes cleanup and version management
 */
export class StorageService {
  private static instance: StorageService;
  private config: Required<StorageConfig>;
  private storage: Storage | null = null;

  private constructor(config?: StorageConfig) {
    this.config = {
      prefix: config?.prefix || STORAGE_KEYS.PREFIX,
      namespace: config?.namespace || 'default',
      expiration: config?.expiration || 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.initializeStorage();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: StorageConfig): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(config);
    }
    return StorageService.instance;
  }

  /**
   * Initialize storage with feature detection and fallbacks
   */
  private initializeStorage(): void {
    // Test localStorage availability
    if (this.isStorageAvailable('localStorage')) {
      this.storage = window.localStorage;
    }
    // Fallback to sessionStorage
    else if (this.isStorageAvailable('sessionStorage')) {
      this.storage = window.sessionStorage;
      console.warn('[SpfxCard] localStorage not available, using sessionStorage');
    }
    // No storage available
    else {
      console.warn('[SpfxCard] No storage available, persistence disabled');
    }
  }

  /**
   * Test if storage type is available
   */
  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate storage key
   */
  private generateKey(key: string): string {
    if (!VALIDATION.STORAGE_KEY.test(key)) {
      throw new Error(`${ERROR_MESSAGES.INVALID_CONFIGURATION}: Invalid storage key format`);
    }
    return `${this.config.prefix}-${this.config.namespace}-${key}`;
  }

  /**
   * Save card states to storage
   */
  public saveCardStates(states: Record<string, CardState>): boolean {
    if (!this.storage) {
      console.warn('[SpfxCard] Storage not available');
      return false;
    }

    try {
      const persistedData: PersistedCardState = {
        cardStates: states,
        timestamp: Date.now(),
        version: '1.0.0',
      };

      const key = this.generateKey(STORAGE_KEYS.CARD_STATES);
      this.storage.setItem(key, JSON.stringify(persistedData));

      return true;
    } catch (error) {
      console.error('[SpfxCard] Failed to save card states:', error);
      return false;
    }
  }

  /**
   * Load card states from storage
   */
  public loadCardStates(): Record<string, CardState> {
    if (!this.storage) {
      return {};
    }

    try {
      const key = this.generateKey(STORAGE_KEYS.CARD_STATES);
      const stored = this.storage.getItem(key);

      if (!stored) {
        return {};
      }

      const persistedData: PersistedCardState = JSON.parse(stored);

      // Check if data is expired
      if (this.isExpired(persistedData.timestamp)) {
        this.removeCardStates();
        return {};
      }

      // Version compatibility check
      if (persistedData.version !== '1.0.0') {
        console.warn('[SpfxCard] Storage version mismatch, clearing stored data');
        this.removeCardStates();
        return {};
      }

      return persistedData.cardStates || {};
    } catch (error) {
      console.error('[SpfxCard] Failed to load card states:', error);
      return {};
    }
  }

  /**
   * Save accordion states to storage
   */
  public saveAccordionStates(accordionId: string, expandedCards: string[]): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      const key = this.generateKey(`${STORAGE_KEYS.ACCORDION_STATES}-${accordionId}`);
      const data = {
        expandedCards,
        timestamp: Date.now(),
        version: '1.0.0',
      };

      this.storage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[SpfxCard] Failed to save accordion states:', error);
      return false;
    }
  }

  /**
   * Load accordion states from storage
   */
  public loadAccordionStates(accordionId: string): string[] {
    if (!this.storage) {
      return [];
    }

    try {
      const key = this.generateKey(`${STORAGE_KEYS.ACCORDION_STATES}-${accordionId}`);
      const stored = this.storage.getItem(key);

      if (!stored) {
        return [];
      }

      const data = JSON.parse(stored);

      if (this.isExpired(data.timestamp)) {
        this.removeAccordionStates(accordionId);
        return [];
      }

      return data.expandedCards || [];
    } catch (error) {
      console.error('[SpfxCard] Failed to load accordion states:', error);
      return [];
    }
  }

  /**
   * Save custom data with key
   */
  public saveData<T>(key: string, data: T): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      const storageKey = this.generateKey(key);
      const wrappedData = {
        data,
        timestamp: Date.now(),
        version: '1.0.0',
      };

      this.storage.setItem(storageKey, JSON.stringify(wrappedData));
      return true;
    } catch (error) {
      console.error(`[SpfxCard] Failed to save data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Load custom data with key
   */
  public loadData<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.storage) {
      return defaultValue;
    }

    try {
      const storageKey = this.generateKey(key);
      const stored = this.storage.getItem(storageKey);

      if (!stored) {
        return defaultValue;
      }

      const wrappedData = JSON.parse(stored);

      if (this.isExpired(wrappedData.timestamp)) {
        this.removeData(key);
        return defaultValue;
      }

      return wrappedData.data;
    } catch (error) {
      console.error(`[SpfxCard] Failed to load data for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Remove card states from storage
   */
  public removeCardStates(): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      const key = this.generateKey(STORAGE_KEYS.CARD_STATES);
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('[SpfxCard] Failed to remove card states:', error);
      return false;
    }
  }

  /**
   * Remove accordion states from storage
   */
  public removeAccordionStates(accordionId: string): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      const key = this.generateKey(`${STORAGE_KEYS.ACCORDION_STATES}-${accordionId}`);
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.error('[SpfxCard] Failed to remove accordion states:', error);
      return false;
    }
  }

  /**
   * Remove custom data
   */
  public removeData(key: string): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      const storageKey = this.generateKey(key);
      this.storage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error(`[SpfxCard] Failed to remove data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all data for this namespace
   */
  public clearAll(): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      const prefix = `${this.config.prefix}-${this.config.namespace}-`;
      const keysToRemove: string[] = [];

      // Find all keys with our prefix
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove found keys
      keysToRemove.forEach(key => this.storage!.removeItem(key));

      return true;
    } catch (error) {
      console.error('[SpfxCard] Failed to clear all data:', error);
      return false;
    }
  }

  /**
   * Cleanup expired data
   */
  public cleanup(): number {
    if (!this.storage) {
      return 0;
    }

    let cleanedCount = 0;
    const prefix = `${this.config.prefix}-${this.config.namespace}-`;
    const keysToRemove: string[] = [];

    try {
      // Find expired keys
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (!key || !key.startsWith(prefix)) {
          continue;
        }

        try {
          const stored = this.storage.getItem(key);
          if (!stored) continue;

          const data = JSON.parse(stored);
          if (data.timestamp && this.isExpired(data.timestamp)) {
            keysToRemove.push(key);
          }
        } catch (parseError) {
          // Invalid data, mark for removal
          keysToRemove.push(key);
        }
      }

      // Remove expired keys
      keysToRemove.forEach(key => {
        this.storage!.removeItem(key);
        cleanedCount++;
      });

      if (cleanedCount > 0) {
        console.log(`[SpfxCard] Cleaned up ${cleanedCount} expired storage items`);
      }
    } catch (error) {
      console.error('[SpfxCard] Error during cleanup:', error);
    }

    return cleanedCount;
  }

  /**
   * Check if timestamp is expired
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.expiration;
  }

  /**
   * Get storage statistics
   */
  public getStats(): {
    isAvailable: boolean;
    type: 'localStorage' | 'sessionStorage' | 'none';
    itemCount: number;
    totalSize: number;
    namespace: string;
  } {
    let type: 'localStorage' | 'sessionStorage' | 'none' = 'none';
    let itemCount = 0;
    let totalSize = 0;

    if (this.storage === window.localStorage) {
      type = 'localStorage';
    } else if (this.storage === window.sessionStorage) {
      type = 'sessionStorage';
    }

    if (this.storage) {
      const prefix = `${this.config.prefix}-${this.config.namespace}-`;

      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          itemCount++;
          const value = this.storage.getItem(key);
          if (value) {
            totalSize += new Blob([value]).size;
          }
        }
      }
    }

    return {
      isAvailable: this.storage !== null,
      type,
      itemCount,
      totalSize,
      namespace: this.config.namespace,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Export all data for backup
   */
  public exportData(): Record<string, any> {
    if (!this.storage) {
      return {};
    }

    const exportData: Record<string, any> = {};
    const prefix = `${this.config.prefix}-${this.config.namespace}-`;

    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          const value = this.storage.getItem(key);
          if (value) {
            const shortKey = key.substring(prefix.length);
            exportData[shortKey] = JSON.parse(value);
          }
        }
      }
    } catch (error) {
      console.error('[SpfxCard] Error exporting data:', error);
    }

    return exportData;
  }

  /**
   * Import data from backup
   */
  public importData(data: Record<string, any>): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      Object.entries(data).forEach(([shortKey, value]) => {
        const fullKey = this.generateKey(shortKey);
        this.storage!.setItem(fullKey, JSON.stringify(value));
      });

      return true;
    } catch (error) {
      console.error('[SpfxCard] Error importing data:', error);
      return false;
    }
  }
}
