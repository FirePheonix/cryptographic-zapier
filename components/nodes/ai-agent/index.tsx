/**
 * AI Agent Node Component
 * 
 * n8n-style AI Agent node - a SINGLE execution node that:
 * - Internally orchestrates LLM + Tools
 * - Tools are internal adapters, NOT separate workflow nodes
 * - Produces exactly ONE output like any other node
 * - Preserves workflow continuity
 * 
 * Connection points at bottom:
 * - Chat Model* (required) - LLM provider
 * - Memory (optional) - conversation context
 * - Tool (multiple) - internal tool adapters
 */

"use client";

import { memo, useState, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Loader2, Plus } from "lucide-react";
import Image from "next/image";
import { useNodeOutputs } from "@/providers/node-outputs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Sub-node options for each connection type
const CHAT_MODEL_OPTIONS = [
  { id: "openaiChatModel", label: "OpenAI Chat Model", icon: "/icons/openai.svg", subtitle: "gpt-4" },
  { id: "anthropicChatModel", label: "Anthropic Claude", icon: "/workflow-svgs/anthropic.svg", subtitle: "claude-3" },
  { id: "geminiChatModel", label: "Google Gemini", icon: "/workflow-svgs/agent.svg", subtitle: "gemini-pro" },
  { id: "ollamaChatModel", label: "Ollama (Local)", icon: "/workflow-svgs/agent.svg", subtitle: "llama2" },
];

const MEMORY_OPTIONS = [
  { id: "windowBufferMemory", label: "Window Buffer Memory", icon: "/workflow-svgs/postgress_database.svg", subtitle: "5 messages" },
  { id: "tokenBufferMemory", label: "Token Buffer Memory", icon: "/workflow-svgs/postgress_database.svg", subtitle: "4000 tokens" },
  { id: "summaryMemory", label: "Summary Memory", icon: "/workflow-svgs/postgress_database.svg", subtitle: "auto" },
];

const TOOL_OPTIONS = [
  { id: "httpRequestTool", label: "HTTP Request", icon: "/workflow-svgs/https.svg", subtitle: "API calls" },
  { id: "postgresTool", label: "PostgreSQL", icon: "/workflow-svgs/postgress_database.svg", subtitle: "database" },
  { id: "googleSheetsTool", label: "Google Sheets", icon: "/workflow-svgs/sheets.svg", subtitle: "spreadsheet" },
  { id: "slackTool", label: "Slack", icon: "/workflow-svgs/slack.svg", subtitle: "messaging" },
  { id: "gmailTool", label: "Gmail", icon: "/workflow-svgs/gmail.svg", subtitle: "email" },
  { id: "customTool", label: "Custom Tool", icon: "/workflow-svgs/agent.svg", subtitle: "custom" },
];

// Connection type colors
const CONNECTION_COLORS = {
  chatModel: "#c084fc",
  memory: "#60a5fa", 
  tool: "#a78bfa",
};

export type AIAgentNodeData = {
  label?: string;
  systemPrompt?: string;
  maxIterations?: number;
  agentType?: "toolsAgent" | "openAiFunctions" | "planAndExecute" | "conversationalAgent";
  // Connected sub-nodes (stored as data, not as separate workflow nodes)
  chatModelConfig?: { type: string; label: string; icon: string; subtitle: string; settings?: Record<string, any> };
  memoryConfig?: { type: string; label: string; icon: string; subtitle: string; settings?: Record<string, any> };
  toolConfigs?: Array<{ type: string; label: string; icon: string; subtitle: string; settings?: Record<string, any> }>;
  // Execution state
  currentTool?: string; // Which tool is currently executing
  // Selected sub-node for configuration
  selectedSubNode?: { type: "chatModel" | "memory" | "tool"; index?: number } | null;
};

interface AIAgentNodeProps extends NodeProps {
  data: AIAgentNodeData;
}

export const AIAgentNode = memo(({ id, data, selected, type }: AIAgentNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const [openDropdown, setOpenDropdown] = useState<"chatModel" | "memory" | "tool" | null>(null);
  
  // Get execution state from provider
  const { nodeExecutionStates, currentExecutingNodeId, getOutput, getAgentExecutionState } = useNodeOutputs();
  const nodeState = nodeExecutionStates.get(id) || "idle";
  const isCurrentlyExecuting = currentExecutingNodeId === id;
  const hasOutput = !!getOutput(id);
  
  // Get agent-specific execution state (for tool loading indicators)
  const agentState = getAgentExecutionState(id);
  const activeToolIndex = agentState?.activeToolIndex;
  const isAgentThinking = agentState?.step === "thinking";
  const isAgentToolCalling = agentState?.step === "tool_calling";
  
  // Visual state based on execution - "waiting" also shows as loading
  const isRunning = nodeState === "running" || nodeState === "waiting" || isCurrentlyExecuting;
  const isCompleted = nodeState === "completed" || (hasOutput && !isRunning);
  const isError = nodeState === "error";

  const displayLabel = data.label || "AI Agent";
  const agentType = data.agentType || "toolsAgent";
  const currentTool = data.currentTool;
  const selectedSubNode = data.selectedSubNode;

  // Border/background based on state
  const borderColor = isCompleted 
    ? "border-green-500" 
    : isError 
    ? "border-red-500" 
    : isRunning
    ? "border-green-400"
    : "border-[#404040]";

  // Add a sub-node configuration (stored in node data, not as separate nodes)
  const handleAddSubNode = useCallback((
    option: { id: string; label: string; icon: string; subtitle: string },
    connectionType: "chatModel" | "memory" | "tool"
  ) => {
    const config = { type: option.id, label: option.label, icon: option.icon, subtitle: option.subtitle };
    
    if (connectionType === "chatModel") {
      updateNodeData(id, { ...data, chatModelConfig: config });
    } else if (connectionType === "memory") {
      updateNodeData(id, { ...data, memoryConfig: config });
    } else if (connectionType === "tool") {
      const existingTools = data.toolConfigs || [];
      updateNodeData(id, { ...data, toolConfigs: [...existingTools, config] });
    }
    
    setOpenDropdown(null);
  }, [id, data, updateNodeData]);

  // Remove a sub-node configuration
  const handleRemoveSubNode = useCallback((connectionType: "chatModel" | "memory" | "tool", index?: number) => {
    if (connectionType === "chatModel") {
      updateNodeData(id, { ...data, chatModelConfig: undefined, selectedSubNode: null });
    } else if (connectionType === "memory") {
      updateNodeData(id, { ...data, memoryConfig: undefined, selectedSubNode: null });
    } else if (connectionType === "tool" && index !== undefined) {
      const existingTools = data.toolConfigs || [];
      updateNodeData(id, { ...data, toolConfigs: existingTools.filter((_, i) => i !== index), selectedSubNode: null });
    }
  }, [id, data, updateNodeData]);

  // Select a sub-node for configuration
  const handleSelectSubNode = useCallback((connectionType: "chatModel" | "memory" | "tool", index?: number) => {
    updateNodeData(id, { 
      ...data, 
      selectedSubNode: { type: connectionType, index } 
    });
  }, [id, data, updateNodeData]);

  // Clear sub-node selection (show main AI Agent config)
  const handleClearSelection = useCallback(() => {
    updateNodeData(id, { ...data, selectedSubNode: null });
  }, [id, data, updateNodeData]);

  const getAgentTypeLabel = () => {
    switch (agentType) {
      case "toolsAgent": return "Tools Agent";
      case "openAiFunctions": return "OpenAI Functions";
      case "planAndExecute": return "Plan & Execute";
      case "conversationalAgent": return "Conversational Agent";
      default: return "Tools Agent";
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col cursor-pointer transition-all",
        selected && "scale-[1.02]"
      )}
    >
      {/* Main rectangular container - clicking clears sub-node selection */}
      <div
        onClick={() => {
          // Clear sub-node selection when clicking main node area
          // Don't use stopPropagation - let React Flow handle selection
          if (selectedSubNode) {
            handleClearSelection();
          }
        }}
        className={cn(
          "relative min-w-[220px] rounded-lg overflow-visible transition-all",
          "bg-[#232323]",
          "border",
          borderColor,
          selected 
            ? "ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg" 
            : "shadow-md hover:shadow-lg hover:border-[#505050]"
        )}
      >
        {/* Header section with icon and title */}
        <div className="flex items-center gap-3 px-3 py-3">
          {/* Agent Icon */}
          <div className="w-9 h-9 rounded-md bg-[#333] flex items-center justify-center border border-[#444]">
            <Image
              src="/workflow-svgs/agent.svg"
              alt="AI Agent"
              width={22}
              height={22}
              className={cn(
                "opacity-90 transition-opacity",
                isRunning && "opacity-50"
              )}
            />
          </div>
          
          {/* Title and subtitle */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[13px] text-white truncate">
              {displayLabel}
            </div>
            <div className="text-[11px] text-[#888]">
              {getAgentTypeLabel()}
            </div>
          </div>

          {/* Status indicator */}
          {isRunning && (
            <div className="w-5 h-5 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
            </div>
          )}
          {isCompleted && !isRunning && (
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500/20">
              <Check className="w-3 h-3 text-green-500" />
            </div>
          )}
          {isError && (
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20">
              <AlertTriangle className="w-3 h-3 text-red-500" />
            </div>
          )}
        </div>

        {/* Connection labels row */}
        <div className="flex justify-around px-2 pt-1 pb-2 text-[9px] font-medium border-t border-[#333]">
          <span className="text-[#c084fc]">Chat Model<span className="text-red-400">*</span></span>
          <span className="text-[#60a5fa]">Memory</span>
          <span className="text-[#a78bfa]">Tool</span>
        </div>

        {/* Diamond handles at bottom */}
        <div className="flex justify-around px-4 pb-1 relative">
          <div className="w-[10px] h-[10px] bg-[#232323] border-2 border-[#c084fc] rotate-45 mb-[-5px]" />
          <div className="w-[10px] h-[10px] bg-[#232323] border-2 border-[#60a5fa] rotate-45 mb-[-5px]" />
          <div className="w-[10px] h-[10px] bg-[#232323] border-2 border-[#a78bfa] rotate-45 mb-[-5px]" />
        </div>
      </div>

      {/* Sub-node connections area */}
      <div className="flex justify-around px-2 mt-3 gap-2">
        {/* Chat Model slot */}
        <div className="flex flex-col items-center">
          {/* Dashed line */}
          <div className="w-[1px] h-4 border-l-2 border-dashed border-[#c084fc]/50" />
          
          {data.chatModelConfig ? (
            <SubNodeDisplay 
              config={data.chatModelConfig} 
              connectionType="chatModel"
              // Chat Model is active when agent is "thinking" (calling LLM for decision)
              isActive={
                (isRunning && isAgentThinking) || 
                currentTool === data.chatModelConfig.type
              }
              isSelected={selectedSubNode?.type === "chatModel"}
              onRemove={() => handleRemoveSubNode("chatModel")}
              onClick={() => handleSelectSubNode("chatModel")}
            />
          ) : (
            <AddButton 
              connectionType="chatModel" 
              options={CHAT_MODEL_OPTIONS}
              onSelect={(opt) => handleAddSubNode(opt, "chatModel")}
              open={openDropdown === "chatModel"}
              onOpenChange={(open) => setOpenDropdown(open ? "chatModel" : null)}
            />
          )}
        </div>

        {/* Memory slot */}
        <div className="flex flex-col items-center">
          <div className="w-[1px] h-4 border-l-2 border-dashed border-[#60a5fa]/50" />
          
          {data.memoryConfig ? (
            <SubNodeDisplay 
              config={data.memoryConfig} 
              connectionType="memory"
              // Memory is active during agent start (loading context) and complete (saving context)
              isActive={
                (isRunning && (agentState?.step === "thinking" && agentState?.iteration === 1)) ||
                currentTool === data.memoryConfig.type
              }
              isSelected={selectedSubNode?.type === "memory"}
              onRemove={() => handleRemoveSubNode("memory")}
              onClick={() => handleSelectSubNode("memory")}
            />
          ) : (
            <AddButton 
              connectionType="memory" 
              options={MEMORY_OPTIONS}
              onSelect={(opt) => handleAddSubNode(opt, "memory")}
              open={openDropdown === "memory"}
              onOpenChange={(open) => setOpenDropdown(open ? "memory" : null)}
            />
          )}
        </div>

        {/* Tool slot(s) */}
        <div className="flex flex-col items-center">
          <div className="w-[1px] h-4 border-l-2 border-dashed border-[#a78bfa]/50" />
          
          <div className="flex gap-2">
            {(data.toolConfigs || []).map((tool, index) => (
              <SubNodeDisplay 
                key={`${tool.type}-${index}`}
                config={tool} 
                connectionType="tool"
                // Tool is active if agent is calling it (via SSE) or legacy currentTool match
                isActive={
                  (isAgentToolCalling && activeToolIndex === index) || 
                  currentTool === tool.type
                }
                isSelected={selectedSubNode?.type === "tool" && selectedSubNode?.index === index}
                onRemove={() => handleRemoveSubNode("tool", index)}
                onClick={() => handleSelectSubNode("tool", index)}
              />
            ))}
            <AddButton 
              connectionType="tool" 
              options={TOOL_OPTIONS}
              onSelect={(opt) => handleAddSubNode(opt, "tool")}
              open={openDropdown === "tool"}
              onOpenChange={(open) => setOpenDropdown(open ? "tool" : null)}
            />
          </div>
        </div>
      </div>

      {/* Agent thinking indicator */}
      {isRunning && isAgentThinking && !isAgentToolCalling && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-blue-500/20 border border-blue-500/30 rounded px-2 py-0.5 text-[9px] text-blue-400 whitespace-nowrap flex items-center gap-1">
          <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          Thinking...
        </div>
      )}

      {/* Currently executing tool indicator */}
      {isRunning && isAgentToolCalling && agentState?.activeToolName && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-500/30 rounded px-2 py-0.5 text-[9px] text-green-400 whitespace-nowrap flex items-center gap-1">
          <div className="w-2 h-2 border border-green-400 border-t-transparent rounded-full animate-spin" />
          Calling: {agentState.activeToolName}
        </div>
      )}

      {/* Legacy tool indicator (fallback) */}
      {isRunning && currentTool && !isAgentToolCalling && !isAgentThinking && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-500/30 rounded px-2 py-0.5 text-[9px] text-green-400 whitespace-nowrap">
          Executing: {currentTool}
        </div>
      )}

      {/* Input handle (left side) - normal workflow connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={cn(
          "!w-[10px] !h-[10px] !border-2 !border-[#232323] !rounded-full",
          isCompleted ? "!bg-green-500" : "!bg-[#666]",
          "hover:!bg-primary transition-colors"
        )}
        style={{ left: -5, top: 35 }}
      />

      {/* Output handle (right side) - normal workflow connection */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={cn(
          "!w-[10px] !h-[10px] !border-2 !border-[#232323] !rounded-full",
          isCompleted ? "!bg-green-500" : "!bg-[#666]",
          "hover:!bg-primary transition-colors"
        )}
        style={{ right: -5, top: 35 }}
      />
    </div>
  );
});

// Sub-node display component (circular node with icon)
function SubNodeDisplay({ 
  config, 
  connectionType, 
  isActive,
  isSelected,
  onRemove,
  onClick,
}: { 
  config: { type: string; label: string; icon: string; subtitle: string };
  connectionType: "chatModel" | "memory" | "tool";
  isActive?: boolean;
  isSelected?: boolean;
  onRemove: () => void;
  onClick: () => void;
}) {
  const color = CONNECTION_COLORS[connectionType];
  const labelMap = { chatModel: "Model", memory: "Memory", tool: "Tool" };
  
  return (
    <div 
      className="flex flex-col items-center group relative cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Connection type label */}
      <div className="text-[8px] font-medium mb-1" style={{ color }}>
        {labelMap[connectionType]}
      </div>
      
      {/* Diamond at top */}
      <div 
        className="w-[8px] h-[8px] rotate-45 bg-[#1a1a1a] mb-[-6px] z-10"
        style={{ border: `2px solid ${color}` }}
      />
      
      {/* Circular node */}
      <div 
        className={cn(
          "relative w-14 h-14 rounded-full overflow-hidden transition-all",
          "bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]",
          "border-2",
          isSelected 
            ? "border-primary ring-2 ring-primary/30" 
            : isActive 
            ? "border-green-500 ring-2 ring-green-500/30"
            : "border-[#444]",
          "hover:border-[#666]"
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <Image
            src={config.icon}
            alt={config.label}
            width={28}
            height={28}
            className="opacity-90"
          />
        </div>
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Selected indicator */}
        {isSelected && !isActive && (
          <div className="absolute inset-0 border-2 border-primary rounded-full" />
        )}
        
        {/* Remove button on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center text-white text-[10px] hidden group-hover:flex hover:bg-red-600"
        >
          ×
        </button>
      </div>
      
      {/* Label */}
      <span className={cn(
        "text-[9px] text-center max-w-[70px] leading-tight mt-1 truncate",
        isSelected ? "text-primary" : "text-[#aaa]"
      )}>
        {config.label}
      </span>
      
      {/* Subtitle */}
      <span className="text-[8px] text-[#666] text-center">
        {config.subtitle}
      </span>
    </div>
  );
}

// Add button with dropdown
function AddButton({ 
  connectionType, 
  options,
  onSelect,
  open,
  onOpenChange
}: { 
  connectionType: "chatModel" | "memory" | "tool";
  options: Array<{ id: string; label: string; icon: string; subtitle: string }>;
  onSelect: (option: { id: string; label: string; icon: string; subtitle: string }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const color = CONNECTION_COLORS[connectionType];
  const labels = { chatModel: "Chat Model", memory: "Memory", tool: "Tool" };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <div 
          className="w-6 h-6 rounded border border-dashed flex items-center justify-center cursor-pointer transition-colors bg-[#1a1a1a]"
          style={{ 
            borderColor: open ? color : '#444',
            color: open ? color : '#666'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.color = color;
          }}
          onMouseLeave={(e) => {
            if (!open) {
              e.currentTarget.style.borderColor = '#444';
              e.currentTarget.style.color = '#666';
            }
          }}
        >
          <Plus className="w-3 h-3" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-[#1a1a1a] border-[#333]">
        <DropdownMenuLabel style={{ color }}>Select {labels[connectionType]}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#333]" />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className="flex items-center gap-2 cursor-pointer hover:bg-[#333]"
            onClick={() => onSelect(option)}
          >
            <Image src={option.icon} alt={option.label} width={16} height={16} />
            <div className="flex-1">
              <span className="text-sm">{option.label}</span>
              <span className="text-xs text-[#666] ml-2">{option.subtitle}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

AIAgentNode.displayName = "AIAgentNode";

export default AIAgentNode;
