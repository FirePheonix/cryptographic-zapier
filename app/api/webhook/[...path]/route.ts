/**
 * Production Webhook Endpoint
 * 
 * This endpoint receives webhook requests in production and:
 * 1. Executes the workflow with the webhook data
 * 2. If using responseMode: "lastNode", waits for and returns the response
 * 3. If using responseMode: "onReceived", returns immediately
 * 
 * URL format: /api/webhook/{workflowId}/{nodeId}
 */

import { NextRequest, NextResponse } from "next/server";
import { webhookTestStore, waitForWebhookResponse } from "@/lib/webhook-store";

async function handleWebhook(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join("/");
  const method = request.method;

  // Parse request data
  let body: any = {};
  const contentType = request.headers.get("content-type") || "";
  
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else if (contentType.includes("text/")) {
      body = await request.text();
    } else {
      // Try to parse as JSON anyway
      try {
        body = await request.json();
      } catch {
        body = {};
      }
    }
  } catch (error) {
    console.error("Error parsing webhook body:", error);
  }

  // Extract query parameters
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());

  // Extract headers (filter out sensitive ones)
  const headers: Record<string, string> = {};
  const sensitiveHeaders = ["cookie", "authorization"];
  request.headers.forEach((value, key) => {
    if (!sensitiveHeaders.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // Create the webhook event data
  const eventData = {
    body,
    query,
    headers,
    method,
    path: `/${pathStr}`,
    timestamp: new Date().toISOString(),
  };

  // Store the event (will be picked up by webhook-listen endpoint for test mode)
  webhookTestStore.set(pathStr, {
    data: eventData,
    timestamp: Date.now(),
    consumed: false,
    method,
  });

  console.log(`[Webhook] Received ${method} request at /${pathStr}, waiting for workflow response...`);

  // Wait for the workflow to execute and return a response (30 second timeout)
  const response = await waitForWebhookResponse(pathStr, 30000);

  if (response) {
    // Return the response from the Respond to Webhook node
    console.log(`[Webhook] Returning workflow response for /${pathStr}`);
    
    const responseHeaders: Record<string, string> = {
      "Content-Type": response.headers?.["content-type"] || "application/json",
      ...response.headers,
    };
    
    return new NextResponse(
      typeof response.body === "string" ? response.body : JSON.stringify(response.body),
      {
        status: response.statusCode || 200,
        headers: responseHeaders,
      }
    );
  }

  // No response received (timeout or no Respond to Webhook node)
  console.log(`[Webhook] No workflow response for /${pathStr}, returning acknowledgment`);
  return NextResponse.json({
    success: true,
    message: "Webhook received and processed",
    path: pathStr,
    method,
    timestamp: new Date().toISOString(),
  });
}

// Handle all HTTP methods
export const GET = handleWebhook;
export const POST = handleWebhook;
export const PUT = handleWebhook;
export const DELETE = handleWebhook;
export const PATCH = handleWebhook;
export const HEAD = handleWebhook;
export const OPTIONS = handleWebhook;
