/**
 * Google OAuth Initiation
 * 
 * Redirects user to Google OAuth consent screen
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectPath = searchParams.get("redirect") || "/settings/connections";
  
  if (!env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID in environment." },
      { status: 500 }
    );
  }

  // Use NEXT_PUBLIC_APP_URL if available (for tunnels/proxies), otherwise use request origin
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const callbackUrl = `${origin}/api/auth/google/callback`;
  
  console.log("Google OAuth callback URL:", callbackUrl);
  
  // Store redirect path in state (you could also use a session/cookie)
  const state = Buffer.from(JSON.stringify({ redirect: redirectPath })).toString("base64url");

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}


