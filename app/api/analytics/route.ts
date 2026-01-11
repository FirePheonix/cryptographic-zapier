/**
 * Analytics API
 * 
 * Provides real-time analytics data cached in Redis
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserExecutionCount } from "@/lib/redis-cache";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get execution counts from Redis
    const [hourly, daily, monthly] = await Promise.all([
      getUserExecutionCount(user.id, "hour"),
      getUserExecutionCount(user.id, "day"),
      getUserExecutionCount(user.id, "month"),
    ]);

    return NextResponse.json({
      executions: {
        lastHour: hourly,
        last24Hours: daily,
        last30Days: monthly,
      },
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}


