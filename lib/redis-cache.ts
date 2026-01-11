/**
 * Redis Caching Layer
 * 
 * Provides caching utilities for workflows, users, and other frequently accessed data.
 * Falls back to database if Redis is not available.
 */

import { redis } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const CACHE_TTL = {
  WORKFLOW: 60 * 5, // 5 minutes
  USER: 60 * 10, // 10 minutes
  CREDENTIALS: 60 * 5, // 5 minutes
  EXECUTION_STATUS: 60 * 2, // 2 minutes
} as const;

const CACHE_PREFIX = {
  WORKFLOW: "workflow:",
  USER: "user:",
  CREDENTIALS: "cred:",
  EXECUTION: "exec:",
  RATE_LIMIT: "rl:",
} as const;

const isRedisAvailable = () => {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
};

/**
 * Get cached workflow by ID
 */
export async function getCachedWorkflow<T>(workflowId: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  
  try {
    const cached = await redis.get<T>(`${CACHE_PREFIX.WORKFLOW}${workflowId}`);
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * Cache workflow data
 */
export async function setCachedWorkflow<T>(
  workflowId: string,
  data: T,
  ttl: number = CACHE_TTL.WORKFLOW
): Promise<void> {
  if (!isRedisAvailable()) return;
  
  try {
    await redis.setex(
      `${CACHE_PREFIX.WORKFLOW}${workflowId}`,
      ttl,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * Invalidate workflow cache
 */
export async function invalidateWorkflowCache(workflowId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  
  try {
    await redis.del(`${CACHE_PREFIX.WORKFLOW}${workflowId}`);
  } catch (error) {
    console.error("Redis del error:", error);
  }
}

/**
 * Get cached user data
 */
export async function getCachedUser<T>(userId: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  
  try {
    const cached = await redis.get<T>(`${CACHE_PREFIX.USER}${userId}`);
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * Cache user data
 */
export async function setCachedUser<T>(
  userId: string,
  data: T,
  ttl: number = CACHE_TTL.USER
): Promise<void> {
  if (!isRedisAvailable()) return;
  
  try {
    await redis.setex(
      `${CACHE_PREFIX.USER}${userId}`,
      ttl,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * Get execution status from cache
 */
export async function getCachedExecutionStatus(
  executionId: string
): Promise<{ status: string; progress?: number } | null> {
  if (!isRedisAvailable()) return null;
  
  try {
    const cached = await redis.get<{ status: string; progress?: number }>(
      `${CACHE_PREFIX.EXECUTION}${executionId}`
    );
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * Update execution status in cache
 */
export async function setCachedExecutionStatus(
  executionId: string,
  status: string,
  progress?: number
): Promise<void> {
  if (!isRedisAvailable()) return;
  
  try {
    await redis.setex(
      `${CACHE_PREFIX.EXECUTION}${executionId}`,
      CACHE_TTL.EXECUTION_STATUS,
      JSON.stringify({ status, progress, updatedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * Generic cache get with fallback
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!isRedisAvailable()) {
    return await fetchFn();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const data = await fetchFn();
    
    // Cache the result
    await redis.setex(key, ttl, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error("Redis cache error:", error);
    // Fallback to direct fetch
    return await fetchFn();
  }
}

/**
 * Batch invalidate caches by pattern
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  if (!isRedisAvailable()) return;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Redis invalidate error:", error);
  }
}

/**
 * Track workflow execution count per user (for analytics/limits)
 */
export async function incrementUserExecutionCount(
  userId: string,
  period: "hour" | "day" | "month" = "hour"
): Promise<number> {
  if (!isRedisAvailable()) return 0;
  
  try {
    const now = new Date();
    let key: string;
    let ttl: number;

    switch (period) {
      case "hour":
        key = `executions:${userId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        ttl = 3600; // 1 hour
        break;
      case "day":
        key = `executions:${userId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        ttl = 86400; // 24 hours
        break;
      case "month":
        key = `executions:${userId}:${now.getFullYear()}-${now.getMonth()}`;
        ttl = 2592000; // 30 days
        break;
    }

    const count = await redis.incr(key);
    
    // Set expiry on first increment
    if (count === 1) {
      await redis.expire(key, ttl);
    }

    return count;
  } catch (error) {
    console.error("Redis increment error:", error);
    return 0;
  }
}

/**
 * Get user execution count
 */
export async function getUserExecutionCount(
  userId: string,
  period: "hour" | "day" | "month" = "hour"
): Promise<number> {
  if (!isRedisAvailable()) return 0;
  
  try {
    const now = new Date();
    let key: string;

    switch (period) {
      case "hour":
        key = `executions:${userId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        break;
      case "day":
        key = `executions:${userId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        break;
      case "month":
        key = `executions:${userId}:${now.getFullYear()}-${now.getMonth()}`;
        break;
    }

    const count = await redis.get<number>(key);
    return count ?? 0;
  } catch (error) {
    console.error("Redis get count error:", error);
    return 0;
  }
}

export { CACHE_TTL, CACHE_PREFIX };


