/**
 * Rate Limiting and Retry Logic
 * 
 * Provides rate limiting per provider/operation and exponential backoff retry.
 */

import type { 
  ExecutionError, 
  ProviderId, 
  OperationId, 
  RateLimitConfig, 
  RateLimitState,
  RetryConfig 
} from "./types";

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default rate limits per provider
 */
export const DEFAULT_RATE_LIMITS: Record<ProviderId, RateLimitConfig> = {
  google: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    retryAfterMs: 5000,
  },
  openai: {
    maxRequests: 60,
    windowMs: 60000,
    retryAfterMs: 10000,
  },
  email: {
    maxRequests: 10,
    windowMs: 60000,
    retryAfterMs: 60000,
  },
  webhook: {
    maxRequests: 100,
    windowMs: 60000,
    retryAfterMs: 1000,
  },
  transform: {
    maxRequests: 1000,
    windowMs: 60000,
    retryAfterMs: 100,
  },
  flow: {
    maxRequests: 10000, // Local operations, no external API calls
    windowMs: 60000,
    retryAfterMs: 100,
  },
  alchemy: {
    maxRequests: 100,
    windowMs: 60000,
    retryAfterMs: 5000,
  },
  postgres: {
    maxRequests: 100,
    windowMs: 60000,
    retryAfterMs: 1000,
  },
  agent: {
    maxRequests: 50, // AI Agent can make multiple LLM calls per execution
    windowMs: 60000,
    retryAfterMs: 5000,
  },
  anthropic: {
    maxRequests: 60,
    windowMs: 60000,
    retryAfterMs: 10000,
  },
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    "RATE_LIMITED",
    "TIMEOUT",
    "NETWORK_ERROR",
    "SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR",
  ],
};

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * In-memory rate limit state store
 * In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStates = new Map<string, RateLimitState>();

/**
 * Generate a unique key for rate limit tracking
 */
function getRateLimitKey(
  userId: string,
  provider: ProviderId,
  operation: OperationId
): string {
  return `${userId}:${provider}:${operation}`;
}

/**
 * Check if a request is rate limited
 */
export function isRateLimited(
  userId: string,
  provider: ProviderId,
  operation: OperationId,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS[provider]
): { limited: boolean; retryAfter?: number } {
  const key = getRateLimitKey(userId, provider, operation);
  const now = Date.now();
  
  let state = rateLimitStates.get(key);
  
  // Reset if window has expired
  if (!state || now - state.windowStart > config.windowMs) {
    state = {
      provider,
      operation,
      requests: 0,
      windowStart: now,
      blocked: false,
    };
    rateLimitStates.set(key, state);
  }
  
  // Check if blocked
  if (state.blocked && state.blockedUntil) {
    if (now < state.blockedUntil) {
      return { limited: true, retryAfter: state.blockedUntil - now };
    }
    // Unblock
    state.blocked = false;
    state.blockedUntil = undefined;
    state.requests = 0;
    state.windowStart = now;
  }
  
  // Check if limit exceeded
  if (state.requests >= config.maxRequests) {
    state.blocked = true;
    state.blockedUntil = now + (config.retryAfterMs || 5000);
    return { limited: true, retryAfter: config.retryAfterMs };
  }
  
  return { limited: false };
}

/**
 * Record a request for rate limiting
 */
export function recordRequest(
  userId: string,
  provider: ProviderId,
  operation: OperationId
): void {
  const key = getRateLimitKey(userId, provider, operation);
  const state = rateLimitStates.get(key);
  
  if (state) {
    state.requests++;
  }
}

/**
 * Clear rate limit state (for testing or manual reset)
 */
export function clearRateLimitState(
  userId?: string,
  provider?: ProviderId,
  operation?: OperationId
): void {
  if (userId && provider && operation) {
    rateLimitStates.delete(getRateLimitKey(userId, provider, operation));
  } else if (userId) {
    for (const key of rateLimitStates.keys()) {
      if (key.startsWith(`${userId}:`)) {
        rateLimitStates.delete(key);
      }
    }
  } else {
    rateLimitStates.clear();
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(
  error: ExecutionError,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  return config.retryableErrors.includes(error.code) && error.retryable !== false;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: ExecutionError, delay: number) => void
): Promise<T> {
  let lastError: ExecutionError | undefined;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const execError = normalizeError(error);
      lastError = execError;
      
      if (attempt === config.maxRetries || !isRetryableError(execError, config)) {
        throw execError;
      }
      
      const delay = calculateBackoffDelay(attempt, config);
      onRetry?.(attempt + 1, execError, delay);
      await sleep(delay);
    }
  }
  
  throw lastError || createError("UNKNOWN", "Retry failed with unknown error");
}

// ============================================================================
// Error Normalization
// ============================================================================

/**
 * Create a normalized execution error
 */
export function createError(
  code: string,
  message: string,
  options?: {
    provider?: ProviderId;
    operation?: OperationId;
    retryable?: boolean;
    details?: Record<string, unknown>;
  }
): ExecutionError {
  return {
    code,
    message,
    provider: options?.provider,
    operation: options?.operation,
    retryable: options?.retryable ?? false,
    details: options?.details,
  };
}

/**
 * Normalize any error to ExecutionError format
 */
export function normalizeError(error: unknown): ExecutionError {
  if (isExecutionError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes("rate limit") || message.includes("429")) {
      return createError("RATE_LIMITED", error.message, { retryable: true });
    }
    
    if (message.includes("timeout") || message.includes("timed out")) {
      return createError("TIMEOUT", error.message, { retryable: true });
    }
    
    if (message.includes("network") || message.includes("econnrefused") || message.includes("fetch failed")) {
      return createError("NETWORK_ERROR", error.message, { retryable: true });
    }
    
    if (message.includes("unauthorized") || message.includes("401")) {
      return createError("UNAUTHORIZED", error.message, { retryable: false });
    }
    
    if (message.includes("forbidden") || message.includes("403")) {
      return createError("FORBIDDEN", error.message, { retryable: false });
    }
    
    if (message.includes("not found") || message.includes("404")) {
      return createError("NOT_FOUND", error.message, { retryable: false });
    }
    
    if (message.includes("500") || message.includes("internal server")) {
      return createError("INTERNAL_ERROR", error.message, { retryable: true });
    }
    
    if (message.includes("503") || message.includes("service unavailable")) {
      return createError("SERVICE_UNAVAILABLE", error.message, { retryable: true });
    }
    
    return createError("UNKNOWN", error.message, { retryable: false });
  }
  
  return createError("UNKNOWN", String(error), { retryable: false });
}

/**
 * Type guard for ExecutionError
 */
function isExecutionError(error: unknown): error is ExecutionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "retryable" in error
  );
}


