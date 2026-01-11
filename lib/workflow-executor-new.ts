/**
 * Workflow Executor
 * 
 * High-level workflow execution API that wraps the engine.
 * This is the main entry point for executing workflows.
 * 
 * @deprecated Direct API calls in node components should use the engine instead.
 * This file provides backward compatibility with the existing codebase.
 */

import {
  executeWorkflow as engineExecuteWorkflow,
  type WorkflowContent,
  type WorkflowExecutionResult,
  interpolateString,
  type ExecutionContext,
} from "./engine";

// Re-export types for backward compatibility
export type { WorkflowContent, WorkflowExecutionResult };

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

export type ExecutionResult = {
  success: boolean;
  output?: unknown;
  error?: string;
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

export type LegacyExecutionContext = {
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

/**
 * Legacy interpolation function for backward compatibility
 * 
 * @deprecated Use interpolateString from ./engine instead
 */
export function interpolateVariables(
  template: string,
  context: LegacyExecutionContext
): string {
  // Convert legacy context to engine context
  const engineContext: ExecutionContext = {
    workflowId: "legacy",
    executionId: "legacy",
    userId: "legacy",
    triggerInput: context.triggerInput,
    nodeOutputs: new Map(),
    variables: {},
    credentials: new Map(),
  };
  
  // Add previous output as most recent node output
  if (context.previousOutput) {
    engineContext.nodeOutputs.set("previous", {
      success: true,
      output: typeof context.previousOutput === "object" 
        ? context.previousOutput as Record<string, unknown>
        : { output: context.previousOutput },
      metadata: {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 0,
        retryCount: 0,
      },
    });
  }
  
  return interpolateString(template, engineContext);
}

/**
 * Execute a workflow
 * 
 * This is the main entry point for workflow execution.
 * It wraps the new engine and provides backward compatibility.
 */
export async function executeWorkflow(
  content: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
  triggerInput: Record<string, unknown>,
  options?: {
    userId?: string;
    workflowId?: string;
  }
): Promise<ExecutionResult> {
  const userId = options?.userId || "anonymous";
  const workflowId = options?.workflowId || "unknown";
  
  // Execute using the new engine
  const result = await engineExecuteWorkflow(
    userId,
    workflowId,
    content as WorkflowContent,
    triggerInput
  );
  
  // Convert to legacy format
  return {
    success: result.success,
    output: result.output,
    error: result.error?.message,
    executionLog: result.nodeResults.map(nr => ({
      nodeId: nr.nodeId,
      nodeType: nr.nodeType,
      status: nr.result.success ? "success" : "error",
      input: {}, // Engine doesn't expose input
      output: nr.result.output,
      error: nr.result.error?.message,
      timestamp: nr.result.metadata.startedAt,
    })),
  };
}

/**
 * Execute a workflow with full user context
 * 
 * Preferred method that properly handles credentials.
 */
export async function executeWorkflowWithContext(
  userId: string,
  workflowId: string,
  content: WorkflowContent,
  triggerInput: Record<string, unknown>
): Promise<WorkflowExecutionResult> {
  return engineExecuteWorkflow(userId, workflowId, content, triggerInput);
}


