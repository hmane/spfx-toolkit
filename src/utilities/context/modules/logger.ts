/**
 * src/context/modules/logger.ts
 * Performance-focused, simple logger
 */

import { LogLevel } from '@pnp/logging';
import type { EnvironmentName, LogSink, LogSinkOptions, Logger } from '../types';

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
 * Detect whether the current URL requests debug mode.
 *
 * Matches `?isDebug=true|1` or `?debug=true|1` (case-insensitive). Returns false
 * outside browser contexts. Does not import or depend on SPDebug.
 *
 * See `docs/SPDebug-Requirements.md` "Logger Integration" / "Bootstrap Buffer".
 */
function isDebugBufferActiveFromUrl(): boolean {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  return /[?&](isDebug|debug)=(1|true)\b/i.test(window.location.search || '');
}

/**
 * Simple, high-performance logger
 */
export class SimpleLogger implements Logger {
  private readonly config: LoggerConfig;
  private readonly timers = new Map<string, number>();
  private readonly sinks = new Set<LogSink>();
  private entries: LogEntry[] = [];

  constructor(config: LoggerConfig) {
    // When the URL has a recognized debug flag, raise the default ring buffer so
    // boot-time entries survive until SPDebug attaches. Explicit caller config wins.
    const defaultMaxEntries = isDebugBufferActiveFromUrl() ? 1000 : 100;
    this.config = {
      maxEntries: defaultMaxEntries,
      ...config,
    };
  }

  /**
   * Subscribe to log entries.
   *
   * Atomic replay: when `options.replay === true`, all currently buffered entries are
   * delivered to the sink synchronously inside this call BEFORE the sink is registered
   * to receive new entries. In `SimpleLogger`'s synchronous logging flow this guarantees
   * no duplicates and no missed entries on the same sink.
   *
   * Sink errors are caught and isolated so logging cannot break the host app.
   *
   * @returns Unsubscribe function.
   */
  addSink(sink: LogSink, options?: LogSinkOptions): () => void {
    if (options?.replay) {
      // Snapshot existing entries and deliver before subscribing to new entries.
      // Because `log()` is synchronous and Set additions happen after this loop,
      // no new entry can be delivered to this sink until replay is complete.
      const snapshot = this.entries.slice();
      for (const entry of snapshot) {
        this.deliverToSink(sink, entry);
      }
    }

    this.sinks.add(sink);

    return () => {
      this.sinks.delete(sink);
    };
  }

  private deliverToSink(sink: LogSink, entry: LogEntry): void {
    try {
      sink(entry);
    } catch (err) {
      // Sink errors must never break logging or other sinks.
      if (this.config.enableConsole) {
        // eslint-disable-next-line no-console
        console.warn('[SimpleLogger] sink threw; ignoring', err);
      }
    }
  }

  /**
   * Log debug message (verbose level)
   * Only shown when log level is set to Verbose (0)
   *
   * @param message - Debug message
   * @param data - Optional debug data
   *
   * @example
   * ```typescript
   * SPContext.logger.debug('Processing item', { itemId: 123, fields: ['Title', 'Status'] });
   * ```
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.Verbose, message, data);
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

  /**
   * Update the log level at runtime
   * Useful for enabling debug mode via URL parameters
   *
   * @param level - New log level
   */
  setLevel(level: LogLevel): void {
    (this.config as any).level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
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

    // Fan out to subscribed sinks (errors isolated per-sink)
    if (this.sinks.size > 0) {
      this.sinks.forEach(sink => this.deliverToSink(sink, entry));
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
