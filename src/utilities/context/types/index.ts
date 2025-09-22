/**
 * Focused types/index.ts with essential SharePoint properties only
 */

import type { BaseComponentContext } from '@microsoft/sp-component-base';
import type { PageContext } from '@microsoft/sp-page-context';
import type { LogLevel } from '@pnp/logging';
import type { SPFI } from '@pnp/sp';
import { IPrincipal } from '../../../types';

// Environment types
export type EnvironmentName = 'dev' | 'uat' | 'prod';
export type BuildMode = 'development' | 'production';
export type CacheStrategy = 'none' | 'memory' | 'storage' | 'pessimistic';

// Core interfaces
export interface SPFxContextInput extends BaseComponentContext {
  pageContext: PageContext;
}

export interface ContextConfig {
  /** Component name for identification */
  componentName?: string;

  /** Logging configuration */
  logging?: {
    level?: LogLevel;
    enableConsole?: boolean;
    enablePerformance?: boolean;
  };

  /** HTTP configuration */
  http?: {
    timeout?: number;
    retries?: number;
    enableAuth?: boolean;
  };

  /** Caching configuration */
  cache?: {
    strategy?: CacheStrategy;
    ttl?: number;
  };
}

// Main context interface with focused SharePoint properties
export interface SPFxContext {
  // Core SPFx objects - REQUIRED
  readonly context: SPFxContextInput;
  readonly pageContext: PageContext;

  // PnP SP instances with different caching strategies
  readonly sp: SPFI;
  readonly spCached: SPFI; // Always available (falls back to sp if no caching)
  readonly spPessimistic: SPFI; // Always available (falls back to sp if no pessimistic caching)

  // Essential SharePoint URL properties (web-only)
  readonly webAbsoluteUrl: string;
  readonly webServerRelativeUrl: string;

  // Web metadata
  readonly webTitle: string;
  readonly webId?: string;

  // List context (when available)
  readonly listId?: string;
  readonly listTitle?: string;
  readonly listServerRelativeUrl?: string;

  // Culture and localization
  readonly currentUICultureName: string;
  readonly currentCultureName: string;
  readonly isRightToLeft: boolean;

  // Simple user information (authenticated org users only)
  readonly currentUser: IPrincipal;

  // Application and tenant information
  readonly applicationName: string;
  readonly tenantUrl: string;

  // Environment and runtime information
  readonly environment: EnvironmentName;
  readonly correlationId: string;
  readonly isTeamsContext: boolean;

  // Utility instances
  readonly logger: Logger;
  readonly http: HttpClient;
  readonly performance: PerformanceTracker;

  // Optional advanced features
  readonly links?: LinkBuilder;
}

// Logger interface
export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any, data?: any): void;
  success(message: string, data?: any): void;
  startTimer(name: string): () => number;

  // Log management
  getEntries?(): LogEntry[];
  clear?(): void;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  correlationId: string;
  component: string;
}

// HTTP interface
export interface HttpClient {
  get<T = any>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<HttpResponse<T>>;

  // Azure AD methods
  callFunction<T = any>(options: FunctionCallOptions): Promise<HttpResponse<T>>;
  triggerFlow<T = any>(options: FlowCallOptions): Promise<HttpResponse<T>>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  useAuth?: boolean;
  resourceUri?: string;
  functionKey?: string;
}

export interface FunctionCallOptions extends RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
}

export interface FlowCallOptions extends RequestOptions {
  url: string;
  data?: any;
  idempotencyKey?: string;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  duration: number;
}

// Performance interface
export interface PerformanceTracker {
  track<T>(name: string, operation: () => Promise<T>): Promise<T>;
  getMetrics(): PerformanceMetric[];
  getAverageTime(operationName?: string): number;
  getSlowOperations(threshold?: number): PerformanceMetric[];
  getFailedOperations(): PerformanceMetric[];
  clear(): void;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

// Link builder interface (optional module)
export interface LinkBuilder {
  file: {
    view(path: string): string;
    edit(path: string): string;
    download(path: string): string;
  };

  listItem: {
    view(listUrl: string, itemId: number): string;
    edit(listUrl: string, itemId: number): string;
    newItem(listUrl: string): string;
  };
}

// Context health check interface
export interface ContextHealthCheck {
  isHealthy: boolean;
  issues: ContextIssue[];
  recommendations: string[];
  performance: {
    averageResponseTime: number;
    slowOperations: number;
    errorRate: number;
  };
}

export interface ContextIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'network' | 'configuration';
  message: string;
  details?: any;
  resolution?: string;
}

// Error types
export interface ContextError extends Error {
  code?: string;
  context?: any;
  recoverable?: boolean;
  timestamp?: number;
  correlationId?: string;
}

// Module interfaces for extensibility
export interface ContextModule {
  name: string;
  initialize(context: SPFxContextInput, config: ContextConfig): Promise<any>;
  cleanup?(): void;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthProvider {
  getToken(resourceUri: string): Promise<string>;
  isAuthenticated(): boolean;
}
