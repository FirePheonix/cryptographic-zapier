/**
 * Webhook Provider Adapter
 * 
 * Handles webhook triggers and HTTP requests.
 */

import type {
  Credentials,
  ExecutionContext,
  OperationId,
  WebhookOperation,
} from "../types";
import { BaseProviderAdapter, makeRequest } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// Webhook Provider Adapter
// ============================================================================

export class WebhookAdapter extends BaseProviderAdapter {
  readonly providerId = "webhook" as const;
  readonly supportedOperations: OperationId[] = [
    "trigger",
    "respond",
    "request",
  ];
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    switch (operation as WebhookOperation | "respond") {
      case "trigger":
        return this.trigger(input, context);
      case "respond":
        return this.respond(input, context);
      case "request":
        return this.httpRequest(input);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
    }
  }
  
  // ============================================================================
  // Webhook Operations
  // ============================================================================
  
  /**
   * Trigger operation - passes through trigger input
   */
  private async trigger(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    return {
      success: true,
      ...context.triggerInput,
      triggeredAt: new Date().toISOString(),
    };
  }

  /**
   * Respond to webhook - prepares response data
   * The actual HTTP response is sent by the API route
   */
  private async respond(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const {
      statusCode = 200,
      responseBody,
      respondWith = "allInputs",
      headers = {},
    } = input;

    // Determine what to send in the response
    let body: unknown = responseBody;
    
    // Get all node outputs as array
    const nodeOutputsArray = Array.from(context.nodeOutputs.values());
    
    if (respondWith === "allInputs" || respondWith === "allIncomingItems") {
      // Get all previous outputs, fallback to trigger input
      body = nodeOutputsArray.length > 0 
        ? nodeOutputsArray.map(o => o.output)
        : context.triggerInput || {};
    } else if (respondWith === "firstInput" || respondWith === "firstIncomingItem") {
      const firstOutput = nodeOutputsArray[0];
      body = firstOutput?.output || context.triggerInput || {};
    } else if (respondWith === "lastInput" || respondWith === "lastIncomingItem") {
      const lastOutput = nodeOutputsArray[nodeOutputsArray.length - 1];
      body = lastOutput?.output || context.triggerInput || {};
    } else if (respondWith === "noData") {
      body = {};
    }
    // "custom" / "customBody" uses responseBody as-is

    // Store the response in context for the API route to use
    (context as any)._webhookResponse = {
      statusCode,
      body,
      headers,
    };

    return {
      __isWebhookResponse: true, // Flag for the execute API to detect
      success: true,
      statusCode,
      contentType: (headers as Record<string, string>)?.["content-type"] || "application/json",
      body,
      headers,
      respondedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Make an HTTP request to an external endpoint
   */
  private async httpRequest(
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const {
      url,
      method = "GET",
      headers = {},
      body,
      queryParams,
      timeout = 30000,
      responseType = "json",
    } = input as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      queryParams?: Record<string, string>;
      timeout?: number;
      responseType?: "json" | "text" | "blob";
    };
    
    if (!url) {
      throw createError("VALIDATION_ERROR", "URL is required");
    }
    
    // Build URL with query params
    const requestUrl = new URL(url);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        requestUrl.searchParams.set(key, value);
      }
    }
    
    // Build request options
    const requestOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        ...headers,
      },
    };
    
    // Add body for non-GET requests
    if (body && method.toUpperCase() !== "GET") {
      if (typeof body === "string") {
        requestOptions.body = body;
      } else {
        requestOptions.body = JSON.stringify(body);
        (requestOptions.headers as Record<string, string>)["Content-Type"] = 
          (requestOptions.headers as Record<string, string>)["Content-Type"] || "application/json";
      }
    }
    
    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;
    
    try {
      const response = await fetch(requestUrl.toString(), requestOptions);
      clearTimeout(timeoutId);
      
      // Parse response based on type
      let responseData: unknown;
      const contentType = response.headers.get("content-type") || "";
      
      if (responseType === "json" || contentType.includes("application/json")) {
        responseData = await response.json().catch(() => null);
      } else if (responseType === "text" || contentType.includes("text/")) {
        responseData = await response.text();
      } else {
        responseData = await response.text();
      }
      
      // Build response headers object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        // Convenience field
        output: responseData,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === "AbortError") {
        throw createError("TIMEOUT", `Request timed out after ${timeout}ms`, {
          retryable: true,
        });
      }
      
      throw error;
    }
  }
}

// Export singleton instance
export const webhookAdapter = new WebhookAdapter();


