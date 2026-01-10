/**
 * Agent Sub-Node Component
 * 
 * Circular nodes that connect to the AI Agent:
 * - Chat Model nodes (OpenAI, Anthropic, etc.)
 * - Memory nodes (Window Buffer, etc.)
 * - Tool nodes (HTTP, Database, etc.)
 * 
 * These nodes have a label above them showing their connection type.
 */

"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useNodeOutputs } from "@/providers/node-outputs";

export type AgentSubNodeData = {
  label?: string;
  subNodeType?: string;
  connectionType?: "chatModel" | "memory" | "tool";
  parentAgentId?: string;
  icon?: string;
  // Specific config based on subNodeType
  model?: string;
  temperature?: number;
  maxTokens?: number;
  memorySize?: number;
  // Tool-specific
  operation?: string;
};

interface AgentSubNodeProps extends NodeProps {
  data: AgentSubNodeData;
}

// Connection type colors and labels
const CONNECTION_CONFIG = {
  chatModel: { color: "#c084fc", label: "Model" },
  memory: { color: "#60a5fa", label: "Memory" },
  tool: { color: "#a78bfa", label: "Tool" },
};

export const AgentSubNode = memo(({ id, data, selected, type }: AgentSubNodeProps) => {
  const { nodeExecutionStates, getOutput } = useNodeOutputs();
  const nodeState = nodeExecutionStates.get(id) || "idle";
  const hasOutput = !!getOutput(id);
  
  const isRunning = nodeState === "running";
  const isCompleted = nodeState === "completed" || hasOutput;
  const isError = nodeState === "error";

  const connectionType = data.connectionType || "tool";
  const config = CONNECTION_CONFIG[connectionType];
  const displayLabel = data.label || "Sub Node";
  const iconPath = data.icon || "/workflow-svgs/agent.svg";

  // Get subtitle based on node type
  const getSubtitle = () => {
    if (data.subNodeType === "openaiChatModel") return data.model || "gpt-4";
    if (data.subNodeType === "windowBufferMemory") return `${data.memorySize || 5} messages`;
    if (data.operation) return data.operation;
    return "";
  };

  const subtitle = getSubtitle();

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 cursor-pointer transition-all",
        "hover:scale-105",
        selected && "scale-105"
      )}
    >
      {/* Connection type label above node */}
      <div 
        className="text-[9px] font-medium mb-1"
        style={{ color: config.color }}
      >
        {config.label}
      </div>

      {/* Diamond connector at top */}
      <div className="relative mb-[-8px] z-10">
        <div 
          className="w-[10px] h-[10px] rotate-45 bg-[#1a1a1a]"
          style={{ border: `2px solid ${config.color}` }}
        />
      </div>

      {/* Main circular container */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-full overflow-hidden transition-all",
          "bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]",
          "border-2",
          isCompleted ? "border-green-500" : 
          isError ? "border-red-500" : 
          "border-[#444]",
          selected 
            ? "ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg" 
            : "shadow-md hover:shadow-lg hover:border-[#555]"
        )}
      >
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <Image
            src={iconPath}
            alt={displayLabel}
            width={32}
            height={32}
            className="opacity-90"
          />
        </div>

        {/* Running indicator */}
        {isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Node name */}
      <span className={cn(
        "text-[10px] font-medium text-center max-w-[90px] leading-tight mt-1",
        selected ? "text-white" : "text-[#aaa]"
      )}>
        {displayLabel}
      </span>

      {/* Subtitle (model name, operation, etc.) */}
      {subtitle && (
        <span className="text-[9px] text-[#666] text-center max-w-[90px] leading-tight">
          {subtitle}
        </span>
      )}

      {/* Input handle at top (hidden, connects via diamond) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!opacity-0 !w-3 !h-3"
        style={{ top: 12 }}
      />

      {/* Output handle at bottom for chaining tools */}
      {connectionType === "tool" && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="output"
          className={cn(
            "!w-[8px] !h-[8px] !border-2 !border-[#1a1a1a] !rounded-full",
            "!bg-[#666] hover:!bg-primary transition-colors"
          )}
          style={{ bottom: -4 }}
        />
      )}
    </div>
  );
});

AgentSubNode.displayName = "AgentSubNode";

export default AgentSubNode;
