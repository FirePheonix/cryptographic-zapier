/**
 * Webhook Test Store
 * 
 * In-memory store for webhook test events.
 * Used by webhook-test and webhook-listen endpoints.
 * 
 * Uses globalThis to persist across Next.js hot reloads in dev mode.
 * In production, consider using Redis for multi-instance support.
 */

type WebhookEvent = {
  data: any;
  timestamp: number;
  consumed: boolean;
  method: string;
};

export type WebhookResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
};

// Pending response resolvers - keyed by path
type ResponseResolver = {
  resolve: (response: WebhookResponse) => void;
  timeout: NodeJS.Timeout;
};

// Use globalThis to persist stores across hot reloads in Next.js dev mode
const globalForWebhook = globalThis as unknown as {
  webhookTestStore: Map<string, WebhookEvent>;
  webhookResponseStore: Map<string, WebhookResponse>;
  responseResolvers: Map<string, ResponseResolver>;
};

// Initialize stores on globalThis if they don't exist
if (!globalForWebhook.webhookTestStore) {
  globalForWebhook.webhookTestStore = new Map<string, WebhookEvent>();
}
if (!globalForWebhook.webhookResponseStore) {
  globalForWebhook.webhookResponseStore = new Map<string, WebhookResponse>();
}
if (!globalForWebhook.responseResolvers) {
  globalForWebhook.responseResolvers = new Map<string, ResponseResolver>();
}

// Export the global stores
export const webhookTestStore = globalForWebhook.webhookTestStore;
export const webhookResponseStore = globalForWebhook.webhookResponseStore;
const responseResolvers = globalForWebhook.responseResolvers;

/**
 * Set a webhook response (called by workflow executor when Respond to Webhook node runs)
 */
export const setWebhookResponse = (path: string, response: WebhookResponse) => {
  console.log(`[Webhook Store] Setting response for path: ${path}`);
  
  // Store the response
  webhookResponseStore.set(path, response);
  
  // Resolve any waiting promise
  const resolver = responseResolvers.get(path);
  if (resolver) {
    clearTimeout(resolver.timeout);
    resolver.resolve(response);
    responseResolvers.delete(path);
  }
};

/**
 * Wait for a webhook response (called by webhook-test endpoint)
 */
export const waitForWebhookResponse = (path: string, timeoutMs: number = 30000): Promise<WebhookResponse | null> => {
  console.log(`[Webhook Store] Waiting for response on path: ${path}`);
  
  // If response already exists, return immediately
  const existing = webhookResponseStore.get(path);
  if (existing) {
    console.log(`[Webhook Store] Found existing response for path: ${path}`);
    webhookResponseStore.delete(path); // Clear after use
    return Promise.resolve(existing);
  }
  
  // Create a promise that will be resolved when response arrives
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`[Webhook Store] Timeout waiting for response on path: ${path}`);
      responseResolvers.delete(path);
      resolve(null); // Timeout - no response received
    }, timeoutMs);
    
    responseResolvers.set(path, { resolve, timeout });
  });
};

// Clean up old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    for (const [key, value] of webhookTestStore.entries()) {
      if (now - value.timestamp > maxAge) {
        webhookTestStore.delete(key);
        webhookResponseStore.delete(key);
      }
    }
  }, 60 * 1000);
}
