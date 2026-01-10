/**
 * Workflow Execution Controls
 * 
 * Client component for running workflows and testing individual nodes.
 * 
 * IMPORTANT: All execution state is IN-MEMORY ONLY.
 * - Node outputs stored in React state (useNodeOutputs)
 * - Nothing persisted to node.data or database during editing
 * - State vanishes on tab close - this is intentional (like n8n)
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Panel, useReactFlow } from "@xyflow/react";
import { 
  PlayIcon, 
  Loader2Icon, 
  CheckCircleIcon, 
  XCircleIcon,
  Square,
  Webhook
} from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
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
    
    // Find all edges where this node is the source
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

type ExecutionLog = {
  nodeId: string;
  nodeType: string;
  status: "success" | "error" | "running";
  input?: unknown;
  output?: unknown;
  error?: string;
  timestamp: string;
};

type ExecutionResult = {
  success: boolean;
  executionId?: string;
  logs?: ExecutionLog[];
  error?: string;
  result?: unknown;
};

export const WorkflowExecutionControls = ({ workflowId }: { workflowId: string }) => {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const { getNodes, getEdges } = useReactFlow();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Subscribe to real-time agent events via SSE
  const { disconnect: disconnectSSE } = useWorkflowEvents(isSSEConnected ? workflowId : null);
  
  // In-memory execution state - NOT persisted anywhere
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

  // Connect to SSE when execution starts, disconnect when done
  useEffect(() => {
    if (executionStatus === "running" || executionStatus === "waiting") {
      setIsSSEConnected(true);
    } else {
      // Keep connected briefly after completion to catch final events
      const timer = setTimeout(() => {
        setIsSSEConnected(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [executionStatus]);

  // Stop waiting for webhook
  const stopWaiting = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setExecutionStatus("idle");
    clearNodeExecutionStates();
    setWebhookUrl(null);
    disconnectSSE();
  }, [setExecutionStatus, clearNodeExecutionStates]);

  const handleRunWorkflow = async () => {
    setResult(null);
    clearAllOutputs(); // Clear previous execution state
    clearNodeExecutionStates(); // Clear all visual states

    const nodes = getNodes();
    const edges = getEdges();
    
    console.log("[Workflow UI] handleRunWorkflow called, nodes:", nodes.length, "edges:", edges.length);

    // Find webhook trigger node
    const webhookTriggerNode = nodes.find(n => n.type === "webhookTrigger");
    console.log("[Workflow UI] webhookTriggerNode:", webhookTriggerNode?.id, webhookTriggerNode?.type);
    
    if (webhookTriggerNode) {
      // WEBHOOK WORKFLOW: Wait for incoming webhook, then execute
      console.log("[Workflow UI] Starting webhook workflow mode");
      setExecutionStatus("waiting");
      setNodeExecutionState(webhookTriggerNode.id, "waiting"); // Show clock icon
      
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const webhookPath = webhookTriggerNode.data?.path || webhookTriggerNode.id;
      const testUrl = `${baseUrl}/api/webhook-test/${webhookPath}`;
      console.log("[Workflow UI] webhookPath:", webhookPath, "testUrl:", testUrl);
      setWebhookUrl(testUrl);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      console.log("[Workflow UI] About to start fetch to webhook-listen...");

      try {
        // Long-poll for webhook event
        console.log("[Workflow UI] Starting webhook-listen for path:", webhookPath);
        const response = await fetch(`${baseUrl}/api/webhook-listen/${webhookPath}?timeout=120000`, {
          signal: abortControllerRef.current.signal,
        });
        const webhookResult = await response.json();
        console.log("[Workflow UI] Webhook-listen returned:", webhookResult);
        
        if (!webhookResult.received || !webhookResult.data) {
          // Timeout - no webhook received
          console.log("[Workflow UI] No webhook received (timeout)");
          setExecutionStatus("idle");
          setNodeExecutionState(webhookTriggerNode.id, "idle");
          setWebhookUrl(null);
          setResult({
            success: false,
            error: "Timeout: No webhook request received within 2 minutes",
          });
          setShowLogs(true);
          return;
        }

        // Webhook received! Start execution
        console.log("[Workflow UI] Webhook received! Starting execution...");
        setExecutionStatus("running");
        setWebhookUrl(null);
        
        // Mark webhook trigger as running, then completed
        setNodeExecutionState(webhookTriggerNode.id, "running");
        setCurrentExecutingNodeId(webhookTriggerNode.id);
        
        // Store webhook data in in-memory state
        setWebhookData(webhookResult.data);
        setOutput(
          webhookTriggerNode.id, 
          "webhookTrigger", 
          webhookResult.data
        );
        
        // Brief delay to show the running state
        await new Promise(r => setTimeout(r, 300));
        setNodeExecutionState(webhookTriggerNode.id, "completed");

        // Mark ALL downstream nodes as "waiting" before execution starts
        // This ensures nodes like AI Agent show loading state immediately
        const downstreamNodes = getDownstreamNodes(webhookTriggerNode.id, nodes, edges);
        for (const nodeId of downstreamNodes) {
          setNodeExecutionState(nodeId, "waiting");
        }

        // Execute workflow with webhook data as trigger input
        // webhookPath is already defined above for the test URL
        console.log("[Workflow UI] Calling /api/workflows/execute with webhookPath:", webhookPath);
        const executeResponse = await fetch("/api/workflows/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            nodes,
            edges,
            triggerInput: webhookResult.data,
            webhookPath, // Pass webhook path so Respond to Webhook can route response
          }),
        });

        const data = await executeResponse.json();
        console.log("[Workflow UI] Execute response:", data);
        
        // Store each node's output and update visual state
        if (data.logs) {
          for (const log of data.logs) {
            setCurrentExecutingNodeId(log.nodeId);
            setNodeExecutionState(log.nodeId, "running");
            
            // For AI Agent nodes, animate through the execution
            if (log.nodeType === "aiAgent") {
              // Find the agent node to get tool configs
              const agentNode = nodes.find(n => n.id === log.nodeId);
              const toolConfigs = (agentNode?.data?.toolConfigs || []) as Array<{ type: string; label: string }>;
              
              // Map tool names to indices
              const toolNameToIndex: Record<string, number> = {};
              toolConfigs.forEach((tc, idx) => {
                // Map common tool type names to the tool names used by the agent
                if (tc.type === "gmailTool") toolNameToIndex["send_email"] = idx;
                else if (tc.type === "httpRequestTool") toolNameToIndex["http_request"] = idx;
                else if (tc.type === "postgresTool") toolNameToIndex["database_query"] = idx;
                else if (tc.type === "slackTool") toolNameToIndex["slack_message"] = idx;
                else if (tc.type === "openaiTool" || tc.type === "openAiChatModel") toolNameToIndex["openai_generate"] = idx;
              });
              
              const toolCalls = log.output?.toolCalls || [];
              
              // Step 1: Initial "thinking" - Chat Model shows loading
              setAgentExecutionState(log.nodeId, {
                nodeId: log.nodeId,
                step: "thinking",
                activeToolIndex: null,
                activeToolName: null,
                iteration: 1,
              });
              await new Promise(r => setTimeout(r, 400));
              
              // Animate through each tool call (if any)
              if (toolCalls.length > 0) {
                for (let i = 0; i < toolCalls.length; i++) {
                  const toolCall = toolCalls[i];
                  const toolIndex = toolNameToIndex[toolCall.tool];
                  
                  // Show tool being called
                  if (toolIndex !== undefined) {
                    setAgentExecutionState(log.nodeId, {
                      nodeId: log.nodeId,
                      step: "tool_calling",
                      activeToolIndex: toolIndex,
                      activeToolName: toolCall.tool,
                      iteration: i + 1,
                    });
                    await new Promise(r => setTimeout(r, 600));
                  }
                  
                  // After tool call, show "thinking" again (agent processes result)
                  setAgentExecutionState(log.nodeId, {
                    nodeId: log.nodeId,
                    step: "thinking",
                    activeToolIndex: null,
                    activeToolName: null,
                    iteration: i + 2,
                  });
                  await new Promise(r => setTimeout(r, 300));
                }
              }
              
              // Mark agent as complete
              setAgentExecutionState(log.nodeId, {
                nodeId: log.nodeId,
                step: "complete",
                activeToolIndex: null,
                activeToolName: null,
                iteration: log.output?.iterations || 1,
              });
            }
            
            await new Promise(r => setTimeout(r, 200)); // Small delay for visual effect
            
            setOutput(log.nodeId, log.nodeType, log.output, log.error);
            setNodeExecutionState(log.nodeId, log.error ? "error" : "completed");
          }
        }
        
        setCurrentExecutingNodeId(null);
        setResult(data);
        setShowLogs(true);
        setExecutionStatus(data.success ? "completed" : "error");
        
      } catch (error: any) {
        if (error.name === "AbortError") {
          // User cancelled
          setExecutionStatus("idle");
          clearNodeExecutionStates();
          setWebhookUrl(null);
          return;
        }
        
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Failed to execute workflow",
        });
        setShowLogs(true);
        setExecutionStatus("error");
      } finally {
        abortControllerRef.current = null;
        setCurrentExecutingNodeId(null);
      }
      
    } else {
      // NON-WEBHOOK WORKFLOW: Execute immediately
      setExecutionStatus("running");
      
      // Find trigger node and mark it as running
      const triggerNode = nodes.find(n => n.type === "trigger" || n.type === "manualTrigger");
      if (triggerNode) {
        setNodeExecutionState(triggerNode.id, "running");
        setCurrentExecutingNodeId(triggerNode.id);
      }

      try {
        const response = await fetch("/api/workflows/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            nodes,
            edges,
            triggerInput: {},
          }),
        });

        const data = await response.json();
        
        // Store each node's output and update visual state
        if (data.logs) {
          for (const log of data.logs) {
            setCurrentExecutingNodeId(log.nodeId);
            setNodeExecutionState(log.nodeId, "running");
            await new Promise(r => setTimeout(r, 200)); // Small delay for visual effect
            
            setOutput(log.nodeId, log.nodeType, log.output, log.error);
            setNodeExecutionState(log.nodeId, log.error ? "error" : "completed");
          }
        }
        
        setCurrentExecutingNodeId(null);
        setResult(data);
        setShowLogs(true);
        setExecutionStatus(data.success ? "completed" : "error");
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Failed to execute workflow",
        });
        setShowLogs(true);
        setExecutionStatus("error");
        setCurrentExecutingNodeId(null);
      }
    }
  };

  const isRunning = executionStatus === "running";
  const isWaiting = executionStatus === "waiting";

  return (
    <>
      <Panel
        className="m-4 flex flex-col items-end gap-2"
        position="top-right"
      >
        {/* Waiting for webhook indicator */}
        {isWaiting && webhookUrl && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-2 max-w-xs">
            <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-2">
              <Webhook className="h-4 w-4" />
              <span>Waiting for webhook...</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Send a request to this URL to trigger the workflow:
            </p>
            <code className="text-xs bg-black/30 px-2 py-1 rounded block truncate">
              {webhookUrl}
            </code>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
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

          {result && !isWaiting && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setShowLogs(true)}
            >
              View Logs
            </Button>
          )}
        </div>
      </Panel>

      {/* Execution Logs Sheet */}
      <Sheet open={showLogs} onOpenChange={setShowLogs}>
        <SheetContent className="w-100 sm:w-135">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Execution Results
              {result?.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-600" />
              )}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            {result?.error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 mb-4">
                <p className="text-red-600 font-medium">Error</p>
                <p className="text-sm text-muted-foreground">{result.error}</p>
              </div>
            )}

            {result?.logs?.map((log, index) => (
              <div
                key={`${log.nodeId}-${index}`}
                className="border-b border-border py-3 last:border-b-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  {log.status === "success" ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  ) : log.status === "running" ? (
                    <Loader2Icon className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">{log.nodeType}</span>
                  <span className="text-xs text-muted-foreground">
                    ({log.nodeId})
                  </span>
                </div>

                {log.input !== undefined && log.input !== null && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Input
                    </summary>
                    <pre className="bg-muted rounded p-2 mt-1 overflow-x-auto">
                      {String(JSON.stringify(log.input, null, 2))}
                    </pre>
                  </details>
                )}

                {log.output !== undefined && log.output !== null && (
                  <details className="text-xs mt-1">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Output
                    </summary>
                    <pre className="bg-muted rounded p-2 mt-1 overflow-x-auto">
                      {String(JSON.stringify(log.output, null, 2))}
                    </pre>
                  </details>
                )}

                {log.error && (
                  <div className="mt-1 text-xs text-red-600 bg-red-500/10 rounded p-2">
                    {log.error}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}

            {result?.result !== undefined && result?.result !== null && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="font-medium text-green-600 mb-2">Final Result</p>
                <pre className="text-xs overflow-x-auto">
                  {String(JSON.stringify(result.result, null, 2))}
                </pre>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};


