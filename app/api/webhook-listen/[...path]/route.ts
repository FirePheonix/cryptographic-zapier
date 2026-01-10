/**
 * Webhook Listener Endpoint
 * 
 * Polls for incoming webhook test events.
 * Used by the workflow editor to wait for test events.
 * 
 * GET /api/webhook-listen/{workflowId}/{nodeId}
 * Returns the webhook data if available, or waits via long-polling.
 */

import { NextRequest, NextResponse } from "next/server";
import { webhookTestStore } from "@/lib/webhook-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // Normalize path - remove trailing slashes for consistent key matching
  const pathStr = path.join("/").replace(/\/+$/, "");
  const url = new URL(request.url);
  const timeout = parseInt(url.searchParams.get("timeout") || "30000");
  const startTime = Date.now();
  
  console.log(`[Webhook Listen] Polling for key: "${pathStr}"`);
  console.log(`[Webhook Listen] Current store keys:`, Array.from(webhookTestStore.keys()));

  // Poll for the webhook event
  while (Date.now() - startTime < timeout) {
    const event = webhookTestStore.get(pathStr);
    
    if (event && !event.consumed) {
      console.log(`[Webhook Listen] Found event for key: "${pathStr}"`);
      // Mark as consumed so it's not picked up again
      event.consumed = true;
      webhookTestStore.set(pathStr, event);
      
      return NextResponse.json({
        success: true,
        received: true,
        data: event.data,
      });
    }

    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[Webhook Listen] Timeout for key: "${pathStr}", store keys:`, Array.from(webhookTestStore.keys()));

  // Timeout - no event received
  return NextResponse.json({
    success: true,
    received: false,
    message: "No webhook event received within timeout period",
  });
}

// POST to clear/reset a specific listener
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // Normalize path - remove trailing slashes for consistent key matching
  const pathStr = path.join("/").replace(/\/+$/, "");
  const body = await request.json().catch(() => ({}));
  
  console.log(`[Webhook Listen] POST action on key: "${pathStr}"`);
  
  if (body.action === "clear") {
    webhookTestStore.delete(pathStr);
    return NextResponse.json({ success: true, message: "Listener cleared" });
  }

  if (body.action === "reset") {
    const event = webhookTestStore.get(pathStr);
    if (event) {
      event.consumed = false;
      webhookTestStore.set(pathStr, event);
    }
    return NextResponse.json({ success: true, message: "Listener reset" });
  }

  return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
}
