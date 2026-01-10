import { Handle, Position, useReactFlow } from "@xyflow/react";
import { CodeIcon, CopyIcon, EyeIcon, TrashIcon, PlayIcon, Loader2Icon, Check, AlertTriangle } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useNodeOperations } from "@/providers/node-operations";
import { useNodeOutputs } from "@/providers/node-outputs";
import { NodeToolbar } from "./toolbar";

type NodeLayoutProps = {
  children: ReactNode;
  id: string;
  data?: Record<string, unknown> & {
    model?: string;
    source?: string;
    generated?: object;
  };
  title: string;
  type: string;
  toolbar?: {
    tooltip?: string;
    children: ReactNode;
  }[];
  className?: string;
};

export const NodeLayout = ({
  children,
  type,
  id,
  data,
  toolbar,
  title,
  className,
}: NodeLayoutProps) => {
  const { deleteElements, setCenter, getNode, updateNode } = useReactFlow();
  const { duplicateNode } = useNodeOperations();
  const { addOutput, outputs, nodeExecutionStates } = useNodeOutputs();
  const [showData, setShowData] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; output?: unknown; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Get execution state from in-memory provider
  const executionState = nodeExecutionStates.get(id) || "idle";
  const isRunning = executionState === "running";
  const isCompleted = executionState === "completed";
  const isError = executionState === "error";

  const handleFocus = () => {
    const node = getNode(id);

    if (!node) {
      return;
    }

    const { x, y } = node.position;
    const width = node.measured?.width ?? 0;

    setCenter(x + width / 2, y, {
      duration: 1000,
    });
  };

  const handleDelete = () => {
    deleteElements({
      nodes: [{ id }],
    });
  };

  const handleShowData = () => {
    setTimeout(() => {
      setShowData(true);
    }, 100);
  };

  const handleTestNode = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch("/api/workflows/test-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          nodeType: type,
          nodeData: data,
          nodeOutputs: outputs.map(o => ({
            nodeId: o.nodeId,
            output: o.output,
          })),
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      setShowTestResult(true);
      
      // Store output for reference in other nodes
      if (result.success && result.output) {
        addOutput(id, type, result.output);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      });
      setShowTestResult(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelect = (open: boolean) => {
    if (!open) {
      return;
    }

    const node = getNode(id);

    if (!node) {
      return;
    }

    if (!node.selected) {
      updateNode(id, { selected: true });
    }
  };

  // Determine if this node should have handles
  const isTriggerNode = type === "trigger";
  const isDropNode = type === "drop";

  return (
    <>
      {type !== "drop" && Boolean(toolbar?.length) && (
        <NodeToolbar id={id} items={toolbar} />
      )}
      {/* Target handle - all nodes except trigger and drop can receive input */}
      {!isTriggerNode && !isDropNode && (
        <Handle position={Position.Left} type="target" />
      )}
      <ContextMenu onOpenChange={handleSelect}>
        <ContextMenuTrigger>
          <div className="relative size-full h-auto w-sm">
            {/* Green spinning loader overlay when running */}
            {isRunning && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-black/40 z-20">
                <Loader2Icon className="w-10 h-10 text-green-500 animate-spin" />
              </div>
            )}
            
            {/* Execution status indicator */}
            {isCompleted && (
              <div className="absolute -top-2 -right-2 z-20">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            {isError && (
              <div className="absolute -top-2 -right-2 z-20">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            {type !== "drop" && (
              <div className="-translate-y-full -top-2 absolute right-0 left-0 flex shrink-0 items-center justify-between">
                <p className="font-mono text-muted-foreground text-xs tracking-tighter">
                  {title}
                </p>
              </div>
            )}
            <div
              className={cn(
                "node-container flex size-full flex-col divide-y rounded-[28px] bg-card p-2 ring-1 transition-all",
                isCompleted ? "ring-green-500" : isError ? "ring-red-500" : "ring-border",
                className
              )}
            >
              <div className="overflow-hidden rounded-3xl bg-card">
                {children}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleTestNode} disabled={isTesting || type === "drop" || type === "trigger"}>
            {isTesting ? <Loader2Icon size={12} className="animate-spin" /> : <PlayIcon size={12} />}
            <span>{isTesting ? "Testing..." : "Test Node"}</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => duplicateNode(id)}>
            <CopyIcon size={12} />
            <span>Duplicate</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleFocus}>
            <EyeIcon size={12} />
            <span>Focus</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} variant="destructive">
            <TrashIcon size={12} />
            <span>Delete</span>
          </ContextMenuItem>
          {process.env.NODE_ENV === "development" && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleShowData}>
                <CodeIcon size={12} />
                <span>Show data</span>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {/* Source handle - all nodes can output to next node */}
      {!isDropNode && <Handle position={Position.Right} type="source" />}
      <Dialog onOpenChange={setShowData} open={showData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Node data</DialogTitle>
            <DialogDescription>
              Data for node{" "}
              <code className="rounded-sm bg-secondary px-2 py-1 font-mono">
                {id}
              </code>
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-lg bg-black p-4 text-sm text-white">
            {JSON.stringify(data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setShowTestResult} open={showTestResult}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.iterationResults ? "Iteration Test Result" : "Test Result"}
              {testResult?.success ? (
                <span className="text-green-600 text-sm font-normal">(Success)</span>
              ) : (
                <span className="text-red-600 text-sm font-normal">(Error)</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {testResult?.iterationResults 
                ? `Iteration test from node ${id}` 
                : `Test execution for node ${id}`}
            </DialogDescription>
          </DialogHeader>
          {testResult?.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-red-600 font-medium mb-1">Error</p>
              <p className="text-sm text-muted-foreground">{testResult.error}</p>
            </div>
          )}
          {/* Iteration Results */}
          {testResult?.iterationResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Total Bundles:</span>
                <span className="bg-secondary px-2 py-0.5 rounded">{(testResult as any).totalBundles || (testResult.iterationResults as any[]).length}</span>
              </div>
              {(testResult.iterationResults as any[]).map((bundle: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Bundle {bundle.bundleIndex + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {bundle.nodeResults?.every((n: any) => n.success) 
                        ? "✓ All nodes succeeded" 
                        : "✗ Error occurred"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Input item: <code className="bg-secondary px-1 rounded">{JSON.stringify(bundle.item).slice(0, 100)}{JSON.stringify(bundle.item).length > 100 ? "..." : ""}</code>
                  </div>
                  {bundle.nodeResults?.map((nodeRes: any, nodeIdx: number) => (
                    <div 
                      key={nodeIdx} 
                      className={`text-xs p-2 rounded ${nodeRes.success ? "bg-green-500/10" : "bg-red-500/10"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono">{nodeRes.nodeType}</span>
                        <span>{nodeRes.success ? "✓" : "✗"}</span>
                      </div>
                      {nodeRes.error && (
                        <p className="text-red-600 mt-1">{nodeRes.error}</p>
                      )}
                      {nodeRes.output && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-muted-foreground">View output</summary>
                          <pre className="mt-1 p-2 bg-black text-white rounded text-xs overflow-x-auto max-h-32">
                            {JSON.stringify(nodeRes.output, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {/* Single node output */}
          {testResult?.output && !testResult?.iterationResults && (
            <div>
              <p className="text-sm font-medium mb-2">Output:</p>
              <pre className="overflow-x-auto rounded-lg bg-black p-4 text-sm text-white max-h-80">
                {JSON.stringify(testResult.output, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};


