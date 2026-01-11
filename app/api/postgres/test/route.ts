/**
 * PostgreSQL Test Connection API
 * 
 * Tests a PostgreSQL connection and returns available tables.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import postgres from "postgres";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { success: false, error: "Connection string is required" },
        { status: 400 }
      );
    }

    // Create connection
    const sql = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      connection: {
        application_name: "zynthex-test",
      },
      max: 1,
      idle_timeout: 5,
      connect_timeout: 30,
    });

    try {
      // Test connection by listing tables
      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      // Close connection
      await sql.end();

      return NextResponse.json({
        success: true,
        tables: tables.map(t => t.table_name),
        message: "Connection successful",
      });
    } catch (dbError) {
      await sql.end().catch(() => {}); // Ignore close errors
      throw dbError;
    }
  } catch (error) {
    console.error("PostgreSQL test error:", error);
    
    let errorMessage = "Failed to connect to database";
    if (error instanceof Error) {
      if (error.message.includes("ENOTFOUND")) {
        errorMessage = "Host not found. Check your connection string.";
      } else if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "Connection refused. Check if the database is running.";
      } else if (error.message.includes("password authentication failed")) {
        errorMessage = "Authentication failed. Check your credentials.";
      } else if (error.message.includes("does not exist")) {
        errorMessage = "Database does not exist.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}


