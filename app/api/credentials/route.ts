/**
 * Credentials API
 * 
 * List and manage user credentials
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { database } from "@/lib/database";
import { credentials } from "@/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/credentials
 * List all credentials for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userCredentials = await database.query.credentials.findMany({
      where: eq(credentials.userId, user.id),
    });

    // Return credentials without sensitive data
    const safeCredentials = userCredentials.map(cred => ({
      id: cred.id,
      provider: cred.provider,
      name: cred.name,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
      // Include email for OAuth credentials if available
      email: (cred.credentials as any)?.email,
    }));

    return NextResponse.json({ credentials: safeCredentials });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credentials
 * Create a new API key credential
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, name, apiKey } = body;

    if (!provider || !name || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, name, apiKey" },
        { status: 400 }
      );
    }

    const [newCredential] = await database
      .insert(credentials)
      .values({
        userId: user.id,
        provider,
        name,
        credentials: {
          type: "api_key",
          apiKey,
        },
      })
      .returning();

    return NextResponse.json({
      credential: {
        id: newCredential.id,
        provider: newCredential.provider,
        name: newCredential.name,
        createdAt: newCredential.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating credential:", error);
    return NextResponse.json(
      { error: "Failed to create credential" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credentials?id=xxx
 * Delete a credential
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing credential ID" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await database.query.credentials.findFirst({
      where: eq(credentials.id, id),
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    await database.delete(credentials).where(eq(credentials.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}


