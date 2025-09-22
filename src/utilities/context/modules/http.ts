/**
 * src/context/modules/http.ts
 * High-performance HTTP client with Azure AD support
 */

import type { BaseComponentContext } from '@microsoft/sp-component-base';
import {
  AadHttpClient,
  AadHttpClientFactory,
  HttpClient,
  HttpClientResponse,
  SPHttpClient,
  SPHttpClientResponse,
} from '@microsoft/sp-http';
import type {
  FlowCallOptions,
  FunctionCallOptions,
  HttpResponse,
  HttpClient as IHttpClient,
  Logger,
  RequestOptions,
} from '../types';

interface HttpClientConfig {
  logger: Logger;
  timeout: number;
  retries: number;
  enableAuth: boolean;
}

/**
 * Simple, fast HTTP client with essential features
 */
export class SimpleHttpClient implements IHttpClient {
  private readonly httpClient: HttpClient;
  private readonly spHttpClient: SPHttpClient;
  private readonly aadFactory: AadHttpClientFactory;
  private readonly config: HttpClientConfig;
  private readonly correlationId: string;

  constructor(context: BaseComponentContext, config: HttpClientConfig) {
    this.httpClient = context.httpClient;
    this.spHttpClient = (context as any).spHttpClient;
    this.aadFactory = context.serviceScope.consume(AadHttpClientFactory.serviceKey);
    this.config = config;
    this.correlationId = crypto.randomUUID();
  }

  async get<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T = any>(
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  async callFunction<T = any>(options: FunctionCallOptions): Promise<HttpResponse<T>> {
    const { url, method = 'POST', data, ...requestOptions } = options;

    this.config.logger.info('Calling Azure Function', {
      method,
      url: this.sanitizeUrl(url),
      hasAuth: !!requestOptions.useAuth,
    });

    return this.request<T>(method, url, data, requestOptions);
  }

  async triggerFlow<T = any>(options: FlowCallOptions): Promise<HttpResponse<T>> {
    const { url, data, idempotencyKey, ...requestOptions } = options;

    // Add idempotency header if provided
    const headers = {
      ...requestOptions.headers,
      ...(idempotencyKey && { 'X-Request-Id': idempotencyKey }),
    };

    this.config.logger.info('Triggering Power Platform Flow', {
      url: this.sanitizeUrl(url),
      hasIdempotency: !!idempotencyKey,
      hasAuth: !!requestOptions.useAuth,
    });

    return this.request<T>('POST', url, data, { ...requestOptions, headers });
  }

  // Core request method
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const startTime = performance.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.retries + 1) {
      attempt++;

      try {
        const response = await this.executeRequest<T>(method, url, data, options);
        const duration = performance.now() - startTime;

        this.config.logger.info(`HTTP ${method} completed`, {
          url: this.sanitizeUrl(url),
          status: response.status,
          duration: Math.round(duration),
          attempt,
        });

        return { ...response, duration };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx) except 429
        if (this.isNonRetryableError(error)) {
          break;
        }

        if (attempt < this.config.retries + 1) {
          const delay = this.calculateBackoff(attempt);
          this.config.logger.warn(`HTTP ${method} failed, retrying`, {
            url: this.sanitizeUrl(url),
            attempt,
            delay,
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    const duration = performance.now() - startTime;
    this.config.logger.error(`HTTP ${method} failed after ${attempt} attempts`, lastError, {
      url: this.sanitizeUrl(url),
      duration: Math.round(duration),
    });

    throw lastError;
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const headers = this.buildHeaders(options);
    const body = data ? JSON.stringify(data) : undefined;
    const requestOptions = { method, headers, body };

    let response: HttpClientResponse | SPHttpClientResponse;

    // Use Azure AD client if auth is enabled and resourceUri is provided
    if (options.useAuth && options.resourceUri) {
      const aadClient = await this.aadFactory.getClient(options.resourceUri);
      response = await this.withTimeout(
        aadClient.fetch(url, AadHttpClient.configurations.v1, requestOptions),
        options.timeout || this.config.timeout
      );
    }
    // Use SharePoint client for SP endpoints
    else if (this.isSharePointUrl(url)) {
      response = await this.withTimeout(
        this.spHttpClient.fetch(url, SPHttpClient.configurations.v1, requestOptions),
        options.timeout || this.config.timeout
      );
    }
    // Use regular HTTP client
    else {
      response = await this.withTimeout(
        this.httpClient.fetch(url, HttpClient.configurations.v1, requestOptions),
        options.timeout || this.config.timeout
      );
    }

    // Parse response
    const responseData = await this.parseResponse<T>(response);

    return {
      data: responseData,
      status: response.status,
      ok: response.ok,
      headers: this.extractHeaders(response),
      duration: 0, // Will be set by caller
    };
  }

  private buildHeaders(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': this.correlationId,
      ...options.headers,
    };

    // Add function key authentication
    if (options.functionKey) {
      headers['x-functions-key'] = options.functionKey;
    }

    return headers;
  }

  private async parseResponse<T>(response: HttpClientResponse | SPHttpClientResponse): Promise<T> {
    const text = await response.text();

    if (!text) {
      return null as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // Return as string if not JSON
      return text as T;
    }
  }

  private extractHeaders(
    response: HttpClientResponse | SPHttpClientResponse
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    try {
      if (response.headers && typeof response.headers.forEach === 'function') {
        response.headers.forEach((value: string, key: string) => {
          headers[key.toLowerCase()] = value;
        });
      }
    } catch {
      // Ignore header extraction errors
    }

    return headers;
  }

  private isSharePointUrl(url: string): boolean {
    return url.toLowerCase().includes('/_api/') || url.toLowerCase().includes('sharepoint.com');
  }

  private isNonRetryableError(error: any): boolean {
    const status = error?.status || error?.statusCode;
    return status >= 400 && status < 500 && status !== 429; // Don't retry client errors except rate limit
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter: 200ms, 400ms, 800ms
    const base = 200 * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 100;
    return Math.min(base + jitter, 2000); // Cap at 2 seconds
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return '[Invalid URL]';
    }
  }
}
