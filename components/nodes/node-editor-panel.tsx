/**
 * Node Editor Panel
 * 
 * n8n-style modal editor that opens when clicking a node.
 * Shows: Input (left) | Configuration (middle) | Output (right)
 * 
 * IMPORTANT: All execution state is IN-MEMORY ONLY via useNodeOutputs.
 * - Node outputs are NOT stored in node.data (which gets persisted)
 * - State vanishes on tab close - this is intentional (like n8n)
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactFlow, useNodes, useEdges } from "@xyflow/react";
import { X, ChevronLeft, Play, FileJson, Loader2, Radio, Square, Check, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNodeOutputs } from "@/providers/node-outputs";

// Import drag & drop components
import { DragProvider } from "./drag-context";
import { DraggableSchemaView } from "./draggable-schema-view";

// Import node-specific configs
import { PhantomConfig } from "./configs/phantom-config";
import { OpenAIConfig } from "./configs/openai-config";
import { GmailConfig } from "./configs/gmail-config";
import { PostgresConfig } from "./configs/postgres-config";
import { FlowConfig } from "./configs/flow-config";
import CoingateConfig from "./configs/coingate-config";
import { ManualTriggerConfig } from "./configs/manual-trigger-config";
import { WebhookTriggerConfig } from "./configs/webhook-trigger-config";
import { RespondToWebhookConfig } from "./configs/respond-to-webhook-config";
import { AIAgentConfig } from "./configs/ai-agent-config";
import { AgentSubNodeConfig } from "./configs/agent-sub-node-config";
// x402 Payment Protocol configs
import { X402GateConfig } from "./configs/x402-gate-config";
import { CronosPaymentConfig } from "./configs/cronos-payment-config";
import { HttpResponseConfig } from "./configs/http-response-config";
import { HttpRequestConfig } from "./configs/http-request-config";
import { BlockchainAuditConfig } from "./configs/blockchain-audit-config";

interface NodeEditorPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

// Minimum and maximum widths for side panels
const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 500;
const DEFAULT_PANEL_WIDTH = 320;

export function NodeEditorPanel({ nodeId, onClose }: NodeEditorPanelProps) {
  const { setNodes } = useReactFlow();
  // Use reactive hooks to get updates when node data changes (e.g., selectedSubNode)
  const nodes = useNodes();
  const edges = useEdges();
  const [activeTab, setActiveTab] = useState<"parameters" | "settings">("parameters");
  const [inputView, setInputView] = useState<"schema" | "table" | "json">("schema");
  const [outputView, setOutputView] = useState<"schema" | "table" | "json">("schema");
  
  // In-memory execution state - NOT persisted
  const { getOutput, setOutput, webhookData, setWebhookData } = useNodeOutputs();
  
  // Test execution state
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  
  // Webhook listening state
  const [isListening, setIsListening] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Resizable panel widths
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  
  // Dragging state
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get node reactively from nodes array
  const node = nodeId ? nodes.find(n => n.id === nodeId) : null;

  // Handle mouse move for resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    if (isDraggingLeft) {
      const newWidth = e.clientX - containerRect.left;
      setLeftPanelWidth(Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH));
    }
    
    if (isDraggingRight) {
      const newWidth = containerRect.right - e.clientX;
      setRightPanelWidth(Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH));
    }
  }, [isDraggingLeft, isDraggingRight]);

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  // Add/remove event listeners for dragging
  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Webhook listening functions - must be before early return to maintain hook order
  // Path MUST match exactly what webhook-trigger-config.tsx displays: just the nodeId
  const webhookPath = nodeId || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  
  const startListening = useCallback(async () => {
    if (!webhookPath || !nodeId) {
      return;
    }
    
    setIsListening(true);
    setWebhookData(null);
    
    // Clear any previous event
    try {
      await fetch(`${baseUrl}/api/webhook-listen/${webhookPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
    } catch (e) {
      console.error("Failed to clear listener:", e);
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${baseUrl}/api/webhook-listen/${webhookPath}?timeout=60000`, {
        signal: abortControllerRef.current.signal,
      });
      const result = await response.json();
      
      if (result.received && result.data) {
        // Store in IN-MEMORY provider state only (not persisted)
        setWebhookData(result.data);
        setOutput(nodeId, "webhookTrigger", result.data);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error listening for webhook:", error);
      }
    } finally {
      setIsListening(false);
      abortControllerRef.current = null;
    }
  }, [baseUrl, webhookPath, nodeId, setWebhookData, setOutput]);

  const stopListening = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup webhook listener on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Clear AI Agent's selectedSubNode when switching TO an AI Agent node (so it shows main config first)
  const prevNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (nodeId && nodeId !== prevNodeIdRef.current) {
      prevNodeIdRef.current = nodeId;
      // If this is an AI Agent node, clear selectedSubNode when first opened
      const currentNode = nodes.find(n => n.id === nodeId);
      if (currentNode?.type === "aiAgent" && currentNode.data?.selectedSubNode) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, selectedSubNode: null } }
              : n
          )
        );
      }
    }
  }, [nodeId, nodes, setNodes]);

  if (!node || !nodeId) return null;

  // Get input data from connected nodes (from in-memory execution state)
  const inputEdges = edges.filter((e) => e.target === nodeId);
  const inputNodes = inputEdges.map((e) => nodes.find(n => n.id === e.source)).filter(Boolean);

  // Collect input data from all source nodes (from provider, not node.data)
  const inputData = inputNodes.reduce((acc, sourceNode) => {
    if (sourceNode) {
      const sourceOutput = getOutput(sourceNode.id);
      if (sourceOutput?.output) {
        acc[sourceNode.id] = sourceOutput.output;
      }
    }
    return acc;
  }, {} as Record<string, any>);

  // Get output data from this node (from provider, not node.data)
  const currentNodeOutput = nodeId ? getOutput(nodeId) : null;
  const outputData = currentNodeOutput?.output || null;

  // Update node data (only for configuration, NOT for outputs)
  const updateNodeData = (updates: Record<string, unknown>) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, ...updates } }
          : n
      )
    );
  };

  // Test step - execute only this node
  const testStep = async () => {
    if (!node || !nodeId) return;
    
    setIsTesting(true);
    setTestError(null);
    
    try {
      // Collect outputs from upstream nodes for the test (from provider)
      const nodeOutputsForTest = inputNodes
        .map(n => {
          if (!n) return null;
          const output = getOutput(n.id);
          if (!output?.output) return null;
          return { nodeId: n.id, output: output.output };
        })
        .filter(Boolean) as Array<{ nodeId: string; output: unknown }>;
      // Send input data as-is (keyed by nodeId) for {{input.nodeId.field}} syntax
      // Also flatten for {{trigger.field}} syntax
      const flattenedInput = Object.values(inputData).reduce((acc, data) => {
        if (typeof data === 'object' && data !== null) {
          return { ...acc, ...data };
        }
        return acc;
      }, {} as Record<string, unknown>);

      const response = await fetch("/api/workflows/test-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId,
          nodeType,
          nodeData: node.data,
          testInput: flattenedInput,
          nodeOutputs: nodeOutputsForTest,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store output in IN-MEMORY provider state only (not persisted)
        setOutput(nodeId, nodeType, result.output);
      } else {
        setTestError(result.error || "Test failed");
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  // Get node display info
  const nodeType = node.type || "unknown";
  const nodeLabel = (node.data?.label as string) || nodeType;

  return (
    <DragProvider>
    {/* Backdrop - click to close */}
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal Container - 85% width and height */}
      <div 
        ref={containerRef}
        className="w-[85%] h-[85%] bg-background rounded-xl shadow-2xl flex flex-col overflow-hidden border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to canvas
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border">
              <span className="text-sm font-medium">{nodeLabel}</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {nodeType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {nodeType !== "webhookTrigger" && (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={testStep}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {isTesting ? "Testing..." : "Test step"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Test Error Banner */}
        {testError && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-destructive">{testError}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setTestError(null)}
              className="h-6 px-2 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Main Content - 3 columns with resizable panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Input (or Webhook Listener for webhook triggers) */}
          <div 
            className="flex flex-col bg-muted/20 flex-shrink-0"
            style={{ width: leftPanelWidth }}
          >
            {nodeType === "webhookTrigger" ? (
              /* Webhook Trigger - Special Left Panel */
              <>
                <div className="p-3 border-b flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-orange-400" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pull in events from Webhook
                  </h3>
                </div>
                
                <div className="flex-1 flex flex-col p-4">
                  {/* Listen Button */}
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    className={cn(
                      "w-full h-10 font-medium mb-4",
                      isListening 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-orange-500 hover:bg-orange-600 text-white"
                    )}
                  >
                    {isListening ? (
                      <>
                        <Square className="w-4 h-4 mr-2 fill-current" />
                        Stop listening
                      </>
                    ) : (
                      <>
                        <Radio className="w-4 h-4 mr-2" />
                        Listen for test event
                      </>
                    )}
                  </Button>

                  {/* Listening indicator */}
                  {isListening && (
                    <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-500/10 rounded-md p-3 border border-orange-500/30 mb-4">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      <span>Waiting for webhook request...</span>
                    </div>
                  )}

                  {/* Received Data */}
                  {webhookData && !isListening && (
                    <div className="flex-1 overflow-auto">
                      <div className="text-sm text-green-400 bg-green-500/10 rounded-md p-3 border border-green-500/30 mb-3">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Webhook received!</span>
                          <span className="text-xs text-green-300 ml-auto">1 item</span>
                        </div>
                      </div>
                      
                      {/* View Toggle for received data */}
                      <div className="flex gap-1 mb-3">
                        <Button
                          variant={inputView === "schema" ? "secondary" : "ghost"}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInputView("schema")}
                        >
                          Schema
                        </Button>
                        <Button
                          variant={inputView === "table" ? "secondary" : "ghost"}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInputView("table")}
                        >
                          Table
                        </Button>
                        <Button
                          variant={inputView === "json" ? "secondary" : "ghost"}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInputView("json")}
                        >
                          JSON
                        </Button>
                      </div>

                      {inputView === "json" ? (
                        <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto max-h-[400px]">
                          {JSON.stringify(webhookData, null, 2)}
                        </pre>
                      ) : inputView === "schema" ? (
                        <DraggableSchemaView data={webhookData} sourceNodeId={nodeId || ""} sourceNodeName="Webhook" />
                      ) : (
                        <TableView data={webhookData} />
                      )}
                    </div>
                  )}

                  {/* Instructions when not listening and no data */}
                  {!isListening && !webhookData && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground px-4">
                      <Webhook className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-sm mb-2">Once you've finished building your workflow, run it without having to click this button by using the production webhook URL.</p>
                      <a href="#" className="text-orange-400 hover:underline text-sm">More info</a>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Regular Node - Standard Input Panel */
              <>
                <div className="p-3 border-b">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Input
                  </h3>
                </div>
                
                {/* View Toggle */}
                <div className="p-2 border-b flex gap-1">
                  <Button
                    variant={inputView === "schema" ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInputView("schema")}
                  >
                    Schema
                  </Button>
                  <Button
                    variant={inputView === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInputView("table")}
                  >
                    Table
                  </Button>
                  <Button
                    variant={inputView === "json" ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInputView("json")}
                  >
                    JSON
                  </Button>
                </div>

                <div className="flex-1 overflow-auto">
                  {Object.keys(inputData).length > 0 ? (
                    <div className="p-3">
                      {inputView === "json" ? (
                        <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto">
                          {JSON.stringify(inputData, null, 2)}
                        </pre>
                      ) : inputView === "schema" ? (
                        <DraggableSchemaView data={inputData} sourceNodeId={nodeId} sourceNodeName={nodeLabel} />
                      ) : (
                        <TableView data={inputData} />
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No input data available</p>
                      <p className="text-xs mt-1">Connect this node to other nodes to see their outputs</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Left Resize Handle */}
          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0 relative group"
            onMouseDown={() => setIsDraggingLeft(true)}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/20" />
          </div>

          {/* Middle Panel - Configuration */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b px-4 flex-shrink-0">
                <TabsList className="h-12 bg-transparent p-0 gap-4">
                  <TabsTrigger
                    value="parameters"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
                  >
                    Parameters
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                <TabsContent value="parameters" className="p-4 m-0 h-full">
                  <NodeConfig
                    nodeId={nodeId}
                    nodeType={nodeType}
                    nodeData={node.data as Record<string, unknown>}
                    onChange={updateNodeData}
                    inputData={inputData}
                  />
                </TabsContent>

                <TabsContent value="settings" className="p-4 m-0 h-full">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Node Name</Label>
                      <Input
                        value={(node.data?.label as string) || ""}
                        onChange={(e) => updateNodeData({ label: e.target.value })}
                        placeholder="Enter a custom name..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea
                        value={(node.data?.notes as string) || ""}
                        onChange={(e) => updateNodeData({ notes: e.target.value })}
                        placeholder="Add notes about this node..."
                        className="mt-1 min-h-[100px]"
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Resize Handle */}
          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0 relative group"
            onMouseDown={() => setIsDraggingRight(true)}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/20" />
          </div>

          {/* Right Panel - Output */}
          <div 
            className="flex flex-col bg-muted/20 flex-shrink-0"
            style={{ width: rightPanelWidth }}
          >
            <div className="p-3 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Output
              </h3>
            </div>

            {/* View Toggle */}
            <div className="p-2 border-b flex gap-1">
              <Button
                variant={outputView === "schema" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setOutputView("schema")}
              >
                Schema
              </Button>
              <Button
                variant={outputView === "table" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setOutputView("table")}
              >
                Table
              </Button>
              <Button
                variant={outputView === "json" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setOutputView("json")}
              >
                JSON
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {outputData ? (
                <div className="p-3">
                  {outputView === "json" ? (
                    <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-auto">
                      {JSON.stringify(outputData, null, 2)}
                    </pre>
                  ) : outputView === "schema" ? (
                    <DraggableSchemaView data={outputData} sourceNodeId={nodeId} sourceNodeName={nodeLabel} basePath="output" />
                  ) : (
                    <TableView data={outputData} />
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No output data yet</p>
                  <p className="text-xs mt-1">Execute this node to view data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </DragProvider>
  );
}

// Schema view component - renders nested data as expandable tree
function SchemaView({ data, prefix = "" }: { data: any; prefix?: string }) {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground text-xs">null</span>;
  }

  if (typeof data !== "object") {
    return (
      <span className="text-xs">
        {typeof data === "string" ? (
          <span className="text-green-600 dark:text-green-400">"{data}"</span>
        ) : typeof data === "number" ? (
          <span className="text-blue-600 dark:text-blue-400">{data}</span>
        ) : typeof data === "boolean" ? (
          <span className="text-purple-600 dark:text-purple-400">{String(data)}</span>
        ) : (
          String(data)
        )}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);

  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start gap-2">
          <span className="text-xs font-medium text-muted-foreground min-w-fit">
            {isArray ? `[${key}]` : key}:
          </span>
          {typeof value === "object" && value !== null ? (
            <details className="flex-1" open={entries.length < 5}>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                {Array.isArray(value) ? `Array(${value.length})` : `Object`}
              </summary>
              <div className="ml-3 mt-1 pl-2 border-l border-muted">
                <SchemaView data={value} />
              </div>
            </details>
          ) : (
            <SchemaView data={value} />
          )}
        </div>
      ))}
    </div>
  );
}

// Table view component
function TableView({ data }: { data: any }) {
  if (!data || typeof data !== "object") {
    return <div className="text-xs text-muted-foreground">No data</div>;
  }

  const entries = Array.isArray(data)
    ? data.map((v, i) => ({ key: i, value: v }))
    : Object.entries(data).map(([key, value]) => ({ key, value }));

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 font-medium">Key</th>
            <th className="text-left p-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ key, value }) => (
            <tr key={key} className="border-t">
              <td className="p-2 font-mono text-muted-foreground">{key}</td>
              <td className="p-2 font-mono truncate max-w-[150px]">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Node-specific configuration
function NodeConfig({
  nodeId,
  nodeType,
  nodeData,
  onChange,
  inputData,
}: {
  nodeId: string;
  nodeType: string;
  nodeData: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData: Record<string, any>;
}) {
  switch (nodeType) {
    case "manualTrigger":
      return <ManualTriggerConfig nodeId={nodeId} data={nodeData as any} onUpdate={onChange} />;
    case "webhookTrigger":
      return <WebhookTriggerConfig nodeId={nodeId} data={nodeData as any} onUpdate={onChange} />;
    case "respondToWebhook":
      return <RespondToWebhookConfig nodeId={nodeId} data={nodeData as any} onUpdate={onChange} />;
    case "phantomWatch":
    case "metamaskWatch":
      return <PhantomConfig data={nodeData} onChange={onChange} nodeType={nodeType} />;
    case "openai":
      return <OpenAIConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "aiAgent":
      return <AIAgentConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "agentSubNode":
      return <AgentSubNodeConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "gmail":
      return <GmailConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "postgres":
      return <PostgresConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "flow":
      return <FlowConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "coingateWebhook":
    case "coingate":
      return <CoingateConfig node={{ id: '', type: nodeType, position: { x: 0, y: 0 }, data: nodeData }} onChange={onChange} />;
    // x402 Payment Protocol nodes
    case "x402Gate":
      return <X402GateConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "cronosPayment":
      return <CronosPaymentConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "httpResponse":
      return <HttpResponseConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "httpRequest":
      return <HttpRequestConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    case "blockchainAudit":
      return <BlockchainAuditConfig data={nodeData} onChange={onChange} inputData={inputData} />;
    default:
      return (
        <div className="text-sm text-muted-foreground">
          <p>Configuration for {nodeType} nodes is not yet available.</p>
          <pre className="mt-4 p-3 bg-muted rounded-md text-xs">
            {JSON.stringify(nodeData, null, 2)}
          </pre>
        </div>
      );
  }
}


