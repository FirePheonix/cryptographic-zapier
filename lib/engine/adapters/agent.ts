/**
 * AI Agent Provider Adapter - LangGraph Style
 * 
 * Implements LangChain/LangGraph patterns using Vercel AI SDK:
 * - ReAct Agent loop (Reason → Act → Observe → Repeat)
 * - Dynamic tool selection based on LLM decisions
 * - State management like LangGraph's StateGraph
 * - Compatible with the workflow execution engine
 * 
 * Supports multiple LLM providers:
 * - OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)
 * - Anthropic (claude-3-5-sonnet, claude-3-opus, etc.)
 * 
 * Architecture (from LangGraph docs):
 * ┌─────────────────────────────────────────────────────────────┐
 * │                        AI Agent Node                        │
 * │  ┌─────────┐    action    ┌─────────┐                      │
 * │  │ LLM     │ ──────────→  │ Tool    │                      │
 * │  │ call    │              │ Execute │                      │
 * │  └────┬────┘              └────┬────┘                      │
 * │       │                        │                           │
 * │       │        feedback        │                           │
 * │       └────────────────────────┘                           │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * This is ONE node execution to the workflow engine.
 * Tools execute internally, not as separate workflow nodes.
 */

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import OpenAI from "openai";
import { googleAdapter } from "./google";
import {
  broadcastAgentStart,
  broadcastAgentThinking,
  broadcastAgentToolStart,
  broadcastAgentToolEnd,
  broadcastAgentComplete,
  broadcastAgentError,
} from "@/lib/broadcast";
import type {
  Credentials,
  ExecutionContext,
  OperationId,
} from "../types";
import { BaseProviderAdapter } from "./base";
import { createError } from "../rate-limit";

// ============================================================================
// LangGraph-Style State Management
// ============================================================================

interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface AgentState {
  // Input from workflow
  input: string;
  // Conversation messages (like LangGraph's messages state)
  messages: AgentMessage[];
  // Tool call history
  toolCalls: Array<{ tool: string; input: unknown; output: unknown; timestamp: number }>;
  // Current step in the agent loop
  step: "reason" | "act" | "observe" | "complete";
  // Iteration count
  iterations: number;
  // Final output
  output?: string;
  // Error if any
  error?: string;
}

// ============================================================================
// Tool Definitions (LangChain-style)
// ============================================================================

// JSON Schema definition for tool parameters
interface JsonSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    default?: unknown;
  }>;
  required?: string[];
}

interface ToolDefinition {
  name: string;
  description: string;
  schema: JsonSchema;
  execute: (args: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;
}

// Built-in tools factory
function createBuiltinTools(toolConfigs: Array<{ type: string; settings?: Record<string, any> }>): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const config of toolConfigs) {
    const settings = config.settings || {};

    switch (config.type) {
      case "httpRequestTool":
        tools.push({
          name: "http_request",
          description: settings.description || "Make HTTP requests to external APIs. Use this to fetch data from URLs or call REST APIs.",
          schema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'The full URL to request' },
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method' },
              body: { type: 'string', description: 'Request body as JSON string (for POST/PUT/PATCH)' },
              headers: { type: 'object', description: 'Additional headers as key-value pairs' },
            },
            required: ['url'],
          },
          execute: async (args) => {
            const { url, method = "GET", body, headers = {} } = args as {
              url: string;
              method?: string;
              body?: string;
              headers?: Record<string, string>;
            };
            
            const baseUrl = settings.baseUrl || "";
            const fullUrl = baseUrl ? `${baseUrl}${url}` : url;
            
            let defaultHeaders = {};
            try {
              defaultHeaders = settings.defaultHeaders ? JSON.parse(settings.defaultHeaders) : {};
            } catch {}

            const response = await fetch(fullUrl, {
              method,
              headers: { 
                "Content-Type": "application/json", 
                ...defaultHeaders,
                ...headers 
              },
              body: body || undefined,
              signal: AbortSignal.timeout((settings.timeout || 30) * 1000),
            });

            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) {
              return await response.json();
            }
            return await response.text();
          },
        });
        break;

      case "postgresTool":
        tools.push({
          name: "database_query",
          description: settings.description || "Execute SQL queries on the PostgreSQL database. Use for data retrieval and manipulation.",
          schema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'SQL query to execute' },
              params: { type: 'array', description: 'Query parameters for prepared statements' },
            },
            required: ['query'],
          },
          execute: async (args, context) => {
            const { query } = args as { query: string; params?: unknown[] };
            
            // Security: Check if read-only mode
            if (settings.readOnly) {
              const lowerQuery = query.toLowerCase().trim();
              if (!lowerQuery.startsWith("select")) {
                throw new Error("Database is in read-only mode. Only SELECT queries are allowed.");
              }
            }

            // Security: Check allowed tables
            if (settings.allowedTables) {
              const tables = settings.allowedTables.split(",").map((t: string) => t.trim().toLowerCase());
              const queryLower = query.toLowerCase();
              const hasDisallowedTable = !tables.some((table: string) => queryLower.includes(table));
              if (hasDisallowedTable) {
                throw new Error(`Query references tables not in allowed list: ${settings.allowedTables}`);
              }
            }

            // In production, use actual database connection
            // For now, return mock response
            return { 
              message: "Query executed successfully",
              query,
              note: "Database execution requires POSTGRES_URL environment variable"
            };
          },
        });
        break;

      case "googleSheetsTool":
        tools.push({
          name: "google_sheets",
          description: settings.description || "Read from or write to Google Sheets spreadsheets.",
          schema: {
            type: 'object',
            properties: {
              operation: { type: 'string', enum: ['read', 'append', 'update'], description: 'Operation to perform' },
              range: { type: 'string', description: "Cell range in A1 notation (e.g., 'Sheet1!A1:B10')" },
              values: { type: 'array', description: 'Values for append/update operations' },
            },
            required: ['operation', 'range'],
          },
          execute: async (args) => {
            const { operation, range, values } = args as {
              operation: "read" | "append" | "update";
              range: string;
              values?: string[][];
            };

            const allowedOps = settings.allowedOperations || ["read"];
            if (!allowedOps.includes(operation)) {
              throw new Error(`Operation '${operation}' not allowed. Allowed: ${allowedOps.join(", ")}`);
            }

            return {
              message: `Google Sheets ${operation} executed`,
              spreadsheetId: settings.spreadsheetId,
              range,
              values,
              note: "Requires Google OAuth credentials"
            };
          },
        });
        break;

      case "slackTool":
        tools.push({
          name: "slack_message",
          description: settings.description || "Send messages to Slack channels or users.",
          schema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: "Channel name (e.g., '#general') or user ID" },
              message: { type: 'string', description: 'Message text to send' },
              blocks: { type: 'array', description: 'Slack Block Kit blocks for rich formatting' },
            },
            required: ['channel', 'message'],
          },
          execute: async (args) => {
            const { channel, message } = args as { channel: string; message: string };
            
            const targetChannel = channel || settings.defaultChannel || "#general";
            const token = settings.botToken || process.env.SLACK_BOT_TOKEN;

            if (!token) {
              throw new Error("Slack bot token not configured");
            }

            const response = await fetch("https://slack.com/api/chat.postMessage", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ channel: targetChannel, text: message }),
            });

            return await response.json();
          },
        });
        break;

      case "gmailTool":
        tools.push({
          name: "send_email",
          description: settings.description || "Send emails via Gmail.",
          schema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject line' },
              body: { type: 'string', description: 'Email body content (plain text or HTML)' },
              isHtml: { type: 'boolean', description: 'Whether body is HTML' },
            },
            required: ['to', 'subject', 'body'],
          },
          execute: async (args, context) => {
            const { to, subject, body } = args as { to: string; subject: string; body: string };
            
            const allowedOps = settings.allowedOperations || ["send"];
            if (!allowedOps.includes("send")) {
              throw new Error("Send operation not allowed");
            }
            
            try {
                // Execute using Google Adapter
                // It requires credentials for "google"
                // context.credentials.get("google") should exist if user connected Google
                const googleCreds = context.credentials.get("google");
                
                // Debug: Log available credentials
                console.log("[Agent Gmail Tool] Available credential providers:", Array.from(context.credentials.keys()));
                console.log("[Agent Gmail Tool] Google credentials found:", !!googleCreds);
                if (googleCreds) {
                  console.log("[Agent Gmail Tool] Google credential type:", (googleCreds as any).type);
                }
                
                if (!googleCreds) {
                  return {
                    success: false,
                    error: "Google OAuth credentials not found. Please connect your Google account in Settings > Connections.",
                    sent: false
                  };
                }
                
                const result = await googleAdapter.execute("gmail.send", {
                    to,
                    subject,
                    body, 
                    isHtml: args.isHtml
                }, googleCreds, context);
                
                return result;
            } catch (err) {
                console.error("Gmail send failed:", err);
                return {
                    message: "Email sending failed",
                    error: err instanceof Error ? err.message : "Unknown error",
                    sent: false
                };
            }
          },
        });
        break;

      // OpenAI as a TOOL (for content generation, NOT decision making)
      case "openaiTool":
      case "openAiChatModel":
        tools.push({
          name: "openai_generate",
          description: settings.description || "Generate text content using OpenAI GPT models. Use this for writing, summarizing, translating, or any text generation task.",
          schema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'The prompt/instructions for what to generate' },
              systemPrompt: { type: 'string', description: "Optional system prompt to set the AI's behavior" },
              maxTokens: { type: 'number', description: 'Maximum tokens to generate (default: 1000)' },
            },
            required: ['prompt'],
          },
          execute: async (args) => {
            const { prompt, systemPrompt, maxTokens = 1000 } = args as {
              prompt: string;
              systemPrompt?: string;
              maxTokens?: number;
            };

            const apiKey = settings.apiKey || process.env.OPENAI_API_KEY;
            if (!apiKey) {
              throw new Error("OpenAI API key not configured for OpenAI tool");
            }

            const model = settings.model || "gpt-4o-mini";
            const openaiClient = createOpenAI({ apiKey });
            
            const messages: Array<{ role: "system" | "user"; content: string }> = [];
            if (systemPrompt) {
              messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({ role: "user", content: prompt });

            const result = await generateText({
              model: openaiClient(model),
              messages,
            } as any);

            return {
              text: result.text,
              model,
              usage: result.usage,
            };
          },
        });
        break;

      // Anthropic as a TOOL (for content generation, NOT decision making)  
      case "anthropicTool":
      case "anthropicChatModel":
        tools.push({
          name: "anthropic_generate",
          description: settings.description || "Generate text content using Anthropic Claude models. Use this for writing, analysis, coding, or any text generation task.",
          schema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'The prompt/instructions for what to generate' },
              systemPrompt: { type: 'string', description: "Optional system prompt to set the AI's behavior" },
              maxTokens: { type: 'number', description: 'Maximum tokens to generate (default: 1000)' },
            },
            required: ['prompt'],
          },
          execute: async (args) => {
            const { prompt, systemPrompt, maxTokens = 1000 } = args as {
              prompt: string;
              systemPrompt?: string;
              maxTokens?: number;
            };

            const apiKey = settings.apiKey || process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
              throw new Error("Anthropic API key not configured for Anthropic tool");
            }

            const model = settings.model || "claude-3-5-sonnet-20241022";
            const anthropicClient = createAnthropic({ apiKey });
            
            const messages: Array<{ role: "system" | "user"; content: string }> = [];
            if (systemPrompt) {
              messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({ role: "user", content: prompt });

            const result = await generateText({
              model: anthropicClient(model),
              messages,
            } as any);

            return {
              text: result.text,
              model,
              usage: result.usage,
            };
          },
        });
        break;

      case "customTool":
        if (settings.name) {
          let parameters: JsonSchema = { type: 'object', properties: {}, required: [] };
          try {
            const parsed = JSON.parse(settings.parameters || "{}");
            const properties: Record<string, { type: string; description?: string }> = {};
            const required: string[] = [];
            
            for (const [key, value] of Object.entries(parsed)) {
              const v = value as { type: string; description?: string; required?: boolean };
              properties[key] = { 
                type: v.type || 'string', 
                description: v.description || '' 
              };
              if (v.required) {
                required.push(key);
              }
            }
            parameters = { type: 'object', properties, required };
          } catch {}

          tools.push({
            name: settings.name,
            description: settings.description || `Custom tool: ${settings.name}`,
            schema: parameters,
            execute: async (args) => {
              if (settings.webhookUrl) {
                const response = await fetch(settings.webhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(args),
                });
                return await response.json();
              }
              return { message: "Custom tool executed", args };
            },
          });
        }
        break;
    }
  }

  return tools;
}

// ============================================================================
// Agent Adapter (LangGraph-style)
// ============================================================================

export class AgentAdapter extends BaseProviderAdapter {
  readonly providerId = "agent" as const;
  readonly supportedOperations: OperationId[] = [
    "agent.tools",
    "agent.planAndExecute",
    "agent.conversational",
  ];

  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    switch (operation) {
      case "agent.tools":
        return this.executeReActAgent(input, context);
      case "agent.planAndExecute":
        return this.executePlanAndExecute(input, context);
      case "agent.conversational":
        return this.executeConversationalAgent(input, context);
      default:
        throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
    }
  }

  /**
   * ReAct Agent Loop (LangGraph pattern)
   * 
   * Like LangGraph's create_react_agent:
   * 1. REASON: LLM decides what to do
   * 2. ACT: Execute selected tool
   * 3. OBSERVE: Add tool result to state
   * 4. Repeat until LLM returns final answer
   */
  private async executeReActAgent(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║           🤖 AI AGENT EXECUTION STARTED                      ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log(`[Agent] Input keys:`, Object.keys(input));
    console.log(`[Agent] Input:`, JSON.stringify(input).substring(0, 500));
    
    // Extract internal fields for broadcasting
    const nodeId = (input._nodeId as string) || "unknown";
    const workflowId = (input._workflowId as string) || context.workflowId;
    
    const {
      systemPrompt = "You are a helpful AI assistant with access to tools. Use tools when needed to answer questions accurately. Always provide a final answer when you have enough information.",
      maxIterations = 10,
      // NEW: Decision Maker is configured directly on the agent (NOT a sub-node)
      decisionMakerProvider = "openai",
      decisionMakerModel = "gpt-4o-mini",
      decisionMakerApiKey,
      // Legacy support for old chatModelConfig format
      chatModelConfig,
      memoryConfig,
      toolConfigs = [],
    } = input as {
      systemPrompt?: string;
      maxIterations?: number;
      decisionMakerProvider?: string;
      decisionMakerModel?: string;
      decisionMakerApiKey?: string;
      chatModelConfig?: { type: string; settings?: Record<string, any> };
      memoryConfig?: { type: string; settings?: Record<string, any> };
      toolConfigs?: Array<{ type: string; settings?: Record<string, any> }>;
      // Workflow context fields
      trigger?: Record<string, unknown>;
      previous?: Record<string, unknown>;
    };

    // Get user input from workflow - check multiple possible input fields
    let userInput = "";
    
    // First check direct input fields
    if (input.query && typeof input.query === 'string' && input.query.trim()) {
      userInput = input.query;
    } else if (input.prompt && typeof input.prompt === 'string') {
      userInput = input.prompt;
    } else if (input.message && typeof input.message === 'string') {
      userInput = input.message;
    } else if (input.input && typeof input.input === 'string') {
      userInput = input.input;
    }
    // Check trigger data (from webhook)
    else if (input.trigger) {
      const trigger = input.trigger as Record<string, unknown>;
      if (trigger.body && typeof trigger.body === 'object') {
        userInput = `Process this webhook data: ${JSON.stringify(trigger.body)}`;
      } else {
        userInput = `Process this trigger data: ${JSON.stringify(trigger)}`;
      }
    }
    // Check previous node outputs
    else if (input.previous) {
      const prev = input.previous as Record<string, unknown>;
      // Try to find body from webhook trigger in previous
      const values = Object.values(prev);
      for (const val of values) {
        if (val && typeof val === 'object' && 'body' in (val as any)) {
          userInput = `Process this data: ${JSON.stringify((val as any).body)}`;
          break;
        }
      }
      if (!userInput) {
        userInput = `Process this data: ${JSON.stringify(prev)}`;
      }
    }
    
    console.log(`[Agent] User input:`, userInput.substring(0, 200));
    console.log(`[Agent] Decision Maker: ${decisionMakerProvider}/${decisionMakerModel}`);
    console.log(`[Agent] Tool configs:`, toolConfigs?.length || 0, "tools");

    // Determine the API key - prefer new format, fallback to legacy, then env
    // Only use decisionMakerApiKey if it's actually set (not empty string)
    const configApiKey = decisionMakerApiKey && decisionMakerApiKey.trim().length > 0 
                        ? decisionMakerApiKey 
                        : null;
    const legacyApiKey = chatModelConfig?.settings?.apiKey;
    const envApiKey = decisionMakerProvider === "anthropic" 
                     ? process.env.ANTHROPIC_API_KEY 
                     : process.env.OPENAI_API_KEY;
    
    const apiKey = configApiKey || legacyApiKey || envApiKey;
    
    console.log(`[Agent] API Key source: ${configApiKey ? 'config' : legacyApiKey ? 'legacy' : envApiKey ? 'env' : 'NONE'}`);
    console.log(`[Agent] API Key prefix: ${apiKey?.substring(0, 10)}...`);
    
    if (!apiKey) {
      throw createError("VALIDATION_ERROR", `API Key is required for the Decision Maker. Please provide an API key in the AI Agent configuration or set OPENAI_API_KEY in your environment.`);
    }
    
    if (!userInput || userInput === "undefined" || userInput === "{}") {
      console.log(`[Agent] No user input found, using default prompt`);
      userInput = "Hello! What can you help me with?";
    }

    // 🔴 BROADCAST: Agent started
    broadcastAgentStart(workflowId, nodeId, userInput);

    // Initialize LangGraph-style state
    const state: AgentState = {
      input: userInput,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      toolCalls: [],
      step: "reason",
      iterations: 0,
    };

    // Combine chatModelConfig (connected to "Chat Model*" slot) with toolConfigs (connected to "Tool" slot)
    // The "Chat Model*" slot now acts as an LLM tool for content generation
    const allToolConfigs = [
      ...(chatModelConfig ? [{ type: chatModelConfig.type, settings: chatModelConfig.settings || {} }] : []),
      ...toolConfigs
    ];
    
    // Build tools (LangChain-style) - also create a name-to-index map for broadcasting
    const toolDefinitions = createBuiltinTools(allToolConfigs);
    const toolNameToIndex = new Map<string, number>();
    toolDefinitions.forEach((t, i) => toolNameToIndex.set(t.name, i));
    console.log(`[Agent] Created ${toolDefinitions.length} tools:`, toolDefinitions.map(t => t.name));
    
    // Convert to OpenAI tools format (native SDK)
    const openaiTools: OpenAI.ChatCompletionTool[] = toolDefinitions.map(toolDef => ({
      type: 'function' as const,
      function: {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.schema as unknown as OpenAI.FunctionParameters,
      },
    }));
    
    // Create tool execution map
    const toolExecutors: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {};
    for (const toolDef of toolDefinitions) {
      toolExecutors[toolDef.name] = async (args: Record<string, unknown>) => {
        console.log(`[Agent] Executing tool ${toolDef.name} with args:`, JSON.stringify(args).substring(0, 100));
        try {
          const result = await toolDef.execute(args, context);
          console.log(`[Agent] Tool ${toolDef.name} success:`, JSON.stringify(result).substring(0, 100));
          return result;
        } catch (err) {
          console.error(`[Agent] Tool ${toolDef.name} failed:`, err);
          throw err;
        }
      };
    }

    // Select the Decision Maker (using direct OpenAI/Anthropic SDK for reliability)
    const isAnthropic = decisionMakerProvider === "anthropic" || decisionMakerModel.startsWith("claude");
    const openaiClient = isAnthropic ? null : new OpenAI({ apiKey });
    const modelName = decisionMakerModel || (isAnthropic ? "claude-3-5-sonnet-20241022" : "gpt-4o-mini");
    
    console.log(`[Agent] Decision Maker: provider=${decisionMakerProvider}, model=${modelName}, isAnthropic=${isAnthropic}`);

    // ReAct Loop using direct OpenAI SDK (LangGraph pattern)
    while (state.iterations < maxIterations && state.step !== "complete") {
      state.iterations++;
      
      console.log(`[Agent] Iteration ${state.iterations}/${maxIterations}, step: ${state.step}`);

      // 🔴 BROADCAST: Agent is thinking (calling LLM)
      broadcastAgentThinking(workflowId, nodeId, state.iterations);

      try {
        if (isAnthropic) {
          // Anthropic path - use Vercel AI SDK since Anthropic native SDK has different tool format
          const anthropicClient = createAnthropic({ apiKey });
          const result = await generateText({
            model: anthropicClient(modelName),
            messages: state.messages.map(m => ({
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
            })),
            temperature: 0.7,
          } as any);
          
          if (result.text) {
            state.output = result.text;
            state.step = "complete";
          }
        } else {
          // OpenAI path - use direct SDK to avoid Vercel AI SDK jsonSchema bug
          const response = await openaiClient!.chat.completions.create({
            model: modelName,
            messages: state.messages.map(m => ({
              role: m.role as "user" | "assistant" | "system" | "tool",
              content: m.content,
              ...(m.name ? { name: m.name } : {}),
              ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
              ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
            })) as OpenAI.ChatCompletionMessageParam[],
            tools: openaiTools.length > 0 ? openaiTools : undefined,
            tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
            temperature: 0.7,
          });
          
          const message = response.choices[0]?.message;
          
          if (message?.tool_calls && message.tool_calls.length > 0) {
            // Tools were called - add assistant message WITH tool_calls (required by OpenAI)
            state.messages.push({
              role: "assistant",
              content: message.content || "",
              tool_calls: message.tool_calls.map(tc => {
                if (tc.type === 'function') {
                  return {
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                      name: tc.function.name,
                      arguments: tc.function.arguments,
                    },
                  };
                } else {
                  return {
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                      name: tc.custom.name,
                      arguments: tc.custom.input,
                    },
                  };
                }
              }),
            });
            
            for (const toolCall of message.tool_calls) {
              // Discriminate between function and custom tool calls
              let toolName: string;
              let args: Record<string, unknown>;
              const toolCallId = toolCall.id;
              
              if (toolCall.type === 'function') {
                toolName = toolCall.function.name;
                args = JSON.parse(toolCall.function.arguments);
              } else {
                // Custom tool call
                toolName = toolCall.custom.name;
                args = JSON.parse(toolCall.custom.input);
              }
              
              // Get tool index for UI display
              const toolIndex = toolNameToIndex.get(toolName) ?? -1;
              
              // 🔴 BROADCAST: Tool execution starting
              broadcastAgentToolStart(workflowId, nodeId, toolName, toolIndex, args);
              
              try {
                const result = await toolExecutors[toolName](args);
                
                state.toolCalls.push({
                  tool: toolName,
                  input: args,
                  output: result,
                  timestamp: Date.now(),
                });
                
                // 🔴 BROADCAST: Tool execution completed successfully
                broadcastAgentToolEnd(workflowId, nodeId, toolName, toolIndex, result);
                
                // Add tool result to messages with tool_call_id (required by OpenAI)
                state.messages.push({
                  role: "tool",
                  tool_call_id: toolCallId,
                  content: JSON.stringify(result),
                });
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                
                // 🔴 BROADCAST: Tool execution failed
                broadcastAgentToolEnd(workflowId, nodeId, toolName, toolIndex, null, errorMessage);
                
                state.messages.push({
                  role: "tool",
                  tool_call_id: toolCallId,
                  content: JSON.stringify({ error: errorMessage }),
                });
              }
            }
          } else if (message?.content) {
            // Final answer (no tool calls)
            state.output = message.content;
            state.step = "complete";
          }
        }

        // Log progress
        console.log(`[Agent] Iteration ${state.iterations} complete. Tool calls: ${state.toolCalls.length}, Step: ${state.step}`);

      } catch (error) {
        console.error(`[Agent] Error in iteration ${state.iterations}:`, error);
        state.error = error instanceof Error ? error.message : "Unknown error";
        state.step = "complete";
        
        // 🔴 BROADCAST: Agent encountered an error
        broadcastAgentError(workflowId, nodeId, state.error, state.iterations);
      }
    }

    // If we hit max iterations without completing, generate final response
    if (!state.output && !state.error) {
      state.output = `Agent reached maximum iterations (${maxIterations}). Last tool calls: ${
        state.toolCalls.slice(-3).map(tc => tc.tool).join(", ") || "none"
      }`;
    }
    
    console.log(`[Agent] Execution complete. Status: ${state.error ? "error" : "success"}, Iterations: ${state.iterations}`);

    // 🔴 BROADCAST: Agent completed
    const toolCallsSummary = state.toolCalls.map(tc => ({
      tool: tc.tool,
      success: !('error' in (tc.output as any || {})),
    }));
    broadcastAgentComplete(
      workflowId,
      nodeId,
      state.output || state.error || "No response",
      state.iterations,
      toolCallsSummary
    );

    // Return output (compatible with workflow engine)
    return {
      answer: state.output || state.error || "No response generated",
      output: state.output || state.error || "No response generated",
      toolCalls: state.toolCalls,
      iterations: state.iterations,
      status: state.error ? "error" : state.iterations >= maxIterations ? "max_iterations" : "completed",
      messages: state.messages,
    };
  }

  /**
   * Plan and Execute Agent
   * Like LangGraph's plan-and-execute pattern
   */
  private async executePlanAndExecute(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    // For now, delegate to ReAct with enhanced planning prompt
    const enhancedInput = {
      ...input,
      systemPrompt: `You are a planning AI assistant. Before taking actions:
1. First analyze the task and create a step-by-step plan
2. Execute each step using available tools
3. Verify results after each step
4. Provide a comprehensive final answer

${input.systemPrompt || ""}`,
    };
    return this.executeReActAgent(enhancedInput, context);
  }

  /**
   * Conversational Agent
   * Like LangGraph's conversational agent with memory
   */
  private async executeConversationalAgent(
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    // For now, delegate to ReAct with conversational prompt
    const enhancedInput = {
      ...input,
      systemPrompt: `You are a friendly conversational AI assistant. Engage naturally with the user while using tools when helpful. Remember context from the conversation.

${input.systemPrompt || ""}`,
    };
    return this.executeReActAgent(enhancedInput, context);
  }
}

// Export singleton
export const agentAdapter = new AgentAdapter();
