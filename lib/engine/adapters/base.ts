/**
 * Base Provider Adapter
 * 
 * Abstract base class for all provider adapters with common functionality.
 */

import type {
  Credentials,
  ExecutionContext,
  ExecutionError,
  NodeExecutionResult,
  OAuthCredentials,
  OperationId,
  ProviderAdapter,
  ProviderId,
  RetryConfig,
} from "../types";
import { createError, normalizeError, withRetry, isRateLimited, recordRequest, DEFAULT_RETRY_CONFIG } from "../rate-limit";

/**
 * Abstract base class for provider adapters
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly providerId: ProviderId;
  abstract readonly supportedOperations: OperationId[];
  
  protected retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;
  
  /**
   * Execute an operation with rate limiting and retry
   */
  async execute(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startedAt = new Date().toISOString();
    let retryCount = 0;
    
    try {
      // Validate operation is supported
      if (!this.supportedOperations.includes(operation)) {
        throw createError(
          "UNSUPPORTED_OPERATION",
          `Operation ${operation} is not supported by ${this.providerId}`,
          { provider: this.providerId, operation, retryable: false }
        );
      }
      
      // Check rate limit
      const rateLimitCheck = isRateLimited(
        context.userId,
        this.providerId,
        operation
      );
      
      if (rateLimitCheck.limited) {
        throw createError(
          "RATE_LIMITED",
          `Rate limit exceeded for ${this.providerId}.${operation}. Retry after ${rateLimitCheck.retryAfter}ms`,
          { provider: this.providerId, operation, retryable: true }
        );
      }
      
      // Execute with retry
      const output = await withRetry(
        async () => {
          recordRequest(context.userId, this.providerId, operation);
          return this.executeOperation(operation, input, credentials, context);
        },
        this.retryConfig,
        (attempt: number) => { retryCount = attempt; }
      );
      
      return {
        success: true,
        output,
        metadata: {
          startedAt,
          completedAt: new Date().toISOString(),
          duration: Date.now() - new Date(startedAt).getTime(),
          retryCount,
        },
      };
    } catch (error) {
      const execError = normalizeError(error);
      execError.provider = this.providerId;
      execError.operation = operation;
      
      return {
        success: false,
        output: {},
        error: execError,
        metadata: {
          startedAt,
          completedAt: new Date().toISOString(),
          duration: Date.now() - new Date(startedAt).getTime(),
          retryCount,
        },
      };
    }
  }
  
  /**
   * Abstract method - implement actual operation execution
   */
  protected abstract executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>>;
  
  /**
   * Refresh OAuth credentials - override if needed
   */
  async refreshCredentials(credentials: OAuthCredentials): Promise<OAuthCredentials> {
    throw createError(
      "NOT_IMPLEMENTED",
      `Credential refresh not implemented for ${this.providerId}`,
      { provider: this.providerId, retryable: false }
    );
  }
  
  /**
   * Validate credentials - override if needed
   */
  async validateCredentials(credentials: Credentials): Promise<boolean> {
    return true;
  }
  
  /**
   * Check if credentials are expired (for OAuth)
   */
  protected isCredentialsExpired(credentials: Credentials): boolean {
    if (credentials.type !== "oauth2") return false;
    const oauth = credentials as OAuthCredentials;
    // Add 5 minute buffer
    return Date.now() > (oauth.expiresAt - 300000);
  }
  
  /**
   * Get valid credentials, refreshing if needed
   */
  protected async getValidCredentials(credentials: Credentials): Promise<Credentials> {
    if (this.isCredentialsExpired(credentials)) {
      if (credentials.type === "oauth2") {
        return this.refreshCredentials(credentials);
      }
    }
    return credentials;
  }
}

/**
 * Helper to make HTTP requests with common error handling
 */
export async function makeRequest(
  url: string,
  options: RequestInit,
  errorContext?: { provider?: ProviderId; operation?: OperationId }
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(errorBody);
      } catch {
        errorData = { raw: errorBody };
      }
      
      // Map HTTP status to error code
      let code = "API_ERROR";
      let retryable = false;
      
      switch (response.status) {
        case 400:
          code = "BAD_REQUEST";
          break;
        case 401:
          code = "UNAUTHORIZED";
          break;
        case 403:
          code = "FORBIDDEN";
          break;
        case 404:
          code = "NOT_FOUND";
          break;
        case 429:
          code = "RATE_LIMITED";
          retryable = true;
          break;
        case 500:
          code = "INTERNAL_ERROR";
          retryable = true;
          break;
        case 502:
        case 503:
        case 504:
          code = "SERVICE_UNAVAILABLE";
          retryable = true;
          break;
      }
      
      throw createError(
        code,
        (errorData as { message?: string; error?: { message?: string } }).message || 
        (errorData as { error?: { message?: string } }).error?.message || 
        response.statusText,
        {
          provider: errorContext?.provider,
          operation: errorContext?.operation,
          retryable,
          details: { status: response.status, ...errorData },
        }
      );
    }
    
    return response;
  } catch (error) {
    if ((error as ExecutionError).code) {
      throw error;
    }
    throw createError(
      "NETWORK_ERROR",
      (error as Error).message || "Network request failed",
      {
        provider: errorContext?.provider,
        operation: errorContext?.operation,
        retryable: true,
      }
    );
  }
}


