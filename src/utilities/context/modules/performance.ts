/**
 * src/context/modules/performance.ts
 * Lightweight performance tracking module
 */

import type { Logger, PerformanceMetric, PerformanceTracker } from '../types';

interface PerformanceConfig {
  enabled: boolean;
  logger: Logger;
  maxMetrics?: number;
}

/**
 * Simple, memory-efficient performance tracker
 */
export class SimplePerformanceTracker implements PerformanceTracker {
  private readonly config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics: number;

  constructor(config: PerformanceConfig) {
    this.config = config;
    this.maxMetrics = config.maxMetrics || 50; // Keep memory usage low
  }

  async track<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    const startTime = performance.now();
    const timestamp = Date.now();
    let success = true;
    let result: T;

    try {
      result = await operation();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;

      const metric: PerformanceMetric = {
        name,
        duration: Math.round(duration),
        success,
        timestamp,
      };

      this.recordMetric(metric);

      // Log slow operations
      if (duration > 1000) {
        this.config.logger.warn(`Slow operation detected: ${name}`, {
          duration: Math.round(duration),
        });
      }
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep memory usage under control
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Utility methods for analysis
  getAverageTime(operationName?: string): number {
    const filteredMetrics = operationName
      ? this.metrics.filter(m => m.name === operationName)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / filteredMetrics.length);
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  getFailedOperations(): PerformanceMetric[] {
    return this.metrics.filter(m => !m.success);
  }
}
