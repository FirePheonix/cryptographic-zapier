/**
 * Respond to Webhook Node
 * 
 * Returns HTTP response for webhook triggers with responseMode: "lastNode".
 * Square-shaped action node (not a trigger).
 * 
 * How it works:
 * - Receives data from upstream nodes
 * - Constructs HTTP response (status, headers, body)
 * - Returns response to the original webhook request
 * 
 * This allows:
 * - Processing data before responding
 * - Dynamic responses based on workflow logic
 * - API-style workflows (request → process → respond)
 */

"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useNodeOutputs } from "@/providers/node-outputs";

export type RespondToWebhookNodeData = {
  label?: string;
  statusCode?: number;
  contentType?: string;
  body?: string;
  headers?: string;
  // Execution state (only used for display, not persisted)
  itemCount?: number;
};

interface RespondToWebhookNodeProps extends NodeProps {
  data: RespondToWebhookNodeData;
}

export const RespondToWebhookNode = memo(({ id, data, selected }: RespondToWebhookNodeProps) => {
  // Get execution state from in-memory provider (vanishes on tab close)
  const { nodeExecutionStates, outputs } = useNodeOutputs();
  const executionState = nodeExecutionStates.get(id) || "idle";
  
  // Get item count from outputs
  const nodeOutput = outputs.get(id);
  const itemCount = nodeOutput?.output 
    ? (Array.isArray(nodeOutput.output) ? nodeOutput.output.length : 1)
    : 0;

  // Visual states
  const isRunning = executionState === "running";
  const isCompleted = executionState === "completed";
  const isError = executionState === "error";

  // Border color based on execution status
  const borderColor = isCompleted 
    ? "border-green-500" 
    : isError 
    ? "border-red-500" 
    : "border-[#404040]";

  const bgColor = isCompleted
    ? "bg-green-500/10"
    : isError
    ? "bg-red-500/10"
    : "bg-[#2d2d2d]";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 cursor-pointer transition-all",
        "hover:scale-105",
        selected && "scale-105"
      )}
    >
      {/* Square node container */}
      <div
        className={cn(
          "relative w-20 h-20 transition-all",
          bgColor,
          "border-2",
          borderColor,
          "rounded-xl",
          selected 
            ? "ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg" 
            : "shadow-md hover:shadow-lg hover:border-[#505050]"
        )}
      >
        {/* Green spinning loader overlay when running */}
        {isRunning && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 z-10">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        )}

        {/* Inner content - webhook icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/workflow-svgs/webhook.svg"
            alt="Respond to Webhook"
            width={36}
            height={36}
            className={cn(
              "opacity-90",
              isCompleted && "filter-none",
              isError && "opacity-70"
            )}
          />
        </div>

        {/* Execution status indicator */}
        {isCompleted && (
          <div className="absolute bottom-1 left-1">
            <Check className="w-4 h-4 text-green-500" />
          </div>
        )}
        {isError && (
          <div className="absolute bottom-1 left-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
        )}

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      </div>

      {/* Node label */}
      <span className={cn(
        "text-[11px] font-medium text-center max-w-[100px] leading-tight",
        selected ? "text-foreground" : "text-muted-foreground"
      )}>
        {data.label || "Respond to Webhook"}
      </span>

      {/* Item count badge on connection line */}
      {isCompleted && itemCount > 0 && (
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-[10px] text-green-500 font-medium whitespace-nowrap">
          {itemCount} item{itemCount > 1 ? "s" : ""}
        </div>
      )}

      {/* Input handle - left side */}
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!w-3 !h-3 !border-2 !border-[#2d2d2d]",
          "!bg-[#505050]",
          "!-left-1.5",
          "hover:!bg-primary transition-colors"
        )}
      />

      {/* Output handle - right side */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!w-3 !h-3 !border-2 !border-[#2d2d2d]",
          isCompleted ? "!bg-green-500" : "!bg-[#505050]",
          "!-right-1.5",
          "hover:!bg-primary transition-colors"
        )}
      />

      {/* Add node button (plus icon) */}
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-5 h-5 rounded border border-[#404040] bg-[#2d2d2d] flex items-center justify-center cursor-pointer hover:border-[#606060]">
          <Plus className="w-3 h-3 text-[#606060]" />
        </div>
      </div>
    </div>
  );
});

RespondToWebhookNode.displayName = "RespondToWebhookNode";

export default RespondToWebhookNode;
