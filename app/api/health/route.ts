/**
 * Health Check API
 * 
 * Verifies system health including Redis connection
 */

import { NextResponse } from "next/server";
import { redis } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { database } from "@/lib/database";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    services: {
      database: { status: "unknown" as "ok" | "error" | "unknown", message: "" },
      redis: { status: "unknown" as "ok" | "error" | "unknown", message: "" },
    },
  };

  // Check database
  try {
    await database.execute("SELECT 1");
    checks.services.database.status = "ok";
    checks.services.database.message = "Database connection successful";
  } catch (error) {
    checks.services.database.status = "error";
    checks.services.database.message = error instanceof Error ? error.message : "Database connection failed";
    checks.status = "unhealthy";
  }

  // Check Redis
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const testKey = `health:${Date.now()}`;
      await redis.set(testKey, "ok", { ex: 10 });
      const value = await redis.get(testKey);
      await redis.del(testKey);
      
      if (value === "ok") {
        checks.services.redis.status = "ok";
        checks.services.redis.message = "Redis connection successful";
      } else {
        checks.services.redis.status = "error";
        checks.services.redis.message = "Redis read/write failed";
        checks.status = "degraded";
      }
    } catch (error) {
      checks.services.redis.status = "error";
      checks.services.redis.message = error instanceof Error ? error.message : "Redis connection failed";
      checks.status = "degraded"; // Redis is optional, so degraded not unhealthy
    }
  } else {
    checks.services.redis.status = "ok";
    checks.services.redis.message = "Redis not configured (optional)";
  }

  const statusCode = checks.status === "healthy" ? 200 : checks.status === "degraded" ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}


