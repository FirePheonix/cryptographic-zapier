/**
 * Node Schema Definitions
 * 
 * Declarative schemas for all node types. These define:
 * - UI structure (inputs, labels, types)
 * - Provider/operation mapping
 * - Output structure
 * 
 * NO EXECUTION LOGIC HERE - all execution happens in provider adapters.
 */

import type { NodeSchema } from "../engine/types";

// ============================================================================
// Trigger Nodes
// ============================================================================

export const triggerSchema: NodeSchema = {
  type: "trigger",
  provider: "webhook",
  operation: "trigger",
  name: "Webhook Trigger",
  description: "Starts the workflow when a webhook is received",
  icon: "Zap",
  color: "yellow",
  category: "trigger",
  inputs: [
    {
      key: "webhookPath",
      label: "Webhook Path",
      type: "string",
      required: false,
      placeholder: "/api/webhook/my-workflow",
      description: "Custom path for this webhook (auto-generated if empty)",
    },
  ],
  outputs: [
    { key: "body", label: "Request Body", type: "object" },
    { key: "headers", label: "Headers", type: "object" },
    { key: "query", label: "Query Parameters", type: "object" },
    { key: "triggeredAt", label: "Triggered At", type: "string" },
  ],
};

// ============================================================================
// CoinGate Nodes
// ============================================================================

export const coingateWebhookSchema: NodeSchema = {
  type: "coingateWebhook",
  provider: "coingate",
  operation: "payment.webhook",
  name: "CoinGate Payment",
  description: "Trigger workflow when crypto payment is received via CoinGate",
  icon: "/icons/coingate-logo.webp",
  color: "green",
  category: "trigger",
  inputs: [
    {
      key: "apiKey",
      label: "CoinGate API Key",
      type: "password",
      required: true,
      placeholder: "Your CoinGate API Key",
      description: "Get your API key from CoinGate dashboard",
    },
    {
      key: "orderId",
      label: "Order ID (Optional)",
      type: "string",
      required: false,
      placeholder: "order_123",
      description: "Custom order identifier",
      supportsVariables: true,
    },
    {
      key: "priceAmount",
      label: "Price Amount",
      type: "number",
      required: true,
      placeholder: "20",
      description: "Amount to charge",
      supportsVariables: true,
    },
    {
      key: "priceCurrency",
      label: "Price Currency",
      type: "select",
      required: true,
      default: "USD",
      options: [
        { value: "USD", label: "USD" },
        { value: "EUR", label: "EUR" },
        { value: "GBP", label: "GBP" },
        { value: "BTC", label: "BTC" },
        { value: "ETH", label: "ETH" },
      ],
    },
    {
      key: "receiveCurrency",
      label: "Receive Currency",
      type: "select",
      required: true,
      default: "BTC",
      options: [
        { value: "BTC", label: "Bitcoin (BTC)" },
        { value: "ETH", label: "Ethereum (ETH)" },
        { value: "USDT", label: "Tether (USDT)" },
        { value: "LTC", label: "Litecoin (LTC)" },
      ],
      description: "Cryptocurrency you want to receive",
    },
    {
      key: "successUrl",
      label: "Success URL",
      type: "string",
      required: false,
      placeholder: "https://your-app.com/success",
      description: "Redirect URL after successful payment",
      supportsVariables: true,
    },
    {
      key: "cancelUrl",
      label: "Cancel URL",
      type: "string",
      required: false,
      placeholder: "https://your-app.com/cancel",
      description: "Redirect URL if payment is cancelled",
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "id", label: "CoinGate Order ID", type: "string" },
    { key: "orderId", label: "Your Order ID", type: "string" },
    { key: "status", label: "Payment Status", type: "string" },
    { key: "priceAmount", label: "Price Amount", type: "number" },
    { key: "priceCurrency", label: "Price Currency", type: "string" },
    { key: "receiveAmount", label: "Receive Amount", type: "number" },
    { key: "receiveCurrency", label: "Receive Currency", type: "string" },
    { key: "paymentUrl", label: "Payment URL", type: "string" },
    { key: "paymentAddress", label: "Payment Address", type: "string" },
    { key: "token", label: "Payment Token", type: "string" },
  ],
};

// ============================================================================
// OpenAI Nodes
// ============================================================================

export const openaiChatSchema: NodeSchema = {
  type: "openai",
  provider: "openai",
  operation: "chat.completion",
  name: "OpenAI Chat",
  description: "Generate text using GPT models",
  icon: "BrainCircuit",
  color: "emerald",
  category: "action",
  inputs: [
    {
      key: "model",
      label: "Model",
      type: "select",
      required: true,
      default: "gpt-4o-mini",
      options: [
        { value: "gpt-4o", label: "GPT-4o (Most Capable)" },
        { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Cheap)" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
      ],
    },
    {
      key: "systemPrompt",
      label: "System Prompt",
      type: "textarea",
      required: false,
      placeholder: "You are a helpful assistant...",
      description: "Sets the behavior of the AI",
      supportsVariables: true,
    },
    {
      key: "prompt",
      label: "User Prompt",
      type: "textarea",
      required: true,
      placeholder: "Summarize this: {{previous.output}}",
      description: "The main instruction or question",
      supportsVariables: true,
    },
    {
      key: "maxTokens",
      label: "Max Tokens",
      type: "number",
      required: false,
      default: 1000,
      description: "Maximum length of the response",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      required: false,
      default: 0.7,
      description: "Creativity level (0-2). Lower = more deterministic",
    },
  ],
  outputs: [
    { key: "content", label: "Response Content", type: "string" },
    { key: "output", label: "Output (alias)", type: "string" },
    { key: "usage", label: "Token Usage", type: "object" },
    { key: "finishReason", label: "Finish Reason", type: "string" },
  ],
};

export const openaiImageSchema: NodeSchema = {
  type: "openaiImage",
  provider: "openai",
  operation: "images.generate",
  name: "OpenAI Image",
  description: "Generate images using DALL-E",
  icon: "Image",
  color: "purple",
  category: "action",
  inputs: [
    {
      key: "prompt",
      label: "Image Description",
      type: "textarea",
      required: true,
      placeholder: "A serene landscape with mountains at sunset",
      supportsVariables: true,
    },
    {
      key: "model",
      label: "Model",
      type: "select",
      required: false,
      default: "dall-e-3",
      options: [
        { value: "dall-e-3", label: "DALL-E 3 (Best Quality)" },
        { value: "dall-e-2", label: "DALL-E 2 (Faster)" },
      ],
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      required: false,
      default: "1024x1024",
      options: [
        { value: "1024x1024", label: "Square (1024x1024)" },
        { value: "1792x1024", label: "Landscape (1792x1024)" },
        { value: "1024x1792", label: "Portrait (1024x1792)" },
      ],
    },
    {
      key: "quality",
      label: "Quality",
      type: "select",
      required: false,
      default: "standard",
      options: [
        { value: "standard", label: "Standard" },
        { value: "hd", label: "HD (More Detail)" },
      ],
    },
  ],
  outputs: [
    { key: "url", label: "Image URL", type: "string" },
    { key: "revisedPrompt", label: "Revised Prompt", type: "string" },
  ],
};

// ============================================================================
// Gmail Nodes
// ============================================================================

export const gmailSendSchema: NodeSchema = {
  type: "gmail",
  provider: "google",
  operation: "gmail.send",
  name: "Gmail Send",
  description: "Send an email via Gmail API",
  icon: "Mail",
  color: "red",
  category: "action",
  inputs: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      placeholder: "recipient@example.com",
      description: "Recipient email address(es), comma-separated for multiple",
      supportsVariables: true,
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      placeholder: "Email subject",
      supportsVariables: true,
    },
    {
      key: "body",
      label: "Body (Plain Text)",
      type: "textarea",
      required: true,
      placeholder: "Email body...",
      supportsVariables: true,
    },
    {
      key: "html",
      label: "Body (HTML)",
      type: "textarea",
      required: false,
      placeholder: "<h1>Hello!</h1>",
      description: "Optional HTML version of the email",
      supportsVariables: true,
    },
    {
      key: "cc",
      label: "CC",
      type: "string",
      required: false,
      placeholder: "cc@example.com",
      supportsVariables: true,
    },
    {
      key: "bcc",
      label: "BCC",
      type: "string",
      required: false,
      placeholder: "bcc@example.com",
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "messageId", label: "Message ID", type: "string" },
    { key: "threadId", label: "Thread ID", type: "string" },
    { key: "success", label: "Success", type: "boolean" },
  ],
};

// ============================================================================
// Google Sheets Nodes
// ============================================================================

export const sheetsAppendSchema: NodeSchema = {
  type: "googleSheets",
  provider: "google",
  operation: "sheets.appendRow",
  name: "Sheets: Append Row",
  description: "Append a new row to a Google Sheet",
  icon: "Table",
  color: "green",
  category: "action",
  inputs: [
    {
      key: "spreadsheetId",
      label: "Spreadsheet ID",
      type: "string",
      required: true,
      placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      description: "Found in the spreadsheet URL after /d/",
      supportsVariables: true,
    },
    {
      key: "sheetName",
      label: "Sheet Name",
      type: "string",
      required: false,
      default: "Sheet1",
      placeholder: "Sheet1",
      supportsVariables: true,
    },
    {
      key: "values",
      label: "Row Values",
      type: "json",
      required: true,
      placeholder: '["{{trigger.name}}", "{{previous.output}}", "{{trigger.email}}"]',
      description: "JSON array of values to append as a new row",
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "updatedRange", label: "Updated Range", type: "string" },
    { key: "updatedRows", label: "Updated Rows", type: "number" },
    { key: "appendedRow", label: "Appended Row", type: "array" },
    { key: "success", label: "Success", type: "boolean" },
  ],
};

export const sheetsFindSchema: NodeSchema = {
  type: "sheetsFind",
  provider: "google",
  operation: "sheets.findRow",
  name: "Sheets: Find Row",
  description: "Find rows matching a value in a column",
  icon: "Search",
  color: "green",
  category: "action",
  inputs: [
    {
      key: "spreadsheetId",
      label: "Spreadsheet ID",
      type: "string",
      required: true,
      supportsVariables: true,
    },
    {
      key: "sheetName",
      label: "Sheet Name",
      type: "string",
      required: false,
      default: "Sheet1",
      supportsVariables: true,
    },
    {
      key: "column",
      label: "Search Column",
      type: "string",
      required: true,
      placeholder: "A",
      description: "Column letter to search (A, B, C, etc.)",
    },
    {
      key: "value",
      label: "Search Value",
      type: "string",
      required: true,
      supportsVariables: true,
    },
    {
      key: "matchType",
      label: "Match Type",
      type: "select",
      required: false,
      default: "exact",
      options: [
        { value: "exact", label: "Exact Match" },
        { value: "contains", label: "Contains" },
        { value: "startsWith", label: "Starts With" },
      ],
    },
  ],
  outputs: [
    { key: "found", label: "Found", type: "boolean" },
    { key: "count", label: "Match Count", type: "number" },
    { key: "rows", label: "Matched Rows", type: "array" },
    { key: "firstMatch", label: "First Match", type: "object" },
  ],
};

export const sheetsUpdateSchema: NodeSchema = {
  type: "sheetsUpdate",
  provider: "google",
  operation: "sheets.updateRow",
  name: "Sheets: Update Row",
  description: "Update a specific row in a Google Sheet",
  icon: "Edit",
  color: "green",
  category: "action",
  inputs: [
    {
      key: "spreadsheetId",
      label: "Spreadsheet ID",
      type: "string",
      required: true,
      supportsVariables: true,
    },
    {
      key: "range",
      label: "Range",
      type: "string",
      required: true,
      placeholder: "Sheet1!A2:D2",
      description: "The range to update (e.g., Sheet1!A2:D2)",
      supportsVariables: true,
    },
    {
      key: "values",
      label: "Values",
      type: "json",
      required: true,
      placeholder: '["value1", "value2", "value3"]',
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "updatedRange", label: "Updated Range", type: "string" },
    { key: "updatedRows", label: "Updated Rows", type: "number" },
    { key: "success", label: "Success", type: "boolean" },
  ],
};

// ============================================================================
// Email Node (Resend)
// ============================================================================

export const emailSendSchema: NodeSchema = {
  type: "email",
  provider: "email",
  operation: "send",
  name: "Send Email",
  description: "Send an email via Resend API",
  icon: "Mail",
  color: "blue",
  category: "action",
  inputs: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      placeholder: "recipient@example.com",
      supportsVariables: true,
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      placeholder: "Email subject",
      supportsVariables: true,
    },
    {
      key: "text",
      label: "Body (Plain Text)",
      type: "textarea",
      required: false,
      placeholder: "Plain text email body...",
      supportsVariables: true,
    },
    {
      key: "html",
      label: "Body (HTML)",
      type: "textarea",
      required: false,
      placeholder: "<h1>Hello!</h1>",
      supportsVariables: true,
    },
    {
      key: "from",
      label: "From",
      type: "string",
      required: false,
      placeholder: "noreply@yourdomain.com",
      description: "Sender email (uses default if empty)",
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "messageId", label: "Message ID", type: "string" },
    { key: "success", label: "Success", type: "boolean" },
  ],
};

// ============================================================================
// HTTP Request Node
// ============================================================================

export const httpRequestSchema: NodeSchema = {
  type: "httpRequest",
  provider: "webhook",
  operation: "request",
  name: "HTTP Request",
  description: "Make an HTTP request to any API",
  icon: "Globe",
  color: "slate",
  category: "action",
  inputs: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://api.example.com/endpoint",
      supportsVariables: true,
    },
    {
      key: "method",
      label: "Method",
      type: "select",
      required: false,
      default: "GET",
      options: [
        { value: "GET", label: "GET" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "PATCH", label: "PATCH" },
        { value: "DELETE", label: "DELETE" },
      ],
    },
    {
      key: "headers",
      label: "Headers",
      type: "json",
      required: false,
      placeholder: '{"Authorization": "Bearer {{env.API_KEY}}"}',
      supportsVariables: true,
    },
    {
      key: "body",
      label: "Body",
      type: "json",
      required: false,
      placeholder: '{"key": "value"}',
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "status", label: "Status Code", type: "number" },
    { key: "data", label: "Response Data", type: "object" },
    { key: "headers", label: "Response Headers", type: "object" },
    { key: "success", label: "Success", type: "boolean" },
  ],
};

// ============================================================================
// Transform Nodes
// ============================================================================

export const jsonParseSchema: NodeSchema = {
  type: "jsonParse",
  provider: "transform",
  operation: "json.parse",
  name: "Parse JSON",
  description: "Parse a JSON string into an object",
  icon: "Braces",
  color: "orange",
  category: "transform",
  inputs: [
    {
      key: "data",
      label: "JSON String",
      type: "textarea",
      required: true,
      placeholder: "{{previous.output}}",
      supportsVariables: true,
    },
    {
      key: "path",
      label: "Extract Path",
      type: "string",
      required: false,
      placeholder: "data.items[0].name",
      description: "Optional path to extract from the parsed JSON",
    },
  ],
  outputs: [
    { key: "data", label: "Parsed Data", type: "object" },
    { key: "output", label: "Output (alias)", type: "object" },
  ],
};

export const templateSchema: NodeSchema = {
  type: "template",
  provider: "transform",
  operation: "text.template",
  name: "Text Template",
  description: "Create text from a template with variable substitution",
  icon: "FileText",
  color: "orange",
  category: "transform",
  inputs: [
    {
      key: "template",
      label: "Template",
      type: "textarea",
      required: true,
      placeholder: "Hello {{trigger.name}}, your order #{{previous.orderId}} is ready!",
      supportsVariables: true,
    },
    {
      key: "variables",
      label: "Additional Variables",
      type: "json",
      required: false,
      placeholder: '{"customVar": "value"}',
    },
  ],
  outputs: [
    { key: "data", label: "Result", type: "string" },
    { key: "output", label: "Output (alias)", type: "string" },
  ],
};

export const filterSchema: NodeSchema = {
  type: "filter",
  provider: "transform",
  operation: "array.filter",
  name: "Filter Array",
  description: "Filter an array based on a condition",
  icon: "Filter",
  color: "orange",
  category: "transform",
  inputs: [
    {
      key: "array",
      label: "Array",
      type: "json",
      required: true,
      placeholder: "{{previous.output}}",
      supportsVariables: true,
    },
    {
      key: "field",
      label: "Field to Check",
      type: "string",
      required: true,
      placeholder: "status",
    },
    {
      key: "operator",
      label: "Operator",
      type: "select",
      required: true,
      default: "equals",
      options: [
        { value: "equals", label: "Equals" },
        { value: "notEquals", label: "Not Equals" },
        { value: "contains", label: "Contains" },
        { value: "gt", label: "Greater Than" },
        { value: "lt", label: "Less Than" },
        { value: "exists", label: "Exists" },
      ],
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      required: false,
      supportsVariables: true,
    },
  ],
  outputs: [
    { key: "data", label: "Filtered Array", type: "array" },
    { key: "count", label: "Result Count", type: "number" },
    { key: "output", label: "Output (alias)", type: "array" },
  ],
};

// ============================================================================
// Combined Schemas with Operations
// ============================================================================

/**
 * Gmail combined schema with all operations
 */
export const gmailSchema: NodeSchema = {
  type: "gmail",
  provider: "google",
  operation: "gmail.send",
  name: "Gmail",
  description: "Send and manage emails with Gmail",
  icon: "Mail",
  color: "red",
  category: "action",
  inputs: gmailSendSchema.inputs,
  outputs: gmailSendSchema.outputs,
  operations: [
    { id: "gmail.send", label: "Send Email", description: "Send a new email" },
    { id: "gmail.createDraft", label: "Create Draft", description: "Create a draft email" },
    { id: "gmail.read", label: "Read Email", description: "Read a specific email by ID" },
    { id: "gmail.search", label: "Search Emails", description: "Search emails with a query" },
    { id: "gmail.watchInbox", label: "Watch Inbox", description: "Trigger on new emails" },
  ],
};

/**
 * Google Sheets combined schema with all operations
 */
export const googleSheetsSchema: NodeSchema = {
  type: "googleSheets",
  provider: "google",
  operation: "sheets.appendRow",
  name: "Google Sheets",
  description: "Read and write data in Google Sheets",
  icon: "Table",
  color: "green",
  category: "action",
  inputs: sheetsAppendSchema.inputs,
  outputs: sheetsAppendSchema.outputs,
  operations: [
    { id: "sheets.appendRow", label: "Append Row", description: "Add a new row to a sheet" },
    { id: "sheets.getRows", label: "Get Rows", description: "Read rows from a sheet" },
    { id: "sheets.findRow", label: "Find Row", description: "Find a row by column value" },
    { id: "sheets.updateRow", label: "Update Row", description: "Update a row by column value" },
    { id: "sheets.deleteRow", label: "Delete Row", description: "Delete a row by column value" },
  ],
};

/**
 * Transform combined schema with all operations
 */
export const transformSchema: NodeSchema = {
  type: "transform",
  provider: "transform",
  operation: "transform.jsonParse",
  name: "Transform",
  description: "Transform and manipulate data",
  icon: "Wrench",
  color: "purple",
  category: "utility",
  inputs: jsonParseSchema.inputs,
  outputs: jsonParseSchema.outputs,
  operations: [
    { id: "transform.jsonParse", label: "Parse JSON", description: "Parse a JSON string into an object" },
    { id: "transform.jsonStringify", label: "Stringify JSON", description: "Convert an object to JSON string" },
    { id: "transform.textTemplate", label: "Text Template", description: "Create text with variable substitution" },
    { id: "transform.arrayFilter", label: "Filter Array", description: "Filter array items by condition" },
    { id: "transform.arrayMap", label: "Map Array", description: "Extract values from array items" },
  ],
};

// ============================================================================
// Flow Control Nodes (Make.com-style)
// ============================================================================

/**
 * Iterator Schema - Splits array into individual items (1 → N)
 */
export const flowIteratorSchema: NodeSchema = {
  type: "flowIterator",
  provider: "flow",
  operation: "flow.iterate",
  name: "Iterator",
  description: "Split an array into individual items for processing",
  icon: "SplitSquareHorizontal",
  color: "cyan",
  category: "utility",
  inputs: [
    {
      key: "arrayPath",
      label: "Array Path",
      type: "string",
      required: true,
      placeholder: "{{previous.items}} or data.results",
      description: "Path to the array to iterate over",
    },
    {
      key: "itemVariable",
      label: "Item Variable Name",
      type: "string",
      required: false,
      placeholder: "item",
      description: "Variable name for current item (default: item)",
    },
    {
      key: "indexVariable",
      label: "Index Variable Name",
      type: "string",
      required: false,
      placeholder: "index",
      description: "Variable name for current index (default: index)",
    },
  ],
  outputs: [
    { key: "item", label: "Current Item", type: "any" },
    { key: "index", label: "Current Index", type: "number" },
    { key: "totalItems", label: "Total Items", type: "number" },
  ],
};

/**
 * Aggregator Schema - Combines multiple items into one (N → 1)
 */
export const flowAggregatorSchema: NodeSchema = {
  type: "flowAggregator",
  provider: "flow",
  operation: "flow.aggregate",
  name: "Aggregator",
  description: "Combine multiple items into a single output",
  icon: "Combine",
  color: "cyan",
  category: "utility",
  inputs: [
    {
      key: "aggregationMode",
      label: "Aggregation Mode",
      type: "select",
      required: true,
      options: [
        { value: "array", label: "Collect to Array" },
        { value: "first", label: "First Item Only" },
        { value: "last", label: "Last Item Only" },
        { value: "concat", label: "Concatenate (Text)" },
        { value: "sum", label: "Sum (Numbers)" },
        { value: "count", label: "Count Items" },
        { value: "custom", label: "Custom Expression" },
      ],
      description: "How to combine the items",
    },
    {
      key: "targetField",
      label: "Target Field",
      type: "string",
      required: false,
      placeholder: "value or items[0].name",
      description: "Extract specific field from each item before aggregating",
    },
    {
      key: "groupByField",
      label: "Group By Field",
      type: "string",
      required: false,
      placeholder: "category or status",
      description: "Group items by this field before aggregating",
    },
    {
      key: "maxItems",
      label: "Max Items",
      type: "number",
      required: false,
      placeholder: "100",
      description: "Maximum items to aggregate (stops early if reached)",
    },
    {
      key: "customExpression",
      label: "Custom Expression",
      type: "string",
      required: false,
      placeholder: "items.reduce((a, b) => a + b, 0)",
      description: "JavaScript expression (items available in scope)",
    },
  ],
  outputs: [
    { key: "data", label: "Aggregated Result", type: "any" },
    { key: "count", label: "Items Processed", type: "number" },
  ],
};

/**
 * Router Schema - Conditional branching
 */
export const flowRouterSchema: NodeSchema = {
  type: "flowRouter",
  provider: "flow",
  operation: "flow.route",
  name: "Router",
  description: "Route data to different paths based on conditions",
  icon: "GitBranch",
  color: "cyan",
  category: "utility",
  inputs: [
    {
      key: "conditions",
      label: "Routing Conditions",
      type: "array",
      required: true,
      description: "Define conditions and target paths",
    },
    {
      key: "defaultPath",
      label: "Default Path",
      type: "string",
      required: false,
      placeholder: "default",
      description: "Path to use when no conditions match",
    },
  ],
  outputs: [
    { key: "data", label: "Routed Data", type: "any" },
    { key: "matchedPaths", label: "Matched Paths", type: "array" },
  ],
};

/**
 * Filter Schema - Allow/block based on conditions
 */
export const flowFilterSchema: NodeSchema = {
  type: "flowFilter",
  provider: "flow",
  operation: "flow.filter",
  name: "Filter",
  description: "Allow or block execution based on conditions",
  icon: "Filter",
  color: "cyan",
  category: "utility",
  inputs: [
    {
      key: "filterField",
      label: "Field to Check",
      type: "string",
      required: true,
      placeholder: "{{previous.status}} or data.value",
      description: "Field or value to evaluate",
    },
    {
      key: "filterOperator",
      label: "Operator",
      type: "select",
      required: true,
      options: [
        { value: "equals", label: "Equals" },
        { value: "notEquals", label: "Not Equals" },
        { value: "contains", label: "Contains" },
        { value: "notContains", label: "Does Not Contain" },
        { value: "startsWith", label: "Starts With" },
        { value: "endsWith", label: "Ends With" },
        { value: "gt", label: "Greater Than" },
        { value: "gte", label: "Greater Than or Equal" },
        { value: "lt", label: "Less Than" },
        { value: "lte", label: "Less Than or Equal" },
        { value: "exists", label: "Exists (not null)" },
        { value: "notExists", label: "Does Not Exist" },
        { value: "isEmpty", label: "Is Empty" },
        { value: "isNotEmpty", label: "Is Not Empty" },
        { value: "regex", label: "Matches Regex" },
      ],
      description: "Comparison operator",
    },
    {
      key: "filterValue",
      label: "Compare Value",
      type: "string",
      required: false,
      placeholder: "active or {{trigger.threshold}}",
      description: "Value to compare against (not needed for exists/isEmpty)",
    },
    {
      key: "passThrough",
      label: "Pass Through Data",
      type: "boolean",
      required: false,
      description: "Pass original data through (default: true)",
    },
  ],
  outputs: [
    { key: "data", label: "Filtered Data", type: "any" },
    { key: "passed", label: "Filter Passed", type: "boolean" },
  ],
};

/**
 * Flow combined schema with all operations (unified node)
 */
export const flowSchema: NodeSchema = {
  type: "flow",
  provider: "flow",
  operation: "flow.iterate",
  name: "Flow Control",
  description: "Control workflow execution with iteration, aggregation, routing, and filtering",
  icon: "GitBranch",
  color: "cyan",
  category: "utility",
  inputs: flowIteratorSchema.inputs,
  outputs: flowIteratorSchema.outputs,
  operations: [
    { id: "flow.iterate", label: "Iterator", description: "Split array into individual items (1 → N)" },
    { id: "flow.aggregate", label: "Aggregator", description: "Combine items into single output (N → 1)" },
    { id: "flow.route", label: "Router", description: "Route to different paths based on conditions" },
    { id: "flow.filter", label: "Filter", description: "Allow or block execution based on conditions" },
  ],
};

// ============================================================================
// x402 Payment Protocol Nodes (Cronos)
// ============================================================================

export const x402GateSchema: NodeSchema = {
  type: "x402Gate",
  provider: "cronos",
  operation: "x402.gate",
  name: "402 Payment Gate",
  description: "Verifies payment proof before allowing workflow execution (x402 protocol)",
  icon: "ShieldCheck",
  color: "amber",
  category: "action",
  inputs: [
    {
      key: "requiredAmount",
      label: "Required Amount",
      type: "string",
      required: true,
      placeholder: "10.0",
      description: "Amount in CRO or token units",
      supportsVariables: true,
    },
    {
      key: "recipientAddress",
      label: "Recipient Address (Cronos)",
      type: "string",
      required: true,
      placeholder: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      description: "Your Cronos wallet address to receive payments",
    },
    {
      key: "tokenContract",
      label: "Token Contract (Optional)",
      type: "string",
      required: false,
      placeholder: "0x... (leave empty for native CRO)",
      description: "ERC20 token address. Leave empty to accept native CRO",
    },
    {
      key: "replayWindowSeconds",
      label: "Replay Protection (seconds)",
      type: "number",
      required: false,
      default: 300,
      description: "Payment proof expires after this time to prevent replay attacks",
    },
    {
      key: "allowOverpayment",
      label: "Allow Overpayment",
      type: "boolean",
      required: false,
      default: true,
      description: "Accept payments greater than required amount",
    },
    {
      key: "customMessage",
      label: "Custom 402 Message",
      type: "string",
      required: false,
      placeholder: "Payment required to access this resource",
      description: "Message displayed when payment is required",
    },
  ],
  outputs: [
    { key: "txHash", label: "Transaction Hash", type: "string" },
    { key: "payer", label: "Payer Address", type: "string" },
    { key: "amount", label: "Amount Paid", type: "string" },
    { key: "timestamp", label: "Payment Timestamp", type: "number" },
    { key: "verified", label: "Verification Status", type: "boolean" },
  ],
};

export const cronosPaymentSchema: NodeSchema = {
  type: "cronosPayment",
  provider: "cronos",
  operation: "cronos.send",
  name: "Cronos Payment",
  description: "Send a payment transaction on Cronos blockchain",
  icon: "Send",
  color: "emerald",
  category: "action",
  inputs: [
    {
      key: "toAddress",
      label: "Recipient Address",
      type: "string",
      required: true,
      placeholder: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      description: "Cronos address to receive payment",
      supportsVariables: true,
    },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      required: true,
      placeholder: "10.5",
      description: "Amount to send in CRO or token units",
      supportsVariables: true,
    },
    {
      key: "tokenContract",
      label: "Token Contract (Optional)",
      type: "string",
      required: false,
      placeholder: "0x... (leave empty for native CRO)",
      description: "ERC20 token contract address",
    },
    {
      key: "waitForConfirmations",
      label: "Wait for Confirmations",
      type: "select",
      required: false,
      default: 1,
      options: [
        { value: 0, label: "0 (immediate)" },
        { value: 1, label: "1 confirmation (recommended)" },
        { value: 3, label: "3 confirmations" },
        { value: 6, label: "6 confirmations (safe)" },
        { value: 12, label: "12 confirmations (very safe)" },
      ],
    },
    {
      key: "gasLimit",
      label: "Gas Limit (Optional)",
      type: "string",
      required: false,
      placeholder: "21000",
      description: "Leave empty for automatic gas estimation",
    },
    {
      key: "autoRetry",
      label: "Auto Retry on Failure",
      type: "boolean",
      required: false,
      default: false,
      description: "Automatically retry if transaction fails",
    },
    {
      key: "maxRetries",
      label: "Max Retry Attempts",
      type: "number",
      required: false,
      default: 3,
      description: "Maximum number of retry attempts",
    },
    {
      key: "memo",
      label: "Transaction Memo (Optional)",
      type: "string",
      required: false,
      placeholder: "Payment for invoice #1234",
      description: "Optional note attached to transaction",
    },
  ],
  outputs: [
    { key: "txHash", label: "Transaction Hash", type: "string" },
    { key: "blockNumber", label: "Block Number", type: "number" },
    { key: "gasUsed", label: "Gas Used", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "timestamp", label: "Confirmation Time", type: "number" },
  ],
};

export const httpResponseSchema: NodeSchema = {
  type: "httpResponse",
  provider: "http",
  operation: "http.response",
  name: "HTTP Response",
  description: "Return custom HTTP responses with specific status codes (essential for x402)",
  icon: "MailCheck",
  color: "purple",
  category: "action",
  inputs: [
    {
      key: "statusCode",
      label: "Status Code",
      type: "select",
      required: false,
      default: 200,
      options: [
        { value: 200, label: "200 OK" },
        { value: 201, label: "201 Created" },
        { value: 202, label: "202 Accepted" },
        { value: 400, label: "400 Bad Request" },
        { value: 401, label: "401 Unauthorized" },
        { value: 402, label: "402 Payment Required" },
        { value: 403, label: "403 Forbidden" },
        { value: 404, label: "404 Not Found" },
        { value: 429, label: "429 Too Many Requests" },
        { value: 500, label: "500 Internal Server Error" },
        { value: 503, label: "503 Service Unavailable" },
      ],
    },
    {
      key: "contentType",
      label: "Content Type",
      type: "select",
      required: false,
      default: "application/json",
      options: [
        { value: "application/json", label: "JSON" },
        { value: "text/plain", label: "Plain Text" },
        { value: "text/html", label: "HTML" },
        { value: "application/xml", label: "XML" },
      ],
    },
    {
      key: "body",
      label: "Response Body",
      type: "textarea",
      required: false,
      placeholder: '{"success": true, "message": "Operation completed"}',
      description: "Response body. Supports variable interpolation",
      supportsVariables: true,
    },
    {
      key: "headers",
      label: "Custom Headers (JSON)",
      type: "textarea",
      required: false,
      placeholder: '{"X-Payment-Address": "0x..."}',
      description: "Optional custom headers as JSON object",
    },
  ],
  outputs: [
    { key: "sent", label: "Response Sent", type: "boolean" },
    { key: "statusCode", label: "Status Code", type: "number" },
  ],
};

export const blockchainAuditSchema: NodeSchema = {
  type: "blockchainAudit",
  provider: "cronos",
  operation: "cronos.audit",
  name: "Blockchain Audit",
  description: "Create immutable audit trail on Cronos blockchain",
  icon: "Shield",
  color: "indigo",
  category: "action",
  inputs: [
    {
      key: "dataToHash",
      label: "Additional Fields to Hash",
      type: "textarea",
      required: false,
      placeholder: "previous.output, trigger.userId, gate.amount",
      description: "Comma-separated field paths to include in audit hash",
      supportsVariables: true,
    },
    {
      key: "customMetadata",
      label: "Custom Metadata (JSON)",
      type: "textarea",
      required: false,
      placeholder: '{"department": "finance"}',
      description: "Optional metadata stored with audit record",
    },
    {
      key: "storageContract",
      label: "Audit Contract (Optional)",
      type: "string",
      required: false,
      placeholder: "0x... (leave empty for default)",
      description: "Custom audit storage contract address",
    },
    {
      key: "includeTimestamp",
      label: "Include Timestamp",
      type: "boolean",
      required: false,
      default: true,
    },
    {
      key: "includeWorkflowId",
      label: "Include Workflow ID",
      type: "boolean",
      required: false,
      default: true,
    },
    {
      key: "includeExecutionId",
      label: "Include Execution ID",
      type: "boolean",
      required: false,
      default: true,
    },
    {
      key: "includePaymentProof",
      label: "Include Payment Proof",
      type: "boolean",
      required: false,
      default: true,
    },
    {
      key: "attachToResponse",
      label: "Attach to Response",
      type: "boolean",
      required: false,
      default: true,
      description: "Include audit hash in workflow response",
    },
  ],
  outputs: [
    { key: "auditHash", label: "Audit Hash", type: "string" },
    { key: "auditTxHash", label: "Blockchain Transaction Hash", type: "string" },
    { key: "blockNumber", label: "Block Number", type: "number" },
    { key: "timestamp", label: "Timestamp", type: "number" },
    { key: "verifyUrl", label: "Cronoscan Verification URL", type: "string" },
  ],
};

// ============================================================================
// AI Agent Node
// ============================================================================

export const aiAgentSchema: NodeSchema = {
  type: "aiAgent",
  provider: "agent",
  operation: "agent.tools",
  name: "AI Agent",
  description: "Orchestrates LLM with tools to handle complex tasks",
  icon: "Bot",
  color: "purple",
  category: "action",
  inputs: [
    {
      key: "systemPrompt",
      label: "System Prompt (Agent Instructions)",
      type: "textarea",
      required: true,
      default: "You are a helpful AI assistant.\nUse tools when needed to fetch data.\nNever hallucinate information.",
      placeholder: "You are a helpful AI assistant...",
      description: "Instructions for the agent's behavior",
      supportsVariables: true,
    },
    {
      key: "maxIterations",
      label: "Max Iterations",
      type: "number",
      required: false,
      default: 10,
      description: "Maximum number of tool calls before stopping (1-20)",
    },
    {
      key: "chatModel",
      label: "Chat Model",
      type: "connection",
      required: true,
      connectionType: "chatModel",
      description: "Connect an LLM model (OpenAI, Anthropic, etc.)",
    },
    {
      key: "memory",
      label: "Memory",
      type: "connection",
      required: false,
      connectionType: "memory",
      description: "Optional memory for conversation context",
    },
    {
      key: "tools",
      label: "Tools",
      type: "connectionArray",
      required: false,
      connectionType: "tool",
      description: "Connect tool nodes (Database, HTTP, Email, etc.)",
    },
  ],
  outputs: [
    { key: "answer", label: "Final Answer", type: "string" },
    { key: "output", label: "Output (alias)", type: "string" },
    { key: "toolCalls", label: "Tool Calls Made", type: "array" },
    { key: "iterations", label: "Iterations Used", type: "number" },
    { key: "status", label: "Completion Status", type: "string" },
  ],
};

// ============================================================================
// Schema Registry
// ============================================================================

export const nodeSchemas: Record<string, NodeSchema> = {
  trigger: triggerSchema,
  coingateWebhook: coingateWebhookSchema,
  coingate: coingateWebhookSchema,
  openai: openaiChatSchema,
  openaiChat: openaiChatSchema,
  openaiImage: openaiImageSchema,
  aiAgent: aiAgentSchema,
  gmail: gmailSendSchema,
  gmailSend: gmailSendSchema,
  googleSheets: sheetsAppendSchema,
  sheetsAppend: sheetsAppendSchema,
  sheetsFind: sheetsFindSchema,
  sheetsUpdate: sheetsUpdateSchema,
  email: emailSendSchema,
  emailSend: emailSendSchema,
  httpRequest: httpRequestSchema,
  jsonParse: jsonParseSchema,
  template: templateSchema,
  filter: filterSchema,
  // Flow control nodes
  flow: flowSchema,
  flowIterator: flowIteratorSchema,
  flowAggregator: flowAggregatorSchema,
  flowRouter: flowRouterSchema,
  flowFilter: flowFilterSchema,
  // x402 Payment Protocol Nodes (Cronos)
  x402Gate: x402GateSchema,
  cronosPayment: cronosPaymentSchema,
  httpResponse: httpResponseSchema,
  blockchainAudit: blockchainAuditSchema,
};

/**
 * Get schema for a node type
 */
export function getNodeSchema(nodeType: string): NodeSchema | undefined {
  return nodeSchemas[nodeType];
}

/**
 * Get all available node schemas
 */
export function getAllNodeSchemas(): NodeSchema[] {
  return Object.values(nodeSchemas);
}

/**
 * Get schemas by category
 */
export function getNodeSchemasByCategory(category: NodeSchema["category"]): NodeSchema[] {
  return Object.values(nodeSchemas).filter(schema => schema.category === category);
}


