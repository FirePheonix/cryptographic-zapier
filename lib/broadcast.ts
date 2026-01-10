/**
 * Event Broadcasting Utility
 * 
 * Sends real-time events to connected clients
 */

// In-memory store for broadcast functions (set by SSE route)
let broadcastFunction: ((workflowId: string, event: any) => void) | null = null;

export function setBroadcastFunction(fn: (workflowId: string, event: any) => void) {
  broadcastFunction = fn;
}

export function broadcastNodeOutput(
  workflowId: string,
  nodeId: string,
  output: any
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "node_output",
      nodeId,
      output,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Agent-Specific Events (for real-time UI updates)
// ============================================================================

/**
 * Broadcast that the agent has started processing
 */
export function broadcastAgentStart(
  workflowId: string,
  nodeId: string,
  input: string
) {
  console.log(`[Broadcast] agent_start - workflowId: ${workflowId}, nodeId: ${nodeId}, broadcastFunction: ${broadcastFunction ? 'SET' : 'NULL'}`);
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "agent_start",
      nodeId,
      input,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that the agent is "thinking" (calling the LLM for decision)
 */
export function broadcastAgentThinking(
  workflowId: string,
  nodeId: string,
  iteration: number
) {
  console.log(`[Broadcast] agent_thinking - workflowId: ${workflowId}, iteration: ${iteration}, broadcastFunction: ${broadcastFunction ? 'SET' : 'NULL'}`);
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "agent_thinking",
      nodeId,
      iteration,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that the agent is starting to call a tool
 */
export function broadcastAgentToolStart(
  workflowId: string,
  nodeId: string,
  toolName: string,
  toolIndex: number,
  toolInput: any
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "agent_tool_start",
      nodeId,
      toolName,
      toolIndex,
      toolInput,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that a tool has completed execution
 */
export function broadcastAgentToolEnd(
  workflowId: string,
  nodeId: string,
  toolName: string,
  toolIndex: number,
  toolOutput: any,
  error?: string
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "agent_tool_end",
      nodeId,
      toolName,
      toolIndex,
      toolOutput,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that the agent has finished with a final answer
 */
export function broadcastAgentComplete(
  workflowId: string,
  nodeId: string,
  answer: string,
  totalIterations: number,
  toolCallsSummary: Array<{ tool: string; success: boolean }>
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "agent_complete",
      nodeId,
      answer,
      totalIterations,
      toolCallsSummary,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that the agent encountered an error
 */
export function broadcastAgentError(
  workflowId: string,
  nodeId: string,
  error: string,
  iteration: number
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "agent_error",
      nodeId,
      error,
      iteration,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Other Workflow Events
// ============================================================================

export function broadcastWebhookReceived(
  workflowId: string,
  nodeId: string,
  transaction: any
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "webhook_received",
      nodeId,
      transaction,
      timestamp: new Date().toISOString(),
    });
  }
}

export function broadcastExecutionStarted(
  workflowId: string,
  executionId: string
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "execution_started",
      executionId,
      timestamp: new Date().toISOString(),
    });
  }
}

export function broadcastExecutionCompleted(
  workflowId: string,
  executionId: string,
  results: any[]
) {
  if (broadcastFunction) {
    broadcastFunction(workflowId, {
      type: "execution_completed",
      executionId,
      results,
      timestamp: new Date().toISOString(),
    });
  }
}


