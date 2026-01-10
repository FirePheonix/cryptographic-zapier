/**
 * Node Execution Overlay
 * 
 * A visual overlay that shows execution state on nodes.
 * Shows a green spinner when the node is currently executing.
 * 
 * Usage: Add this component inside any node component
 */

"use client";

import { memo } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNodeOutputs } from "@/providers/node-outputs";

interface NodeExecutionOverlayProps {
  nodeId: string;
  className?: string;
}

export const NodeExecutionOverlay = memo(({ nodeId, className }: NodeExecutionOverlayProps) => {
  const { nodeExecutionStates, currentExecutingNodeId, getOutput } = useNodeOutputs();
  
  const nodeState = nodeExecutionStates.get(nodeId) || "idle";
  const isCurrentlyExecuting = currentExecutingNodeId === nodeId;
  const output = getOutput(nodeId);
  const hasOutput = !!output;
  const hasError = !!output?.error;
  
  // Determine visual state
  const isRunning = nodeState === "running" || isCurrentlyExecuting;
  const isCompleted = nodeState === "completed" || (hasOutput && !hasError && !isRunning);
  const isError = nodeState === "error" || hasError;
  
  if (!isRunning && !isCompleted && !isError) {
    return null;
  }
  
  return (
    <>
      {/* Running: Green spinner overlay */}
      {isRunning && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center z-30 pointer-events-none",
          className
        )}>
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        </div>
      )}
      
      {/* Completed: Small green check badge */}
      {isCompleted && !isRunning && (
        <div className="absolute -top-1 -right-1 z-30">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
      
      {/* Error: Small red alert badge */}
      {isError && !isRunning && (
        <div className="absolute -top-1 -right-1 z-30">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
    </>
  );
});

NodeExecutionOverlay.displayName = "NodeExecutionOverlay";

/**
 * Hook to get node execution state for custom rendering
 */
export function useNodeExecutionState(nodeId: string) {
  const { nodeExecutionStates, currentExecutingNodeId, getOutput } = useNodeOutputs();
  
  const nodeState = nodeExecutionStates.get(nodeId) || "idle";
  const isCurrentlyExecuting = currentExecutingNodeId === nodeId;
  const output = getOutput(nodeId);
  const hasOutput = !!output;
  const hasError = !!output?.error;
  
  return {
    nodeState,
    isWaiting: nodeState === "waiting",
    isRunning: nodeState === "running" || isCurrentlyExecuting,
    isCompleted: nodeState === "completed" || (hasOutput && !hasError),
    isError: nodeState === "error" || hasError,
    hasOutput,
    output: output?.output,
    error: output?.error,
  };
}
