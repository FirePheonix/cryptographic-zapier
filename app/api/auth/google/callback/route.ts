/**
 * Google OAuth Callback
 * 
 * Handles the OAuth callback, exchanges code for tokens, and stores credentials
 */

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { database } from "@/lib/database";
import { credentials } from "@/schema";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Parse state to get redirect path
  let redirectPath = "/settings/connections";
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      redirectPath = stateData.redirect || redirectPath;
    } catch {
      // Ignore parse errors
    }
  }

  // Use NEXT_PUBLIC_APP_URL if available (for tunnels/proxies), otherwise use request origin
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(
      `${origin}${redirectPath}?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}${redirectPath}?error=${encodeURIComponent("No authorization code received")}`
    );
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${origin}${redirectPath}?error=${encodeURIComponent("Google OAuth not configured")}`
    );
  }

  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect(`${origin}/auth/login?redirect=${redirectPath}`);
    }

    // Exchange code for tokens
    const callbackUrl = `${origin}/api/auth/google/callback`;
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${origin}${redirectPath}?error=${encodeURIComponent("Failed to exchange authorization code")}`
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let googleEmail = "Unknown";
    let googleName = "Google Account";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      googleEmail = userInfo.email || googleEmail;
      googleName = userInfo.name || googleEmail;
    }

    // Calculate expiry time
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    // Store or update credentials
    const credentialData = {
      type: "oauth2" as const,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      tokenType: tokens.token_type || "Bearer",
      scope: tokens.scope?.split(" ") || [],
      email: googleEmail,
    };

    // Check if user already has Google credentials
    const existing = await database.query.credentials.findFirst({
      where: and(
        eq(credentials.userId, user.id),
        eq(credentials.provider, "google")
      ),
    });

    if (existing) {
      // Update existing
      await database
        .update(credentials)
        .set({
          name: googleName,
          credentials: credentialData,
          updatedAt: new Date(),
        })
        .where(eq(credentials.id, existing.id));
    } else {
      // Create new
      await database.insert(credentials).values({
        userId: user.id,
        provider: "google",
        name: googleName,
        credentials: credentialData,
      });
    }

    return NextResponse.redirect(
      `${origin}${redirectPath}?success=${encodeURIComponent("Google account connected successfully!")}`
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${origin}${redirectPath}?error=${encodeURIComponent("Failed to complete Google authentication")}`
    );
  }
}


