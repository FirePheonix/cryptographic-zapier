import OpenAI from "openai";
import { env } from "./env";

// Lazy-initialize OpenAI client (only when needed at runtime)
let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return _openai;
};

// Types for workflow execution
export type WorkflowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

export type WorkflowContent = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type ExecutionContext = {
  triggerInput: Record<string, unknown>;
  previousOutput: unknown;
  executionLog: Array<{
    nodeId: string;
    nodeType: string;
    status: "success" | "error";
    input: unknown;
    output: unknown;
    error?: string;
    timestamp: string;
  }>;
};

export type ExecutionResult = {
  success: boolean;
  output?: unknown;
  error?: string;
  executionLog: ExecutionContext["executionLog"];
};

/**
 * Interpolates variables in a string template
 * Supports: {{previous.output}}, {{trigger.fieldName}}, {{trigger.nested.field}}
 */
export function interpolateVariables(
  template: string,
  context: ExecutionContext
): string {
  if (!template) return template;

  return template.replace(/\{\{([^}]+)\}\}/g, (_match: string, path: string) => {
    const parts = path.trim().split(".");
    let value: unknown;

    if (parts[0] === "previous") {
      // Handle {{previous.output}} or {{previous.field}}
      if (parts[1] === "output") {
        value = context.previousOutput;
      } else if (typeof context.previousOutput === "object" && context.previousOutput !== null) {
        value = (context.previousOutput as Record<string, unknown>)[parts.slice(1).join(".")];
      }
    } else if (parts[0] === "trigger") {
      // Handle {{trigger.fieldName}} or {{trigger.nested.field}}
      const triggerParts = parts.slice(1);
      value = triggerParts.reduce((obj: unknown, key: string): unknown => {
        if (obj && typeof obj === "object") {
          return (obj as Record<string, unknown>)[key];
        }
        return undefined;
      }, context.triggerInput as unknown);
    }

    // Convert value to string
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  });
}

/**
 * Execute a single node
 */
async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  switch (node.type) {
    case "trigger":
    case "manualTrigger":
      // Trigger nodes pass through the input (empty {} for manual trigger)
      return { output: context.triggerInput || {} };

    case "webhookTrigger":
      // Webhook trigger passes through request data (body, query, headers, method)
      return { 
        output: {
          body: context.triggerInput.body || {},
          query: context.triggerInput.query || {},
          headers: context.triggerInput.headers || {},
          method: context.triggerInput.method || "POST",
          path: context.triggerInput.path || "",
          ...context.triggerInput,
        }
      };

    case "respondToWebhook":
      // This node prepares the response data - actual HTTP response is handled by the API route
      return executeRespondToWebhookNode(node, context);

    case "openai":
      return executeOpenAINode(node, context);

    case "email":
      return executeEmailNode(node, context);

    case "googleSheets":
      return executeGoogleSheetsNode(node, context);

    default:
      return { output: null, error: `Unknown node type: ${node.type}` };
  }
}

/**
 * Execute OpenAI node
 */
async function executeOpenAINode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  try {
    const data = node.data as {
      model?: string;
      prompt?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    };

    const model = data.model || "gpt-4o-mini";
    const prompt = interpolateVariables(data.prompt || "", context);
    const systemPrompt = interpolateVariables(data.systemPrompt || "", context);

    if (!prompt) {
      return { output: null, error: "OpenAI node requires a prompt" };
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const completion = await getOpenAI().chat.completions.create({
      model,
      messages,
      max_tokens: data.maxTokens || 1000,
      temperature: data.temperature ?? 0.7,
    });

    const output = completion.choices[0]?.message?.content || "";
    return { output };
  } catch (error) {
    return {
      output: null,
      error: error instanceof Error ? error.message : "OpenAI API error",
    };
  }
}

/**
 * Execute Email node - sends email via Resend (or SMTP if configured)
 */
async function executeEmailNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  try {
    const data = node.data as {
      to?: string;
      subject?: string;
      body?: string;
      smtpHost?: string;
      smtpPort?: string;
      smtpUser?: string;
      smtpPass?: string;
    };

    const to = interpolateVariables(data.to || "", context);
    const subject = interpolateVariables(data.subject || "", context);
    const body = interpolateVariables(data.body || "", context);

    if (!to) {
      return { output: null, error: "Email node requires a recipient (to)" };
    }

    // Use Resend API (already configured in the app)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_TOKEN}`,
      },
      body: JSON.stringify({
        from: env.RESEND_EMAIL,
        to: [to],
        subject: subject || "Workflow Notification",
        text: body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        output: null,
        error: `Email send failed: ${errorData.message || response.statusText}`,
      };
    }

    const result = await response.json();
    return {
      output: {
        success: true,
        messageId: result.id,
        to,
        subject,
      },
    };
  } catch (error) {
    return {
      output: null,
      error: error instanceof Error ? error.message : "Email send error",
    };
  }
}

/**
 * Execute Google Sheets node - appends a row to a sheet
 */
async function executeGoogleSheetsNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  try {
    const data = node.data as {
      spreadsheetId?: string;
      sheetName?: string;
      values?: string;
      credentialsJson?: string;
    };

    const spreadsheetId = interpolateVariables(data.spreadsheetId || "", context);
    const sheetName = interpolateVariables(data.sheetName || "Sheet1", context);
    const valuesTemplate = interpolateVariables(data.values || "", context);

    if (!spreadsheetId) {
      return { output: null, error: "Google Sheets node requires a spreadsheet ID" };
    }

    // Parse values - should be a JSON array
    let values: string[];
    try {
      values = JSON.parse(valuesTemplate);
      if (!Array.isArray(values)) {
        values = [String(valuesTemplate)];
      }
    } catch {
      // If not valid JSON, treat as comma-separated
      values = valuesTemplate.split(",").map((v) => v.trim());
    }

    // Get access token from service account credentials
    let accessToken: string;

    if (data.credentialsJson) {
      // Use provided credentials
      const credentials = JSON.parse(data.credentialsJson);
      accessToken = await getGoogleAccessToken(credentials);
    } else {
      // Use environment variable for credentials
      const credentialsEnv = process.env.GOOGLE_SHEETS_CREDENTIALS;
      if (!credentialsEnv) {
        return {
          output: null,
          error: "Google Sheets credentials not configured",
        };
      }
      const credentials = JSON.parse(credentialsEnv);
      accessToken = await getGoogleAccessToken(credentials);
    }

    // Append row to sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        values: [values],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        output: null,
        error: `Google Sheets API error: ${errorData.error?.message || response.statusText}`,
      };
    }

    const result = await response.json();
    return {
      output: {
        success: true,
        updatedRange: result.updates?.updatedRange,
        updatedRows: result.updates?.updatedRows,
        values,
      },
    };
  } catch (error) {
    return {
      output: null,
      error: error instanceof Error ? error.message : "Google Sheets error",
    };
  }
}

/**
 * Execute Respond to Webhook node
 * Prepares the HTTP response data that will be sent back to the caller
 */
async function executeRespondToWebhookNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<{ output: unknown; error?: string }> {
  try {
    const data = node.data as {
      statusCode?: number;
      contentType?: string;
      responseBody?: string;
      headers?: Array<{ key: string; value: string }>;
      respondWith?: string;
    };

    const statusCode = data.statusCode || 200;
    const contentType = data.contentType || "application/json";
    const respondWith = data.respondWith || "allInputs";
    
    // Build custom headers
    const customHeaders: Record<string, string> = {};
    if (data.headers) {
      for (const header of data.headers) {
        if (header.key) {
          customHeaders[header.key] = header.value;
        }
      }
    }

    // Determine response body based on respondWith setting
    let responseBody: unknown;
    
    switch (respondWith) {
      case "firstInput":
        // Get first item from previous output
        if (Array.isArray(context.previousOutput)) {
          responseBody = context.previousOutput[0];
        } else {
          responseBody = context.previousOutput;
        }
        break;
        
      case "allInputs":
        // Return all items (wrap in array if not already)
        responseBody = Array.isArray(context.previousOutput) 
          ? context.previousOutput 
          : [context.previousOutput];
        break;
        
      case "custom":
        // Use custom response body (with variable interpolation)
        if (data.responseBody) {
          const interpolated = interpolateVariables(data.responseBody, context);
          try {
            // Try to parse as JSON if it looks like JSON
            if (contentType === "application/json") {
              responseBody = JSON.parse(interpolated);
            } else {
              responseBody = interpolated;
            }
          } catch {
            responseBody = interpolated;
          }
        } else {
          responseBody = {};
        }
        break;
        
      case "noData":
        responseBody = null;
        break;
        
      default:
        responseBody = context.previousOutput;
    }

    return {
      output: {
        __isWebhookResponse: true,
        statusCode,
        contentType,
        headers: customHeaders,
        body: responseBody,
      },
    };
  } catch (error) {
    return {
      output: null,
      error: error instanceof Error ? error.message : "Respond to Webhook error",
    };
  }
}

/**
 * Get Google access token from service account credentials using JWT
 * This is a simplified implementation that creates a JWT token for Google API auth
 */
async function getGoogleAccessToken(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  // Use crypto for JWT signing
  const crypto = await import("crypto");

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64UrlEncode = (data: string) => {
    return Buffer.from(data)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign
    .sign(credentials.private_key, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Google access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Build execution order from nodes and edges (topological sort starting from trigger)
 */
function buildExecutionOrder(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const order: WorkflowNode[] = [];
  const visited = new Set<string>();

  // Find the trigger node (manual trigger or webhook trigger)
  const triggerNode = nodes.find((n) => n.type === "trigger" || n.type === "manualTrigger" || n.type === "webhookTrigger");
  if (!triggerNode) {
    throw new Error("Workflow must have a trigger node");
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  // BFS from trigger node (linear execution)
  const queue = [triggerNode.id];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (node && node.type !== "drop") {
      order.push(node);
    }

    const targets = adjacency.get(nodeId) || [];
    for (const targetId of targets) {
      if (!visited.has(targetId)) {
        queue.push(targetId);
      }
    }
  }

  return order;
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  content: WorkflowContent,
  triggerInput: Record<string, unknown>
): Promise<ExecutionResult> {
  const context: ExecutionContext = {
    triggerInput,
    previousOutput: triggerInput,
    executionLog: [],
  };

  try {
    // Build execution order
    const executionOrder = buildExecutionOrder(content.nodes, content.edges);

    if (executionOrder.length === 0) {
      return {
        success: false,
        error: "No executable nodes in workflow",
        executionLog: context.executionLog,
      };
    }

    // Execute nodes in order
    for (const node of executionOrder) {
      const input = {
        triggerInput: context.triggerInput,
        previousOutput: context.previousOutput,
      };

      const { output, error } = await executeNode(node, context);

      context.executionLog.push({
        nodeId: node.id,
        nodeType: node.type,
        status: error ? "error" : "success",
        input,
        output,
        error,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          error: `Node ${node.type} (${node.id}) failed: ${error}`,
          executionLog: context.executionLog,
        };
      }

      // Pass output to next node
      context.previousOutput = output;
    }

    return {
      success: true,
      output: context.previousOutput,
      executionLog: context.executionLog,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown execution error",
      executionLog: context.executionLog,
    };
  }
}


