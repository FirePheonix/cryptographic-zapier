/**
 * Webhook Test Endpoint
 * 
 * This endpoint receives webhook requests and:
 * 1. Stores the event for the workflow to pick up
 * 2. Waits for the workflow to execute (if using Respond to Webhook node)
 * 3. Returns the response from the Respond to Webhook node
 * 
 * URL format: /api/webhook-test/{workflowId}/{nodeId}
 */

import { NextRequest, NextResponse } from "next/server";
import { webhookTestStore, waitForWebhookResponse } from "@/lib/webhook-store";

async function handleWebhook(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // Normalize path - remove trailing slashes for consistent key matching
  const pathStr = path.join("/").replace(/\/+$/, "");
  const method = request.method;
  
  console.log(`[Webhook Test] Storing event with key: "${pathStr}"`);

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

  // Store the event (will be picked up by webhook-listen endpoint)
  webhookTestStore.set(pathStr, {
    data: eventData,
    timestamp: Date.now(),
    consumed: false,
    method,
  });

  console.log(`[Webhook Test] Received ${method} request at /${pathStr}, waiting for workflow response...`);

  // Wait for the workflow to execute and return a response (30 second timeout)
  const response = await waitForWebhookResponse(pathStr, 30000);

  if (response) {
    // Return the response from the Respond to Webhook node
    console.log(`[Webhook Test] Returning workflow response for /${pathStr}`);
    
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
  console.log(`[Webhook Test] No workflow response for /${pathStr}, returning acknowledgment`);
  return NextResponse.json({
    success: true,
    message: "Webhook received. Workflow executed but no response was configured.",
    path: pathStr,
    method,
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
