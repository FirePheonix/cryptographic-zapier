/**
 * useWorkflowEvents Hook
 * 
 * Subscribes to Server-Sent Events (SSE) for real-time workflow execution updates.
 * Updates the agent execution state when agent events are received.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNodeOutputs } from "@/providers/node-outputs";

type AgentEvent = {
  type: 
    | "connected"
    | "agent_start"
    | "agent_thinking"
    | "agent_tool_start"
    | "agent_tool_end"
    | "agent_complete"
    | "agent_error"
    | "node_output";
  nodeId?: string;
  timestamp?: string;
  // Agent-specific fields
  input?: string;
  iteration?: number;
  toolName?: string;
  toolIndex?: number;
  toolInput?: any;
  toolOutput?: any;
  error?: string;
  answer?: string;
  totalIterations?: number;
  toolCallsSummary?: Array<{ tool: string; success: boolean }>;
  // Node output fields
  output?: any;
};

export function useWorkflowEvents(workflowId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { 
    setAgentExecutionState, 
    setNodeExecutionState,
    setOutput,
    clearAgentExecutionStates 
  } = useNodeOutputs();

  const handleEvent = useCallback((event: AgentEvent) => {
    console.log("[SSE] Received event:", event.type, event);
    
    switch (event.type) {
      case "connected":
        console.log("[SSE] Connected to workflow events");
        break;
        
      case "agent_start":
        if (event.nodeId) {
          setAgentExecutionState(event.nodeId, {
            nodeId: event.nodeId,
            step: "thinking",
            activeToolIndex: null,
            activeToolName: null,
            iteration: 0,
          });
          setNodeExecutionState(event.nodeId, "running");
        }
        break;
        
      case "agent_thinking":
        if (event.nodeId) {
          setAgentExecutionState(event.nodeId, {
            step: "thinking",
            activeToolIndex: null,
            activeToolName: null,
            iteration: event.iteration || 0,
          });
        }
        break;
        
      case "agent_tool_start":
        if (event.nodeId) {
          setAgentExecutionState(event.nodeId, {
            step: "tool_calling",
            activeToolIndex: event.toolIndex ?? null,
            activeToolName: event.toolName || null,
          });
        }
        break;
        
      case "agent_tool_end":
        if (event.nodeId) {
          // Keep showing the tool was called, but mark as no longer active
          // The UI can show a brief "completed" state before next tool
          setAgentExecutionState(event.nodeId, {
            step: "thinking", // Back to thinking after tool completes
            activeToolIndex: null,
            activeToolName: null,
          });
        }
        break;
        
      case "agent_complete":
        if (event.nodeId) {
          setAgentExecutionState(event.nodeId, {
            step: "complete",
            activeToolIndex: null,
            activeToolName: null,
            iteration: event.totalIterations || 0,
          });
          setNodeExecutionState(event.nodeId, "completed");
        }
        break;
        
      case "agent_error":
        if (event.nodeId) {
          setAgentExecutionState(event.nodeId, {
            step: "error",
            activeToolIndex: null,
            activeToolName: null,
          });
          setNodeExecutionState(event.nodeId, "error");
        }
        break;
        
      case "node_output":
        if (event.nodeId && event.output) {
          setOutput(event.nodeId, "unknown", event.output);
          setNodeExecutionState(event.nodeId, "completed");
        }
        break;
    }
  }, [setAgentExecutionState, setNodeExecutionState, setOutput]);

  useEffect(() => {
    if (!workflowId) return;

    // Clear previous state
    clearAgentExecutionStates();

    // Create EventSource connection
    const eventSource = new EventSource(`/api/workflows/${workflowId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent;
        handleEvent(event);
      } catch (error) {
        console.error("[SSE] Failed to parse event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[SSE] EventSource error:", error);
      // EventSource will automatically reconnect
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [workflowId, handleEvent, clearAgentExecutionStates]);

  // Return a function to manually close the connection
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { disconnect };
}
