/**
 * Core Engine Types for Zynthex - AI Automation for Crypto Payments
 * 
 * This file defines the foundational types for the operation-based execution engine.
 * All node types are declarative schemas - execution logic lives in provider adapters.
 */

// ============================================================================
// Provider & Operation Types
// ============================================================================

/**
 * Supported providers in the platform
 */
export type ProviderId = 
  | "google"
  | "openai"
  | "anthropic"
  | "email"
  | "webhook"
  | "transform"
  | "flow"
  | "alchemy"
  | "postgres"
  | "coingate"
  | "agent";

/**
 * Operations available per provider
 */
export type GoogleOperation = 
  | "gmail.send"
  | "gmail.read"
  | "gmail.list"
  | "sheets.appendRow"
  | "sheets.updateRow"
  | "sheets.findRow"
  | "sheets.getRows"
  | "sheets.deleteRow";

export type OpenAIOperation =
  | "chat.completion"
  | "chat.stream"
  | "embeddings.create"
  | "images.generate";

export type EmailOperation =
  | "send"
  | "sendTemplate";

export type WebhookOperation =
  | "trigger"
  | "request";

export type TransformOperation =
  | "json.parse"
  | "json.stringify"
  | "text.template"
  | "array.filter"
  | "array.map"
  | "transform.jsonParse"
  | "transform.jsonStringify"
  | "transform.textTemplate"
  | "transform.arrayFilter"
  | "transform.arrayMap";

export type FlowOperation =
  | "flow.iterate"
  | "flow.endIterate"
  | "flow.aggregate"
  | "flow.route"
  | "flow.filter";

export type AlchemyOperation =
  | "alchemy.watchAddress"
  | "alchemy.getTransactions";

export type PostgresOperation =
  | "postgres.listTables"
  | "postgres.getRows"
  | "postgres.query"
  | "postgres.insert"
  | "postgres.update"
  | "postgres.delete";

export type AgentOperation =
  | "agent.tools"
  | "agent.planAndExecute"
  | "agent.conversational";

export type OperationId = 
  | GoogleOperation 
  | OpenAIOperation 
  | EmailOperation 
  | WebhookOperation
  | TransformOperation
  | AlchemyOperation
  | FlowOperation
  | PostgresOperation
  | AgentOperation;

// ============================================================================
// Credential Types
// ============================================================================

/**
 * OAuth credentials with automatic refresh support
 */
export type OAuthCredentials = {
  type: "oauth2";
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  tokenType: string;
  scope: string[];
};

/**
 * API Key credentials
 */
export type ApiKeyCredentials = {
  type: "api_key";
  apiKey: string;
};

/**
 * Service Account credentials (for Google)
 */
export type ServiceAccountCredentials = {
  type: "service_account";
  clientEmail: string;
  privateKey: string;
  projectId: string;
};

/**
 * Union of all credential types
 */
export type Credentials = 
  | OAuthCredentials 
  | ApiKeyCredentials 
  | ServiceAccountCredentials;

/**
 * Stored credential record
 */
export type StoredCredential = {
  id: string;
  userId: string;
  provider: ProviderId;
  name: string;
  credentials: Credentials;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// Node Schema Types (Declarative - UI Only)
// ============================================================================

/**
 * Input field definition for node schema
 */
export type NodeInputField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "json" | "select" | "textarea" | "password";
  required: boolean;
  default?: unknown;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>; // For select type
  supportsVariables?: boolean; // Whether {{variables}} are supported
};

/**
 * Output field definition for node schema
 */
export type NodeOutputField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
};

/**
 * Operation definition for multi-operation nodes
 */
export type NodeOperation = {
  id: string;
  label: string;
  description?: string;
};

/**
 * Declarative node schema - defines UI and operation mapping
 * No execution logic here - just structure
 */
export type NodeSchema = {
  type: string;
  provider: ProviderId;
  operation: OperationId;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: NodeInputField[];
  outputs: NodeOutputField[];
  category: "trigger" | "action" | "transform" | "output" | "utility";
  operations?: NodeOperation[]; // For nodes with multiple operations
};

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Execution context passed through the workflow
 */
export type ExecutionContext = {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerInput: Record<string, unknown>;
  nodeOutputs: Map<string, NodeExecutionResult>;
  variables: Record<string, unknown>;
  credentials: Map<ProviderId, Credentials>;
};

/**
 * Input for a single node execution
 */
export type NodeExecutionInput = {
  nodeId: string;
  nodeType: string;
  provider: ProviderId;
  operation: OperationId;
  config: Record<string, unknown>;
  context: ExecutionContext;
};

/**
 * Result of a single node execution
 */
export type NodeExecutionResult = {
  success: boolean;
  output: Record<string, unknown>;
  error?: ExecutionError;
  metadata: {
    startedAt: string;
    completedAt: string;
    duration: number;
    retryCount: number;
  };
};

/**
 * Normalized error structure
 */
export type ExecutionError = {
  code: string;
  message: string;
  provider?: ProviderId;
  operation?: OperationId;
  retryable: boolean;
  details?: Record<string, unknown>;
};

/**
 * Full workflow execution result
 */
export type WorkflowExecutionResult = {
  success: boolean;
  executionId: string;
  workflowId: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  output?: Record<string, unknown>;
  error?: ExecutionError;
  nodeResults: Array<{
    nodeId: string;
    nodeType: string;
    result: NodeExecutionResult;
  }>;
};

// ============================================================================
// Provider Adapter Interface
// ============================================================================

/**
 * Provider adapter interface - all providers must implement this
 */
export interface ProviderAdapter {
  readonly providerId: ProviderId;
  readonly supportedOperations: OperationId[];
  
  /**
   * Execute an operation
   */
  execute(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
  
  /**
   * Refresh OAuth credentials if expired
   */
  refreshCredentials?(credentials: OAuthCredentials): Promise<OAuthCredentials>;
  
  /**
   * Validate credentials are still valid
   */
  validateCredentials?(credentials: Credentials): Promise<boolean>;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
};

export type RateLimitState = {
  provider: ProviderId;
  operation: OperationId;
  requests: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil?: number;
};

// ============================================================================
// Retry Types
// ============================================================================

export type RetryConfig = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
};

// ============================================================================
// Variable Interpolation Types
// ============================================================================

/**
 * Variable reference pattern: {{source.path.to.value}}
 * Sources: trigger, previous, nodes.{nodeId}, env, flow (iterator context), input (alias for nodeOutputs)
 */
export type VariableSource = "trigger" | "previous" | "nodes" | "env" | "flow" | "input";

export type VariableReference = {
  source: VariableSource;
  path: string[];
  nodeId?: string; // For nodes.{nodeId} references
};


