/**
 * src/context/modules/logger.ts
 * Performance-focused, simple logger
 */

import { LogLevel } from '@pnp/logging';
import type { EnvironmentName, Logger } from '../types';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  correlationId: string;
  component: string;
}

interface LoggerConfig {
  level: LogLevel;
  componentName: string;
  environment: EnvironmentName;
  correlationId: string;
  enableConsole: boolean;
  maxEntries?: number;
}

/**
 * Simple, high-performance logger
 */
export class SimpleLogger implements Logger {
  private readonly config: LoggerConfig;
  private readonly timers = new Map<string, number>();
  private entries: LogEntry[] = [];

  constructor(config: LoggerConfig) {
    this.config = {
      maxEntries: 100, // Keep memory usage low
      ...config,
    };
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.Info, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.Warning, message, data);
  }

  error(message: string, error?: any, data?: any): void {
    const errorData = this.extractErrorInfo(error, data);
    this.log(LogLevel.Error, message, errorData);
  }

  success(message: string, data?: any): void {
    this.log(LogLevel.Info, `✅ ${message}`, data);
  }

  startTimer(name: string): () => number {
    const startTime = performance.now();
    this.timers.set(name, startTime);

    return (): number => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.timers.delete(name);

      this.log(LogLevel.Info, `Timer: ${name}`, { duration: Math.round(duration) });
      return duration;
    };
  }

  // Internal methods

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      correlationId: this.config.correlationId,
      component: this.config.componentName,
    };

    // Store entry (with memory management)
    this.entries.push(entry);
    if (this.entries.length > this.config.maxEntries!) {
      this.entries = this.entries.slice(-this.config.maxEntries!);
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.component}]`;
    const correlationSuffix = ` (${entry.correlationId.slice(-6)})`;
    const fullMessage = `${prefix} ${entry.message}${correlationSuffix}`;

    switch (entry.level) {
      case LogLevel.Error:
        console.error(fullMessage, entry.data || '');
        break;
      case LogLevel.Warning:
        console.warn(fullMessage, entry.data || '');
        break;
      case LogLevel.Info:
        console.info(fullMessage, entry.data || '');
        break;
      case LogLevel.Verbose:
      default:
        console.debug(fullMessage, entry.data || '');
        break;
    }
  }

  private extractErrorInfo(error: any, additionalData?: any): any {
    if (!error) {
      return additionalData;
    }

    const errorInfo: any = {
      ...additionalData,
    };

    if (error instanceof Error) {
      errorInfo.error = {
        name: error.name,
        message: error.message,
        stack: this.config.environment === 'dev' ? error.stack : undefined,
      };
    } else if (typeof error === 'object') {
      errorInfo.error = {
        message: error.message || String(error),
        status: error.status || error.statusCode,
        code: error.code || error.errorCode,
        type: this.categorizeError(error),
      };
    } else {
      errorInfo.error = { message: String(error) };
    }

    return errorInfo;
  }

  private categorizeError(error: any): string {
    if (error.status >= 500) return 'ServerError';
    if (error.status >= 400) return 'ClientError';
    if (error.message?.includes('SharePoint')) return 'SharePointError';
    if (error.message?.includes('timeout')) return 'TimeoutError';
    if (error.message?.includes('network')) return 'NetworkError';
    return 'UnknownError';
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Simple sanitization - remove sensitive keys
    const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Utility methods
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.timers.clear();
  }
}
