/**
 * Run Workflow Button
 * 
 * Compact button for the header bar to trigger workflow execution.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { 
  PlayIcon, 
  Loader2Icon, 
  CheckCircleIcon, 
  XCircleIcon,
  Square,
} from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useNodeOutputs } from "@/providers/node-outputs";
import { useWorkflowEvents } from "@/hooks/use-workflow-events";

// Helper to find all downstream nodes from a starting node
function getDownstreamNodes(
  startNodeId: string,
  nodes: Array<{ id: string }>,
  edges: Array<{ source: string; target: string }>
): string[] {
  const downstream: string[] = [];
  const visited = new Set<string>();
  const queue = [startNodeId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    
    const outgoingEdges = edges.filter(e => e.source === current);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        downstream.push(edge.target);
        queue.push(edge.target);
      }
    }
  }
  
  return downstream;
}

type ExecutionResult = {
  success: boolean;
  executionId?: string;
  error?: string;
};

export const RunWorkflowButton = ({ workflowId }: { workflowId: string }) => {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const { getNodes, getEdges } = useReactFlow();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { disconnect: disconnectSSE } = useWorkflowEvents(isSSEConnected ? workflowId : null);
  
  const { 
    setOutput, 
    clearAllOutputs, 
    executionStatus, 
    setExecutionStatus,
    setWebhookData,
    setNodeExecutionState,
    setCurrentExecutingNodeId,
    clearNodeExecutionStates,
    setAgentExecutionState,
  } = useNodeOutputs();

  useEffect(() => {
    if (executionStatus === "running" || executionStatus === "waiting") {
      setIsSSEConnected(true);
    } else {
      const timer = setTimeout(() => {
        setIsSSEConnected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [executionStatus]);

  const stopWaiting = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setExecutionStatus("idle");
    clearNodeExecutionStates();
    setWebhookUrl(null);
    disconnectSSE();
  }, [setExecutionStatus, clearNodeExecutionStates, disconnectSSE]);

  const handleRunWorkflow = async () => {
    setResult(null);
    clearAllOutputs();
    clearNodeExecutionStates();

    const nodes = getNodes();
    const edges = getEdges();

    const webhookTriggerNode = nodes.find(n => n.type === "webhookTrigger");
    
    if (webhookTriggerNode) {
      setExecutionStatus("waiting");
      setNodeExecutionState(webhookTriggerNode.id, "waiting");
      
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const webhookPath = webhookTriggerNode.data?.path || webhookTriggerNode.id;
      const testUrl = `${baseUrl}/api/webhook-test/${webhookPath}`;
      setWebhookUrl(testUrl);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${baseUrl}/api/webhook-listen/${webhookPath}?timeout=120000`, {
          signal: abortControllerRef.current.signal,
        });
        const webhookResult = await response.json();
        
        if (!webhookResult.received || !webhookResult.data) {
          setExecutionStatus("idle");
          setNodeExecutionState(webhookTriggerNode.id, "idle");
          setWebhookUrl(null);
          setResult({
            success: false,
            error: "Timeout: No webhook request received within 2 minutes",
          });
          return;
        }

        setExecutionStatus("running");
        setWebhookUrl(null);
        
        setNodeExecutionState(webhookTriggerNode.id, "running");
        setCurrentExecutingNodeId(webhookTriggerNode.id);
        
        setWebhookData(webhookResult.data);
        setOutput(webhookTriggerNode.id, "webhookTrigger", webhookResult.data);
        
        await new Promise(r => setTimeout(r, 300));
        setNodeExecutionState(webhookTriggerNode.id, "completed");

        const downstreamNodes = getDownstreamNodes(webhookTriggerNode.id, nodes, edges);
        for (const nodeId of downstreamNodes) {
          setNodeExecutionState(nodeId, "waiting");
        }

        const executeResponse = await fetch("/api/workflows/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            nodes,
            edges,
            triggerInput: webhookResult.data,
            webhookPath,
          }),
        });

        const data = await executeResponse.json();
        
        if (data.logs) {
          for (const log of data.logs) {
            setCurrentExecutingNodeId(log.nodeId);
            if (log.output !== undefined) {
              setOutput(log.nodeId, log.nodeType, log.output);
            }
            setNodeExecutionState(log.nodeId, log.status === "success" ? "completed" : "error");
          }
        }

        setResult({
          success: data.success,
          executionId: data.executionId,
          error: data.error,
        });
        
        setExecutionStatus(data.success ? "completed" : "error");
        setCurrentExecutingNodeId(null);

      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Failed to execute workflow",
        });
        setExecutionStatus("error");
        setCurrentExecutingNodeId(null);
      }
    } else {
      // Non-webhook workflow - find trigger node
      const triggerNode = nodes.find(n => n.type === "trigger");
      
      if (!triggerNode) {
        setResult({ success: false, error: "No trigger node found in workflow" });
        return;
      }

      setExecutionStatus("running");
      setNodeExecutionState(triggerNode.id, "running");
      setCurrentExecutingNodeId(triggerNode.id);

      const downstreamNodes = getDownstreamNodes(triggerNode.id, nodes, edges);
      for (const nodeId of downstreamNodes) {
        setNodeExecutionState(nodeId, "waiting");
      }

      try {
        const triggerInput = triggerNode.data?.samplePayload || {};
        
        setOutput(triggerNode.id, "trigger", triggerInput);
        await new Promise(r => setTimeout(r, 200));
        setNodeExecutionState(triggerNode.id, "completed");

        const executeResponse = await fetch("/api/workflows/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            nodes,
            edges,
            triggerInput,
          }),
        });

        const data = await executeResponse.json();

        if (data.logs) {
          for (const log of data.logs) {
            setCurrentExecutingNodeId(log.nodeId);
            if (log.output !== undefined) {
              setOutput(log.nodeId, log.nodeType, log.output);
            }
            setNodeExecutionState(log.nodeId, log.status === "success" ? "completed" : "error");
          }
        }

        setResult({
          success: data.success,
          executionId: data.executionId,
          error: data.error,
        });
        
        setExecutionStatus(data.success ? "completed" : "error");
        setCurrentExecutingNodeId(null);

      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Failed to execute workflow",
        });
        setExecutionStatus("error");
        setCurrentExecutingNodeId(null);
      }
    }
  };

  const isRunning = executionStatus === "running";
  const isWaiting = executionStatus === "waiting";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isWaiting ? (
          <Button
            className="rounded-full gap-2 px-4 bg-red-600 hover:bg-red-700"
            onClick={stopWaiting}
            size="sm"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            className="rounded-full gap-2 px-4"
            onClick={handleRunWorkflow}
            disabled={isRunning}
            variant={result?.success ? "outline" : "default"}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : result?.success ? (
              <>
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                Run Again
              </>
            ) : result?.error ? (
              <>
                <XCircleIcon className="h-4 w-4 text-red-600" />
                Retry
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Run Workflow
              </>
            )}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>
        {isWaiting ? "Stop waiting for webhook" : "Execute the workflow"}
      </TooltipContent>
    </Tooltip>
  );
};
