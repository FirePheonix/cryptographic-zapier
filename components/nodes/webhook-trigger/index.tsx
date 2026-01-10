/**
 * Webhook Trigger Node
 * 
 * n8n-style webhook trigger that starts workflow on HTTP request.
 * D-shaped design with HTTP method badge.
 * 
 * Visual States:
 * - Idle: Bolt icon (amber)
 * - Waiting: Clock icon (pulsing)
 * - Running: Green spinner overlay
 * - Completed: Green checkmark
 * - Error: Red alert
 */

"use client";

import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Zap, Check, AlertTriangle, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import { useWorkflow } from "@/providers/workflow";
import { useNodeOutputs } from "@/providers/node-outputs";

export type WebhookTriggerNodeData = {
  label?: string;
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  path?: string;
  responseMode?: "onReceived" | "lastNode";
};

interface WebhookTriggerNodeProps extends NodeProps {
  data: WebhookTriggerNodeData;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-600",
  POST: "bg-blue-600",
  PUT: "bg-orange-500",
  DELETE: "bg-red-600",
  PATCH: "bg-purple-600",
  HEAD: "bg-gray-600",
  OPTIONS: "bg-gray-500",
};

export const WebhookTriggerNode = memo(({ id, data, selected }: WebhookTriggerNodeProps) => {
  const workflow = useWorkflow();
  const [copied, setCopied] = useState(false);
  
  // Get execution state from provider
  const { nodeExecutionStates, currentExecutingNodeId, getOutput } = useNodeOutputs();
  const nodeState = nodeExecutionStates.get(id) || "idle";
  const isCurrentlyExecuting = currentExecutingNodeId === id;
  const hasOutput = !!getOutput(id);
  
  const httpMethod = data.httpMethod || "POST";
  
  // Generate webhook URL
  const webhookUrl = typeof window !== "undefined" && workflow?.id
    ? `${window.location.origin}/api/webhook/${workflow.id}/${id}`
    : "";

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Visual state based on execution
  const isWaiting = nodeState === "waiting";
  const isRunning = nodeState === "running" || isCurrentlyExecuting;
  const isCompleted = nodeState === "completed" || (hasOutput && !isRunning && !isWaiting);
  const isError = nodeState === "error";

  // Border color based on execution status
  const borderColor = isCompleted 
    ? "border-green-500" 
    : isError 
    ? "border-red-500" 
    : isWaiting
    ? "border-orange-500"
    : isRunning
    ? "border-green-400"
    : "border-[#404040]";

  const bgColor = isCompleted
    ? "bg-green-500/10"
    : isError
    ? "bg-red-500/10"
    : isWaiting
    ? "bg-orange-500/10"
    : isRunning
    ? "bg-green-500/5"
    : "bg-[#2d2d2d]";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 cursor-pointer transition-all",
        "hover:scale-105",
        selected && "scale-105"
      )}
    >
      {/* Trigger badge - changes based on state */}
      <div className="absolute -top-1 -left-1 z-20">
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-all",
          isWaiting ? "bg-orange-500 animate-pulse" : 
          isRunning ? "bg-green-500" :
          isCompleted ? "bg-green-500" :
          isError ? "bg-red-500" :
          "bg-amber-500"
        )}>
          {isWaiting ? (
            <Clock className="w-3 h-3 text-white" />
          ) : isCompleted ? (
            <Check className="w-3 h-3 text-white" />
          ) : isError ? (
            <AlertTriangle className="w-3 h-3 text-white" />
          ) : (
            <Zap className="w-3 h-3 text-white fill-white" />
          )}
        </div>
      </div>

      {/* HTTP Method badge */}
      <div className="absolute -top-2 left-8 z-20">
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md",
          METHOD_COLORS[httpMethod]
        )}>
          {httpMethod}
        </div>
      </div>

      {/* D-shaped node container (flat left, curved right) */}
      <div
        className={cn(
          "relative w-20 h-20 transition-all",
          bgColor,
          "border-2",
          borderColor,
          // D-shape: flat left, curved right
          "rounded-l-lg rounded-r-[40px]",
          selected 
            ? "ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg" 
            : "shadow-md hover:shadow-lg hover:border-[#505050]",
          isWaiting && "animate-pulse"
        )}
      >
        {/* Inner content - webhook icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/workflow-svgs/webhook.svg"
            alt="Webhook"
            width={36}
            height={36}
            className={cn(
              "opacity-90 transition-opacity",
              isRunning && "opacity-50"
            )}
          />
        </div>

        {/* RUNNING: Green spinner overlay */}
        {isRunning && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          </div>
        )}

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 rounded-l-lg rounded-r-[40px] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      </div>

      {/* Node label */}
      <span className={cn(
        "text-[11px] font-medium text-center max-w-[100px] leading-tight",
        selected ? "text-foreground" : "text-muted-foreground"
      )}>
        {data.label || "Webhook"}
      </span>

      {/* Status text below label */}
      {isWaiting && (
        <span className="text-[9px] text-orange-400 animate-pulse">
          Waiting for event...
        </span>
      )}

      {/* Output handle - on the curved right side */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!w-3 !h-3 !border-2 !border-[#2d2d2d]",
          isCompleted ? "!bg-green-500" : "!bg-[#505050]",
          "!right-0 !top-1/2 !-translate-y-1/2",
          "hover:!bg-primary transition-colors"
        )}
        style={{ right: -6, top: "50%" }}
      />
    </div>
  );
});

WebhookTriggerNode.displayName = "WebhookTriggerNode";

export default WebhookTriggerNode;
