/**
 * Node Outputs Context
 * 
 * IN-MEMORY ONLY execution state for workflow nodes.
 * 
 * This is NOT persisted anywhere:
 * - Lives only while browser tab is open
 * - Destroyed on tab close/refresh
 * - This is execution state, not cache
 * 
 * Like n8n's executionData.resultData.runData
 */

"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type NodeOutput = {
  nodeId: string;
  nodeType: string;
  timestamp: string;
  output: unknown;
  // Optional metadata
  duration?: number;
  error?: string;
};

type ExecutionStatus = "idle" | "waiting" | "running" | "completed" | "error";

// Node execution visual state
type NodeExecutionState = "idle" | "waiting" | "running" | "completed" | "error";

// Agent-specific execution state (for showing tool loading)
type AgentExecutionState = {
  nodeId: string;
  step: "idle" | "thinking" | "tool_calling" | "complete" | "error";
  activeToolIndex: number | null;  // Index of the tool currently being called
  activeToolName: string | null;   // Name of the tool currently being called
  iteration: number;
};

type NodeOutputsContextType = {
  // Node output management
  outputs: Map<string, NodeOutput>;
  setOutput: (nodeId: string, nodeType: string, output: unknown, error?: string) => void;
  addOutput: (nodeId: string, nodeType: string, output: unknown, error?: string) => void;
  getOutput: (nodeId: string) => NodeOutput | undefined;
  clearOutput: (nodeId: string) => void;
  clearAllOutputs: () => void;
  
  // Execution status
  executionStatus: ExecutionStatus;
  setExecutionStatus: (status: ExecutionStatus) => void;
  
  // Currently executing node (for animation)
  currentExecutingNodeId: string | null;
  setCurrentExecutingNodeId: (nodeId: string | null) => void;
  
  // Individual node execution states (for visual indicators)
  nodeExecutionStates: Map<string, NodeExecutionState>;
  setNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  clearNodeExecutionStates: () => void;
  
  // Agent execution state (for tool sub-node loading indicators)
  agentExecutionStates: Map<string, AgentExecutionState>;
  setAgentExecutionState: (nodeId: string, state: Partial<AgentExecutionState>) => void;
  getAgentExecutionState: (nodeId: string) => AgentExecutionState | undefined;
  clearAgentExecutionStates: () => void;
  
  // Pending webhook data (in-memory only)
  webhookData: Record<string, unknown> | null;
  setWebhookData: (data: Record<string, unknown> | null) => void;
};

const NodeOutputsContext = createContext<NodeOutputsContextType | undefined>(undefined);

export const NodeOutputsProvider = ({ children }: { children: ReactNode }) => {
  // All state is in-memory - vanishes when tab closes
  const [outputs, setOutputs] = useState<Map<string, NodeOutput>>(new Map());
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>("idle");
  const [webhookData, setWebhookData] = useState<Record<string, unknown> | null>(null);
  const [currentExecutingNodeId, setCurrentExecutingNodeId] = useState<string | null>(null);
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Map<string, NodeExecutionState>>(new Map());
  const [agentExecutionStates, setAgentExecutionStates] = useState<Map<string, AgentExecutionState>>(new Map());

  const setOutput = useCallback((nodeId: string, nodeType: string, output: unknown, error?: string) => {
    setOutputs(prev => {
      const next = new Map(prev);
      next.set(nodeId, {
        nodeId,
        nodeType,
        timestamp: new Date().toISOString(),
        output,
        error,
      });
      return next;
    });
  }, []);

  // Alias for setOutput for backward compatibility
  const addOutput = setOutput;

  const getOutput = useCallback((nodeId: string): NodeOutput | undefined => {
    return outputs.get(nodeId);
  }, [outputs]);

  const clearOutput = useCallback((nodeId: string) => {
    setOutputs(prev => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const clearAllOutputs = useCallback(() => {
    setOutputs(new Map());
    setWebhookData(null);
    setExecutionStatus("idle");
    setCurrentExecutingNodeId(null);
    setNodeExecutionStates(new Map());
    setAgentExecutionStates(new Map());
  }, []);

  const setNodeExecutionState = useCallback((nodeId: string, state: NodeExecutionState) => {
    setNodeExecutionStates(prev => {
      const next = new Map(prev);
      next.set(nodeId, state);
      return next;
    });
  }, []);

  const clearNodeExecutionStates = useCallback(() => {
    setNodeExecutionStates(new Map());
    setCurrentExecutingNodeId(null);
    setAgentExecutionStates(new Map());
  }, []);

  // Agent execution state management
  const setAgentExecutionState = useCallback((nodeId: string, state: Partial<AgentExecutionState>) => {
    setAgentExecutionStates(prev => {
      const next = new Map(prev);
      const existing = next.get(nodeId) || {
        nodeId,
        step: "idle" as const,
        activeToolIndex: null,
        activeToolName: null,
        iteration: 0,
      };
      next.set(nodeId, { ...existing, ...state });
      return next;
    });
  }, []);

  const getAgentExecutionState = useCallback((nodeId: string): AgentExecutionState | undefined => {
    return agentExecutionStates.get(nodeId);
  }, [agentExecutionStates]);

  const clearAgentExecutionStates = useCallback(() => {
    setAgentExecutionStates(new Map());
  }, []);

  return (
    <NodeOutputsContext.Provider 
      value={{ 
        outputs, 
        setOutput,
        addOutput,
        getOutput, 
        clearOutput, 
        clearAllOutputs,
        executionStatus,
        setExecutionStatus,
        currentExecutingNodeId,
        setCurrentExecutingNodeId,
        nodeExecutionStates,
        setNodeExecutionState,
        clearNodeExecutionStates,
        agentExecutionStates,
        setAgentExecutionState,
        getAgentExecutionState,
        clearAgentExecutionStates,
        webhookData,
        setWebhookData,
      }}
    >
      {children}
    </NodeOutputsContext.Provider>
  );
};

export const useNodeOutputs = () => {
  const context = useContext(NodeOutputsContext);
  if (!context) {
    throw new Error("useNodeOutputs must be used within NodeOutputsProvider");
  }
  return context;
};
