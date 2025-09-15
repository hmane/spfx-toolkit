import {
  CardError,
  CardEventData,
  CardRegistration,
  CardState,
  CardController as ICardController,
  ScrollOptions,
} from '../Card.types';
import { ERROR_MESSAGES } from '../utils/constants';
import { StorageService } from './StorageService';

/**∏
 * Singleton Card Controller Service
 * Manages all card instances and their states
 */
export class CardControllerService implements ICardController {
  private static instance: CardControllerService;
  private cards = new Map<string, CardRegistration>();
  private eventBus = new EventTarget();
  private storageService: StorageService;
  private subscriptions = new Map<string, Array<(action: string, data?: any) => void>>();
  private globalSubscriptions: Array<(action: string, cardId: string, data?: any) => void> = [];
  private batchOperations = new Set<string>();

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.setupEventListeners();
    this.scheduleCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CardControllerService {
    if (!CardControllerService.instance) {
      CardControllerService.instance = new CardControllerService();
    }
    return CardControllerService.instance;
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Cleanup expired storage on page load
    window.addEventListener('load', () => {
      this.storageService.cleanup();
    });

    // Save states before page unload
    window.addEventListener('beforeunload', () => {
      this.persistStates();
    });

    // Handle visibility change for cleanup
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.restoreStates();
      } else {
        this.persistStates();
      }
    });
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.storageService.cleanup();
    }, 5 * 60 * 1000);
  }

  // ==================== Card Registration ====================

  /**
   * Register a new card with the controller
   */
  public registerCard(registration: CardRegistration): void {
    if (!registration.id || typeof registration.id !== 'string') {
      throw new Error(`${ERROR_MESSAGES.INVALID_CARD_ID}: ${registration.id}`);
    }

    if (this.cards.has(registration.id)) {
      console.warn(
        `[SpfxCard] Card ${registration.id} is already registered, updating registration`
      );
    }

    this.cards.set(registration.id, registration);

    // Emit registration event
    this.emitEvent('register', registration.id, {
      cardId: registration.id,
      isExpanded: registration.isExpanded,
      isMaximized: registration.isMaximized,
      timestamp: Date.now(),
      source: 'programmatic' as const,
    });

    console.debug(`[SpfxCard] Registered card: ${registration.id}`);
  }

  /**
   * Unregister a card from the controller
   */
  public unregisterCard(id: string): void {
    if (!this.cards.has(id)) {
      console.warn(`[SpfxCard] Attempted to unregister non-existent card: ${id}`);
      return;
    }

    this.cards.delete(id);
    this.subscriptions.delete(id);

    // Emit unregistration event
    this.emitEvent('unregister', id, {
      cardId: id,
      isExpanded: false,
      isMaximized: false,
      timestamp: Date.now(),
      source: 'programmatic' as const,
    });

    console.debug(`[SpfxCard] Unregistered card: ${id}`);
  }

  /**
   * Update card state
   */
  public updateCardState(id: string, state: Partial<CardState>): void {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return;
    }

    // Update registration state
    Object.assign(card, state);

    // Emit state change event
    this.emitEvent('stateChange', id, {
      cardId: id,
      isExpanded: card.isExpanded,
      isMaximized: card.isMaximized,
      timestamp: Date.now(),
      source: 'programmatic' as const,
      metadata: state,
    });
  }

  // ==================== Basic Operations ====================

  /**
   * Expand all cards
   */
  public expandAll(highlight: boolean = true): void {
    const operations = Array.from(this.cards.entries())
      .filter(([_, card]) => !card.isExpanded)
      .map(([id]) => ({ cardId: id, action: 'expand' as const }));

    if (operations.length > 0) {
      this.executeBatchOperation(operations, highlight);
    }
  }

  /**
   * Collapse all cards
   */
  public collapseAll(highlight: boolean = true): void {
    const operations = Array.from(this.cards.entries())
      .filter(([_, card]) => card.isExpanded)
      .map(([id]) => ({ cardId: id, action: 'collapse' as const }));

    if (operations.length > 0) {
      this.executeBatchOperation(operations, highlight);
    }
  }

  /**
   * Toggle specific card
   */
  public toggleCard(id: string, highlight: boolean = true): boolean {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    try {
      card.toggleFn('programmatic');

      if (highlight && card.highlightFn) {
        card.highlightFn();
      }

      this.notifySubscribers(id, 'toggle', {
        source: 'programmatic',
        newState: !card.isExpanded,
      });

      return true;
    } catch (error) {
      this.handleError(error, id, 'toggle');
      return false;
    }
  }

  /**
   * Expand specific card
   */
  public expandCard(id: string, highlight: boolean = true): boolean {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    if (card.isExpanded) {
      return true; // Already expanded
    }

    try {
      card.expandFn('programmatic');

      if (highlight && card.highlightFn) {
        card.highlightFn();
      }

      this.notifySubscribers(id, 'expand', { source: 'programmatic' });
      return true;
    } catch (error) {
      this.handleError(error, id, 'expand');
      return false;
    }
  }

  /**
   * Collapse specific card
   */
  public collapseCard(id: string, highlight: boolean = true): boolean {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    if (!card.isExpanded) {
      return true; // Already collapsed
    }

    try {
      card.collapseFn('programmatic');

      if (highlight && card.highlightFn) {
        card.highlightFn();
      }

      this.notifySubscribers(id, 'collapse', { source: 'programmatic' });
      return true;
    } catch (error) {
      this.handleError(error, id, 'collapse');
      return false;
    }
  }

  // ==================== Maximize Operations ====================

  /**
   * Maximize specific card
   */
  public maximizeCard(id: string): boolean {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    if (card.isMaximized || !card.maximizeFn) {
      return false;
    }

    try {
      card.maximizeFn('programmatic');
      this.notifySubscribers(id, 'maximize', { source: 'programmatic' });
      return true;
    } catch (error) {
      this.handleError(error, id, 'maximize');
      return false;
    }
  }

  /**
   * Restore (un-maximize) specific card
   */
  public restoreCard(id: string): boolean {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    if (!card.isMaximized || !card.restoreFn) {
      return false;
    }

    try {
      card.restoreFn('programmatic');
      this.notifySubscribers(id, 'restore', { source: 'programmatic' });
      return true;
    } catch (error) {
      this.handleError(error, id, 'restore');
      return false;
    }
  }

  /**
   * Toggle maximize state
   */
  public toggleMaximize(id: string): boolean {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    return card.isMaximized ? this.restoreCard(id) : this.maximizeCard(id);
  }

  /**
   * Check if card is maximized
   */
  public isCardMaximized(id: string): boolean {
    const card = this.cards.get(id);
    return card?.isMaximized || false;
  }

  // ==================== Scroll Operations ====================

  /**
   * Scroll to specific card
   */
  public async scrollToCard(id: string, options: ScrollOptions = {}): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    try {
      if (card.scrollToFn) {
        card.scrollToFn(options);
        return true;
      }

      // Fallback scroll implementation
      const cardElement = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement;
      if (!cardElement) {
        console.warn(`[SpfxCard] Card element not found: ${id}`);
        return false;
      }

      await this.scrollToElement(cardElement, options);

      if (options.highlight && card.highlightFn) {
        card.highlightFn();
      }

      return true;
    } catch (error) {
      this.handleError(error, id, 'scroll');
      return false;
    }
  }

  /**
   * Expand card and scroll to it
   */
  public async expandAndScrollTo(id: string, options: ScrollOptions = {}): Promise<boolean> {
    const card = this.cards.get(id);
    if (!card) {
      console.warn(`[SpfxCard] ${ERROR_MESSAGES.CARD_NOT_FOUND}: ${id}`);
      return false;
    }

    try {
      // First expand the card if it's not expanded
      if (!card.isExpanded) {
        const expandResult = this.expandCard(id, false); // Don't highlight yet
        if (!expandResult) {
          return false;
        }

        // Wait for expand animation to complete
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Then scroll to it
      const scrollResult = await this.scrollToCard(id, options);

      // Highlight after scroll if requested
      if (scrollResult && options.highlight && card.highlightFn) {
        setTimeout(() => card.highlightFn!(), 100);
      }

      return scrollResult;
    } catch (error) {
      this.handleError(error, id, 'expandAndScrollTo');
      return false;
    }
  }

  /**
   * Scroll to element helper
   */
  private async scrollToElement(element: HTMLElement, options: ScrollOptions): Promise<void> {
    return new Promise(resolve => {
      const { block = 'center', smooth = true, offset = 0 } = options;

      // Calculate scroll position with offset
      let scrollTop = element.offsetTop;

      if (block === 'center') {
        scrollTop -= (window.innerHeight - element.offsetHeight) / 2;
      } else if (block === 'end') {
        scrollTop -= window.innerHeight - element.offsetHeight;
      }

      scrollTop += offset;

      if (smooth && 'scrollTo' in window) {
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });

        // Resolve after scroll animation
        setTimeout(resolve, 500);
      } else {
        window.scrollTo(0, scrollTop);
        resolve();
      }
    });
  }

  // ==================== State Management ====================

  /**
   * Get all card states
   */
  public getCardStates(): CardState[] {
    return Array.from(this.cards.entries()).map(([id, card]) => ({
      id,
      isExpanded: card.isExpanded,
      isMaximized: card.isMaximized,
      hasContentLoaded: card.hasContentLoaded,
      lastUpdated: Date.now(),
    }));
  }

  /**
   * Get specific card state
   */
  public getCardState(id: string): CardState | null {
    const card = this.cards.get(id);
    if (!card) {
      return null;
    }

    return {
      id,
      isExpanded: card.isExpanded,
      isMaximized: card.isMaximized,
      hasContentLoaded: card.hasContentLoaded,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Highlight specific card
   */
  public highlightCard(id: string): boolean {
    const card = this.cards.get(id);
    if (!card || !card.highlightFn) {
      return false;
    }

    try {
      card.highlightFn();
      this.notifySubscribers(id, 'highlight');
      return true;
    } catch (error) {
      this.handleError(error, id, 'highlight');
      return false;
    }
  }

  // ==================== Persistence ====================

  /**
   * Persist current card states to storage
   */
  public persistStates(): void {
    const states: Record<string, CardState> = {};

    this.cards.forEach((card, id) => {
      states[id] = {
        id,
        isExpanded: card.isExpanded,
        isMaximized: card.isMaximized,
        hasContentLoaded: card.hasContentLoaded,
        lastUpdated: Date.now(),
      };
    });

    this.storageService.saveCardStates(states);
  }

  /**
   * Restore card states from storage
   */
  public restoreStates(): void {
    const storedStates = this.storageService.loadCardStates();

    Object.entries(storedStates).forEach(([id, state]) => {
      const card = this.cards.get(id);
      if (!card) return;

      try {
        // Restore expansion state
        if (state.isExpanded !== card.isExpanded) {
          if (state.isExpanded) {
            card.expandFn('programmatic');
          } else {
            card.collapseFn('programmatic');
          }
        }

        // Restore maximized state
        if (state.isMaximized !== card.isMaximized) {
          if (state.isMaximized && card.maximizeFn) {
            card.maximizeFn('programmatic');
          } else if (!state.isMaximized && card.restoreFn) {
            card.restoreFn('programmatic');
          }
        }
      } catch (error) {
        console.warn(`[SpfxCard] Failed to restore state for card ${id}:`, error);
      }
    });
  }

  /**
   * Clear stored card states
   */
  public clearStoredStates(): void {
    this.storageService.removeCardStates();
  }

  // ==================== Event System ====================

  /**
   * Subscribe to card-specific events
   */
  public subscribe(cardId: string, callback: (action: string, data?: any) => void): () => void {
    if (!this.subscriptions.has(cardId)) {
      this.subscriptions.set(cardId, []);
    }

    this.subscriptions.get(cardId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(cardId);
      if (subs) {
        const index = subs.indexOf(callback);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to global events
   */
  public subscribeGlobal(
    callback: (action: string, cardId: string, data?: any) => void
  ): () => void {
    this.globalSubscriptions.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.globalSubscriptions.indexOf(callback);
      if (index > -1) {
        this.globalSubscriptions.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(cardId: string, action: string, data?: any): void {
    // Notify card-specific subscribers
    const cardSubs = this.subscriptions.get(cardId);
    if (cardSubs) {
      cardSubs.forEach(callback => {
        try {
          callback(action, data);
        } catch (error) {
          console.error(`[SpfxCard] Subscription callback error:`, error);
        }
      });
    }

    // Notify global subscribers
    this.globalSubscriptions.forEach(callback => {
      try {
        callback(action, cardId, data);
      } catch (error) {
        console.error(`[SpfxCard] Global subscription callback error:`, error);
      }
    });
  }

  /**
   * Emit custom event
   */
  private emitEvent(type: string, cardId: string, data: CardEventData): void {
    const customEvent = new CustomEvent(`card-${type}`, {
      detail: { cardId, data },
    });

    this.eventBus.dispatchEvent(customEvent);
  }

  // ==================== Batch Operations ====================

  /**
   * Execute batch operation
   */
  public async batchOperation(
    operations: Array<{
      cardId: string;
      action: 'expand' | 'collapse' | 'toggle' | 'maximize' | 'restore';
    }>,
    highlight: boolean = true
  ): Promise<boolean[]> {
    const batchId = `batch-${Date.now()}`;
    this.batchOperations.add(batchId);

    const results = await Promise.allSettled(
      operations.map(async op => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between operations

        switch (op.action) {
          case 'expand':
            return this.expandCard(op.cardId, highlight);
          case 'collapse':
            return this.collapseCard(op.cardId, highlight);
          case 'toggle':
            return this.toggleCard(op.cardId, highlight);
          case 'maximize':
            return this.maximizeCard(op.cardId);
          case 'restore':
            return this.restoreCard(op.cardId);
          default:
            return false;
        }
      })
    );

    this.batchOperations.delete(batchId);

    return results.map(result => (result.status === 'fulfilled' ? result.value : false));
  }

  /**
   * Execute batch operation synchronously
   */
  private executeBatchOperation(
    operations: Array<{ cardId: string; action: 'expand' | 'collapse' | 'toggle' }>,
    highlight: boolean
  ): void {
    operations.forEach(({ cardId, action }) => {
      const card = this.cards.get(cardId);
      if (!card) return;

      try {
        switch (action) {
          case 'expand':
            if (!card.isExpanded) {
              card.expandFn('programmatic');
            }
            break;
          case 'collapse':
            if (card.isExpanded) {
              card.collapseFn('programmatic');
            }
            break;
          case 'toggle':
            card.toggleFn('programmatic');
            break;
        }

        if (highlight && card.highlightFn) {
          setTimeout(() => card.highlightFn!(), Math.random() * 200);
        }

        this.notifySubscribers(cardId, action, { source: 'programmatic' });
      } catch (error) {
        this.handleError(error, cardId, action);
      }
    });
  }

  // ==================== Error Handling ====================

  /**
   * Handle errors with proper logging and recovery
   */
  private handleError(error: any, cardId: string, operation: string): void {
    const cardError: CardError = {
      name: 'CardError',
      message: error.message || 'Unknown error',
      cardId,
      operation,
      timestamp: Date.now(),
    };

    console.error(`[SpfxCard] Error in ${operation} for card ${cardId}:`, error);

    // Emit error event
    this.emitEvent('error', cardId, {
      cardId,
      isExpanded: false,
      isMaximized: false,
      timestamp: Date.now(),
      source: 'programmatic' as const,
      metadata: { error: cardError },
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Get controller statistics
   */
  public getStats(): {
    totalCards: number;
    expandedCards: number;
    maximizedCards: number;
    subscriptions: number;
    globalSubscriptions: number;
    activeBatchOperations: number;
  } {
    const expandedCards = Array.from(this.cards.values()).filter(card => card.isExpanded).length;
    const maximizedCards = Array.from(this.cards.values()).filter(card => card.isMaximized).length;
    const subscriptions = Array.from(this.subscriptions.values()).reduce(
      (sum, subs) => sum + subs.length,
      0
    );

    return {
      totalCards: this.cards.size,
      expandedCards,
      maximizedCards,
      subscriptions,
      globalSubscriptions: this.globalSubscriptions.length,
      activeBatchOperations: this.batchOperations.size,
    };
  }

  /**
   * Check if controller is in batch mode
   */
  public isBatchMode(): boolean {
    return this.batchOperations.size > 0;
  }

  /**
   * Get registered card IDs
   */
  public getRegisteredCardIds(): string[] {
    return Array.from(this.cards.keys());
  }

  /**
   * Check if card is registered
   */
  public isCardRegistered(id: string): boolean {
    return this.cards.has(id);
  }

  /**
   * Force cleanup of all resources
   */
  public cleanup(): void {
    // Clear all subscriptions
    this.subscriptions.clear();
    this.globalSubscriptions.length = 0;

    // Clear batch operations
    this.batchOperations.clear();

    // Persist final state
    this.persistStates();

    console.log('[SpfxCard] Controller cleanup completed');
  }

  /**
   * Reset controller to initial state
   */
  public reset(): void {
    this.cleanup();
    this.cards.clear();
    this.clearStoredStates();

    console.log('[SpfxCard] Controller reset completed');
  }
}

// Export singleton instance
export const cardController = CardControllerService.getInstance();
