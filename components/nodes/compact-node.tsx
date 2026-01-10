/**
 * Compact Node Component
 * 
 * n8n-style minimal node that shows just icon and name.
 * Click to open the full editor panel.
 * Styled to match the respond-to-webhook node appearance.
 */

"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useNodeOutputs } from "@/providers/node-outputs";

// Node type to SVG icon path mapping
const NODE_ICONS: Record<string, string> = {
  phantomWatch: "/workflow-svgs/phantom_wallet.svg",
  metamaskWatch: "/workflow-svgs/metamask.svg",
  openai: "/workflow-svgs/openai.svg",
  gmail: "/workflow-svgs/gmail.svg",
  googleSheets: "/workflow-svgs/sheets.svg",
  postgres: "/workflow-svgs/postgress_database.svg",
  webhook: "/workflow-svgs/webhook.svg",
  httpRequest: "/workflow-svgs/https.svg",
  flow: "/workflow-svgs/iterator.svg",
  aiAgent: "/workflow-svgs/agent.svg",
  x402Gate: "/workflow-svgs/x402.svg",
  cronosPayment: "/workflow-svgs/cronos.svg",
  httpResponse: "/workflow-svgs/https.svg",
  blockchainAudit: "/workflow-svgs/policy.svg",
  email: "/workflow-svgs/gmail.svg",
  slack: "/workflow-svgs/slack.svg",
  trigger: "/workflow-svgs/start-trigger.svg",
  coingateWebhook: "/workflow-svgs/x402.svg",
  coingate: "/workflow-svgs/x402.svg",
  http: "/workflow-svgs/https.svg",
  airtable: "/workflow-svgs/airtable.svg",
  anthropic: "/workflow-svgs/anthropic.svg",
  default: "/workflow-svgs/webhook.svg",
};

// Node type to display name
const NODE_NAMES: Record<string, string> = {
  phantomWatch: "Phantom",
  metamaskWatch: "MetaMask",
  openai: "OpenAI",
  gmail: "Gmail",
  googleSheets: "Sheets",
  postgres: "PostgreSQL",
  webhook: "Webhook",
  httpRequest: "HTTP Request",
  flow: "Iterator",
  aiAgent: "AI Agent",
  x402Gate: "x402 Gate",
  cronosPayment: "Cronos Payment",
  httpResponse: "HTTP Response",
  blockchainAudit: "Blockchain Audit",
  email: "Email",
  slack: "Slack",
  trigger: "Trigger",
  coingateWebhook: "CoinGate",
  coingate: "CoinGate",
  http: "HTTP",
  airtable: "Airtable",
};

export interface CompactNodeData {
  label?: string;
  webhookStatus?: string;
  [key: string]: unknown;
}

interface CompactNodeProps extends NodeProps {
  data: CompactNodeData;
}

export const CompactNode = memo(({ id, type, data, selected }: CompactNodeProps) => {
  const displayName = data.label || NODE_NAMES[type || ""] || type || "Node";
  const iconPath = NODE_ICONS[type || "default"] || NODE_ICONS.default;

  // Get execution state from provider
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

  // Check if this is a trigger node
  const isTrigger = type?.includes("Watch") || type?.includes("webhook") || type?.includes("trigger") || type?.includes("Trigger");

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 cursor-pointer transition-all group",
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

        {/* Inner content - node icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={iconPath}
            alt={displayName}
            width={36}
            height={36}
            className={cn(
              "opacity-90",
              isCompleted && "filter-none",
              isError && "opacity-70"
            )}
          />
        </div>

        {/* Active status indicator for watch nodes */}
        {data.webhookStatus === "active" && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-background"></span>
          </span>
        )}

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
        {displayName}
      </span>

      {/* Item count badge on connection line */}
      {isCompleted && itemCount > 0 && (
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-[10px] text-green-500 font-medium whitespace-nowrap">
          {itemCount} item{itemCount > 1 ? "s" : ""}
        </div>
      )}

      {/* Input handle - left side (not for triggers) */}
      {!isTrigger && (
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
      )}

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

      {/* Add node button (plus icon) on hover */}
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-5 h-5 rounded border border-[#404040] bg-[#2d2d2d] flex items-center justify-center cursor-pointer hover:border-[#606060]">
          <Plus className="w-3 h-3 text-[#606060]" />
        </div>
      </div>
    </div>
  );
});

CompactNode.displayName = "CompactNode";


