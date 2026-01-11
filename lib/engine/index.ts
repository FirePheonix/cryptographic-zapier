/**
 * Engine Index
 * 
 * Main entry point for the automation engine.
 */

// Core types
export type {
  ProviderId,
  OperationId,
  GoogleOperation,
  OpenAIOperation,
  EmailOperation,
  WebhookOperation,
  TransformOperation,
  Credentials,
  OAuthCredentials,
  ApiKeyCredentials,
  ServiceAccountCredentials,
  StoredCredential,
  NodeSchema,
  NodeInputField,
  NodeOutputField,
  ExecutionContext,
  NodeExecutionInput,
  NodeExecutionResult,
  ExecutionError,
  WorkflowExecutionResult,
  ProviderAdapter,
  RateLimitConfig,
  RetryConfig,
} from "./types";

// Provider adapters
export {
  getProviderAdapter,
  getRegisteredProviders,
  isProviderRegistered,
  registerProvider,
  googleAdapter,
  openaiAdapter,
  emailAdapter,
  webhookAdapter,
  transformAdapter,
} from "./adapters";

// Credential management
export {
  CredentialManager,
  getCredentialManager,
  createOAuthCredentials,
  createApiKeyCredentials,
  createServiceAccountCredentials,
} from "./credentials";

// Variable interpolation
export {
  interpolateString,
  interpolateConfig,
  parseVariableReference,
  resolveVariable,
  extractVariables,
  validateVariables,
  hasVariables,
} from "./interpolation";

// Rate limiting and errors
export {
  isRateLimited,
  recordRequest,
  clearRateLimitState,
  isRetryableError,
  withRetry,
  createError,
  normalizeError,
  DEFAULT_RATE_LIMITS,
  DEFAULT_RETRY_CONFIG,
} from "./rate-limit";

// Workflow execution
export {
  WorkflowResolver,
  createWorkflowResolver,
  executeWorkflow,
  getNodeTypeMapping,
  registerNodeType,
} from "./resolver";

export type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowContent,
  NodeTypeMapping,
} from "./resolver";

// Database schema
export { credentials } from "./schema";


