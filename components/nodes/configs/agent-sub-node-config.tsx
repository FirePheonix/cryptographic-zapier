/**
 * Agent Sub-Node Configuration Panel
 * 
 * Configuration for Chat Model, Memory, and Tool sub-nodes
 * that connect to the AI Agent.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info, BrainCircuitIcon, DatabaseIcon, WrenchIcon } from "lucide-react";
import Image from "next/image";

interface AgentSubNodeConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

// Model options for Chat Model sub-nodes
const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Most Capable)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-3-opus", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku (Fast)" },
];

export function AgentSubNodeConfig({ data, onChange, inputData }: AgentSubNodeConfigProps) {
  const subNodeType = (data.subNodeType as string) || "";
  const connectionType = (data.connectionType as string) || "tool";

  // Render different config based on sub-node type
  if (connectionType === "chatModel") {
    return <ChatModelConfig data={data} onChange={onChange} subNodeType={subNodeType} />;
  }

  if (connectionType === "memory") {
    return <MemoryConfig data={data} onChange={onChange} subNodeType={subNodeType} />;
  }

  return <ToolConfig data={data} onChange={onChange} subNodeType={subNodeType} />;
}

// Chat Model Configuration
function ChatModelConfig({ 
  data, 
  onChange, 
  subNodeType 
}: { 
  data: Record<string, unknown>; 
  onChange: (updates: Record<string, unknown>) => void;
  subNodeType: string;
}) {
  const models = subNodeType.includes("openai") ? OPENAI_MODELS : 
                 subNodeType.includes("anthropic") ? ANTHROPIC_MODELS : OPENAI_MODELS;
  
  const model = (data.model as string) || models[0].value;
  const temperature = (data.temperature as number) ?? 0.7;
  const maxTokens = (data.maxTokens as number) ?? 2048;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-[#c084fc]">
        <BrainCircuitIcon className="h-5 w-5" />
        <span className="font-semibold">Chat Model Configuration</span>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/20 p-3 text-xs">
        <p className="font-medium text-[#c084fc] mb-1">🧠 Language Model</p>
        <p className="text-muted-foreground">
          This model will be used by the AI Agent to make decisions and generate responses.
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={model}
          onValueChange={(value) => onChange({ model: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Temperature</Label>
          <span className="text-sm text-muted-foreground">{temperature}</span>
        </div>
        <Slider
          value={[temperature]}
          onValueChange={([value]) => onChange({ temperature: value })}
          min={0}
          max={2}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          Lower = more focused, Higher = more creative
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label>Max Tokens</Label>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => onChange({ maxTokens: Number(e.target.value) })}
          min={100}
          max={128000}
        />
        <p className="text-xs text-muted-foreground">
          Maximum length of model response
        </p>
      </div>
    </div>
  );
}

// Memory Configuration
function MemoryConfig({ 
  data, 
  onChange, 
  subNodeType 
}: { 
  data: Record<string, unknown>; 
  onChange: (updates: Record<string, unknown>) => void;
  subNodeType: string;
}) {
  const memorySize = (data.memorySize as number) ?? 5;
  const contextKey = (data.contextKey as string) || "chat_history";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-[#60a5fa]">
        <DatabaseIcon className="h-5 w-5" />
        <span className="font-semibold">Memory Configuration</span>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-[#60a5fa]/10 border border-[#60a5fa]/20 p-3 text-xs">
        <p className="font-medium text-[#60a5fa] mb-1">💾 Conversation Memory</p>
        <p className="text-muted-foreground">
          Stores conversation history so the agent can remember previous messages.
        </p>
      </div>

      {/* Memory Type Info */}
      <div className="rounded-lg bg-muted p-3 text-xs">
        <p className="font-medium mb-1">
          {subNodeType === "windowBufferMemory" && "Window Buffer Memory"}
          {subNodeType === "tokenBufferMemory" && "Token Buffer Memory"}
          {subNodeType === "summaryMemory" && "Summary Memory"}
        </p>
        <p className="text-muted-foreground">
          {subNodeType === "windowBufferMemory" && "Keeps the last N messages in memory"}
          {subNodeType === "tokenBufferMemory" && "Keeps messages up to a token limit"}
          {subNodeType === "summaryMemory" && "Summarizes older messages to save tokens"}
        </p>
      </div>

      {/* Memory Size */}
      <div className="space-y-2">
        <Label>
          {subNodeType === "windowBufferMemory" ? "Messages to Remember" : "Token Limit"}
        </Label>
        <Input
          type="number"
          value={memorySize}
          onChange={(e) => onChange({ memorySize: Number(e.target.value) })}
          min={1}
          max={100}
        />
        <p className="text-xs text-muted-foreground">
          {subNodeType === "windowBufferMemory" 
            ? "Number of recent messages to keep"
            : "Maximum tokens to store"}
        </p>
      </div>

      {/* Context Key */}
      <div className="space-y-2">
        <Label>Context Key</Label>
        <Input
          value={contextKey}
          onChange={(e) => onChange({ contextKey: e.target.value })}
          placeholder="chat_history"
        />
        <p className="text-xs text-muted-foreground">
          Variable name used to pass history to the agent
        </p>
      </div>
    </div>
  );
}

// Tool Configuration
function ToolConfig({ 
  data, 
  onChange, 
  subNodeType 
}: { 
  data: Record<string, unknown>; 
  onChange: (updates: Record<string, unknown>) => void;
  subNodeType: string;
}) {
  const toolName = (data.toolName as string) || data.label as string || "custom_tool";
  const toolDescription = (data.toolDescription as string) || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-[#a78bfa]">
        <WrenchIcon className="h-5 w-5" />
        <span className="font-semibold">Tool Configuration</span>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-[#a78bfa]/10 border border-[#a78bfa]/20 p-3 text-xs">
        <p className="font-medium text-[#a78bfa] mb-1">🔧 Agent Tool</p>
        <p className="text-muted-foreground">
          The agent will decide when to use this tool based on the task at hand.
        </p>
      </div>

      {/* Tool Name */}
      <div className="space-y-2">
        <Label>Tool Name</Label>
        <Input
          value={toolName}
          onChange={(e) => onChange({ toolName: e.target.value })}
          placeholder="search_database"
        />
        <p className="text-xs text-muted-foreground">
          Name the agent will use to call this tool (no spaces)
        </p>
      </div>

      {/* Tool Description */}
      <div className="space-y-2">
        <Label>Tool Description</Label>
        <textarea
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border bg-background"
          value={toolDescription}
          onChange={(e) => onChange({ toolDescription: e.target.value })}
          placeholder="Searches the database for customer information. Use when the user asks about customer data."
        />
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          Be specific! The agent uses this description to decide when to call the tool.
        </p>
      </div>

      {/* Tool-specific settings based on subNodeType */}
      {subNodeType === "httpRequestTool" && (
        <div className="space-y-4 pt-2 border-t">
          <div className="space-y-2">
            <Label>HTTP Method</Label>
            <Select
              value={(data.method as string) || "GET"}
              onValueChange={(value) => onChange({ method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={(data.url as string) || ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://api.example.com/endpoint"
            />
          </div>
        </div>
      )}

      {subNodeType === "postgresTool" && (
        <div className="space-y-4 pt-2 border-t">
          <div className="space-y-2">
            <Label>Query Template</Label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border bg-background font-mono text-xs"
              value={(data.queryTemplate as string) || ""}
              onChange={(e) => onChange({ queryTemplate: e.target.value })}
              placeholder="SELECT * FROM users WHERE email = $1"
            />
          </div>
        </div>
      )}

      {/* Output Info */}
      <div className="rounded-lg bg-muted p-3 text-xs">
        <p className="font-medium mb-1">How it works:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Agent analyzes user input</li>
          <li>Decides if this tool is needed</li>
          <li>Calls tool with appropriate parameters</li>
          <li>Tool executes and returns result</li>
          <li>Agent uses result to continue</li>
        </ol>
      </div>
    </div>
  );
}
