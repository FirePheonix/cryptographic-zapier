/**
 * AI Agent Configuration Panel
 * 
 * Configuration for the AI Agent node AND its sub-nodes.
 * When a sub-node (Chat Model, Memory, Tool) is selected, shows that config.
 * Otherwise shows the main AI Agent config.
 * 
 * IMPORTANT: Tool configs reuse the SAME config components as standalone nodes
 * (GmailConfig, OpenAIConfig, etc.) for full feature parity.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Info, BotIcon, BrainCircuitIcon, DatabaseIcon, WrenchIcon, 
  ArrowLeft, Globe, Database, Mail, MessageSquare, FileSpreadsheet
} from "lucide-react";
import { DroppableTextarea, DroppableInput } from "../droppable-input";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Import existing config components to REUSE for tools
import { GmailConfig } from "./gmail-config";
import { OpenAIConfig } from "./openai-config";
import { HttpRequestConfig } from "./http-request-config";
import { PostgresConfig } from "./postgres-config";

interface SubNodeConfig {
  type: string;
  label: string;
  icon: string;
  subtitle: string;
  settings?: Record<string, any>;
}

interface AIAgentConfigProps {
  data: Record<string, unknown> & {
    chatModelConfig?: SubNodeConfig;
    memoryConfig?: SubNodeConfig;
    toolConfigs?: SubNodeConfig[];
    currentTool?: string;
    selectedSubNode?: { type: "chatModel" | "memory" | "tool"; index?: number } | null;
  };
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

// Debounce hook
function useDebouncedCallback<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;
}

export function AIAgentConfig({ data, onChange, inputData }: AIAgentConfigProps) {
  const selectedSubNode = data.selectedSubNode;
  
  // Clear invalid selectedSubNode (e.g., tool was removed)
  useEffect(() => {
    if (selectedSubNode) {
      const isInvalid = 
        (selectedSubNode.type === "chatModel" && !data.chatModelConfig) ||
        (selectedSubNode.type === "memory" && !data.memoryConfig) ||
        (selectedSubNode.type === "tool" && (selectedSubNode.index === undefined || !data.toolConfigs?.[selectedSubNode.index]));
      
      if (isInvalid) {
        onChange({ selectedSubNode: null });
      }
    }
  }, [selectedSubNode, data.chatModelConfig, data.memoryConfig, data.toolConfigs, onChange]);
  
  // If a sub-node is selected AND the config exists, show its config
  if (selectedSubNode) {
    if (selectedSubNode.type === "chatModel" && data.chatModelConfig) {
      return (
        <ChatModelConfig
          config={data.chatModelConfig}
          onChange={(settings) => onChange({ chatModelConfig: { ...data.chatModelConfig!, settings } })}
          onBack={() => onChange({ selectedSubNode: null })}
        />
      );
    }
    if (selectedSubNode.type === "memory" && data.memoryConfig) {
      return (
        <MemoryConfig
          config={data.memoryConfig}
          onChange={(settings) => onChange({ memoryConfig: { ...data.memoryConfig!, settings } })}
          onBack={() => onChange({ selectedSubNode: null })}
        />
      );
    }
    if (selectedSubNode.type === "tool" && selectedSubNode.index !== undefined) {
      const toolConfig = data.toolConfigs?.[selectedSubNode.index];
      if (toolConfig) {
        return (
          <ToolConfig
            config={toolConfig}
            index={selectedSubNode.index}
            onChange={(settings) => {
              const newTools = [...(data.toolConfigs || [])];
              newTools[selectedSubNode.index!] = { ...newTools[selectedSubNode.index!], settings };
              onChange({ toolConfigs: newTools });
            }}
            onBack={() => onChange({ selectedSubNode: null })}
          />
        );
      }
    }
    // Return null while waiting for useEffect to clear the invalid state
    return null;
  }

  // Default: show main AI Agent config
  return <MainAgentConfig data={data} onChange={onChange} inputData={inputData} />;
}

// ============================================================================
// Main AI Agent Configuration
// ============================================================================

function MainAgentConfig({ data, onChange, inputData }: AIAgentConfigProps) {
  const [localSystemPrompt, setLocalSystemPrompt] = useState((data.systemPrompt as string) || "");
  const [localApiKey, setLocalApiKey] = useState((data.decisionMakerApiKey as string) || "");
  const debouncedOnChange = useDebouncedCallback(onChange, 300);

  useEffect(() => {
    setLocalSystemPrompt((data.systemPrompt as string) || "");
  }, [data.systemPrompt]);

  useEffect(() => {
    setLocalApiKey((data.decisionMakerApiKey as string) || "");
  }, [data.decisionMakerApiKey]);

  const maxIterations = (data.maxIterations as number) ?? 10;
  const decisionMakerModel = (data.decisionMakerModel as string) || "gpt-4o-mini";
  const decisionMakerProvider = (data.decisionMakerProvider as string) || "openai";
  const memoryConfig = data.memoryConfig;
  const toolConfigs = data.toolConfigs || [];
  
  // Also include chatModelConfig as a tool (for backward compatibility with canvas connections)
  // The "Chat Model*" slot on canvas now becomes an LLM Tool, not the Decision Maker
  const chatModelConfig = data.chatModelConfig;
  
  // Combine all tools: toolConfigs + chatModelConfig (if connected)
  const allTools = [
    ...(chatModelConfig ? [{ ...chatModelConfig, isLLMTool: true }] : []),
    ...toolConfigs
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-purple-600">
        <BotIcon className="h-5 w-5" />
        <span className="font-semibold">AI Agent Configuration</span>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-xs">
        <p className="font-medium text-purple-600 mb-1">Autonomous Agent</p>
        <p className="text-muted-foreground">
          The <strong className="text-orange-400">Decision Maker</strong> is the brain that ROUTES and DECIDES.
          <strong className="text-purple-400"> Tools</strong> (including LLMs) are what it USES to accomplish tasks.
        </p>
      </div>

      {/* ========== DECISION MAKER SECTION (Built-in dropdown, NOT a sub-node) ========== */}
      <div className="space-y-4 p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-2 border-orange-500/40">
        <div className="flex items-center gap-2">
          <BrainCircuitIcon className="h-5 w-5 text-orange-500" />
          <Label className="text-sm font-bold text-orange-500">Decision Maker (Brain)</Label>
          <Badge className="bg-orange-500/30 text-orange-300 text-[9px]">ROUTER</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          This LLM is the agent's brain. It reads inputs, <strong>DECIDES</strong> which tools to call, interprets results, and determines when done.
          <span className="text-orange-400 block mt-1">⚠️ This is NOT a tool - it's the controller that uses tools!</span>
        </p>
        
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-xs">Provider</Label>
          <Select 
            value={decisionMakerProvider} 
            onValueChange={(v) => onChange({ decisionMakerProvider: v })}
          >
            <SelectTrigger className="bg-[#1a1a1a] border-orange-500/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <img src="/icons/openai.svg" alt="" className="w-4 h-4" />
                  OpenAI
                </div>
              </SelectItem>
              <SelectItem value="anthropic">
                <div className="flex items-center gap-2">
                  <img src="/workflow-svgs/anthropic.svg" alt="" className="w-4 h-4" />
                  Anthropic
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Select 
            value={decisionMakerModel} 
            onValueChange={(v) => onChange({ decisionMakerModel: v })}
          >
            <SelectTrigger className="bg-[#1a1a1a] border-orange-500/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {decisionMakerProvider === "openai" ? (
                <>
                  <SelectItem value="gpt-4o">GPT-4o (Best reasoning)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & cheap)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="o1-preview">o1-preview (Advanced reasoning)</SelectItem>
                  <SelectItem value="o1-mini">o1-mini</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (Latest)</SelectItem>
                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus (Most capable)</SelectItem>
                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label className="text-xs">API Key <span className="text-destructive">*</span></Label>
          <Input
            type="password"
            placeholder={decisionMakerProvider === "openai" ? "sk-..." : "sk-ant-..."}
            value={localApiKey}
            onChange={(e) => {
              setLocalApiKey(e.target.value);
              debouncedOnChange({ decisionMakerApiKey: e.target.value });
            }}
            className="bg-[#1a1a1a] border-orange-500/40"
          />
          <p className="text-[10px] text-orange-400/70">
            Used ONLY for decision-making/routing, not for content generation
          </p>
        </div>
      </div>

      {/* ========== AGENT INSTRUCTIONS ========== */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-400" />
          <Label htmlFor="systemPrompt" className="text-sm font-semibold">Agent Instructions <span className="text-destructive">*</span></Label>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Tell the Decision Maker what to do and how to use the available tools.
        </p>
        <DroppableTextarea
          id="systemPrompt"
          placeholder={`You are an autonomous agent that processes requests.

When you receive input:
1. Analyze what needs to be done
2. Use the openai_generate tool to create content if needed
3. Use gmail_send tool to send emails if needed  
4. Use http_request tool to call APIs if needed
5. Report success when all tasks are complete

Your available tools will be listed below - use them to accomplish the task!`}
          value={localSystemPrompt}
          onChange={(e) => {
            setLocalSystemPrompt(e.target.value);
            debouncedOnChange({ systemPrompt: e.target.value });
          }}
          rows={6}
          className="text-sm"
        />
      </div>

      {/* ========== TOOLS SECTION ========== */}
      <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-2 border-purple-500/40">
        <div className="flex items-center gap-2">
          <WrenchIcon className="h-5 w-5 text-purple-500" />
          <Label className="text-sm font-bold text-purple-500">Available Tools</Label>
          <Badge className="bg-purple-500/30 text-purple-300 text-[9px]">CAPABILITIES</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          These are the tools the Decision Maker can USE. <strong className="text-purple-400">LLM tools</strong> generate content, other tools perform actions.
        </p>
        
        <div className="space-y-2">
          {allTools.map((tool, i) => {
            const isLLM = (tool as any).isLLMTool || tool.type?.includes("ChatModel") || tool.type?.includes("openai") || tool.type?.includes("anthropic");
            return (
              <div 
                key={i} 
                onClick={() => {
                  if ((tool as any).isLLMTool) {
                    onChange({ selectedSubNode: { type: "chatModel" } });
                  } else {
                    onChange({ selectedSubNode: { type: "tool", index: chatModelConfig ? i - 1 : i } });
                  }
                }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  isLLM 
                    ? "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20" 
                    : "bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20"
                )}
              >
                <Image src={tool.icon} alt="" width={20} height={20} />
                <div className="flex-1">
                  <span className="text-sm">{tool.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{tool.subtitle}</span>
                </div>
                <Badge className={cn(
                  "text-[9px]",
                  isLLM ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"
                )}>
                  {isLLM ? "LLM Tool" : "Tool"}
                </Badge>
              </div>
            );
          })}

          {allTools.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-purple-500/30 text-muted-foreground text-xs">
              <WrenchIcon className="h-4 w-4" />
              <div>
                <p>No tools connected</p>
                <p className="text-muted-foreground/70">Connect OpenAI, Gmail, HTTP Request, etc. to the Tool or Chat Model slots on the canvas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MEMORY SECTION (Optional) ========== */}
      {memoryConfig && (
        <div className="space-y-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-semibold text-blue-500">Memory</Label>
          </div>
          <div 
            onClick={() => onChange({ selectedSubNode: { type: "memory" } })}
            className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
          >
            <Image src={memoryConfig.icon} alt="" width={20} height={20} />
            <div className="flex-1">
              <span className="text-sm">{memoryConfig.label}</span>
              <span className="text-xs text-muted-foreground ml-2">{memoryConfig.subtitle}</span>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 text-[9px]">Memory</Badge>
          </div>
        </div>
      )}

      {/* ========== ADVANCED SETTINGS ========== */}
      <div className="space-y-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
        <Label className="text-sm font-semibold">Advanced Settings</Label>
        
        {/* Max Iterations */}
        <div className="space-y-2">
          <Label htmlFor="maxIterations">Max Iterations (Think-Act-Observe Cycles)</Label>
          <Input
            id="maxIterations"
            type="number"
            min={1}
            max={20}
            value={maxIterations}
            onChange={(e) => onChange({ maxIterations: parseInt(e.target.value) || 10 })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of reasoning cycles before the agent must provide a final answer (1-20)
          </p>
        </div>
      </div>

      {/* Output Info */}
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs">
        <p className="font-medium text-green-500 mb-2">📤 Agent Output Fields:</p>
        <div className="space-y-1 text-muted-foreground">
          <p><span className="font-mono text-green-400">answer</span> - Final response from the agent</p>
          <p><span className="font-mono text-green-400">toolCalls</span> - List of all tools called with inputs/outputs</p>
          <p><span className="font-mono text-green-400">iterations</span> - Number of think-act-observe cycles</p>
          <p><span className="font-mono text-green-400">status</span> - completed | error | max_iterations</p>
        </div>
      </div>

      {/* How it Works */}
      <div className="rounded-lg bg-[#1a1a1a] border border-[#333] p-3 text-xs">
        <p className="font-medium text-white mb-2">🔄 How the Agent Works:</p>
        <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
          <li><strong>Receive</strong> - Gets input from previous node (e.g., webhook data)</li>
          <li><strong>Think</strong> - Decision Maker LLM reads input + instructions</li>
          <li><strong>Act</strong> - Calls appropriate tool (Gmail, HTTP, etc.)</li>
          <li><strong>Observe</strong> - Receives tool result, adds to context</li>
          <li><strong>Repeat</strong> - Continues until task complete or max iterations</li>
          <li><strong>Output</strong> - Returns final answer to next node</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Model Configuration
// ============================================================================

function ChatModelConfig({ 
  config, 
  onChange, 
  onBack 
}: { 
  config: SubNodeConfig;
  onChange: (settings: Record<string, any>) => void;
  onBack: () => void;
}) {
  const settings = config.settings || {};

  // Wrapper to convert onChange format
  const handleConfigChange = (updates: Record<string, unknown>) => {
    onChange({ ...settings, ...updates });
  };

  // For OpenAI, use the real OpenAIConfig component
  const useOpenAIConfig = config.type === "openaiChatModel";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to AI Agent
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-[#c084fc]/20 flex items-center justify-center">
          <Image src={config.icon} alt="" width={24} height={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{config.label}</h3>
          <p className="text-xs text-muted-foreground">Chat Model for AI Agent</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">Model</Badge>
      </div>

      {/* Use real OpenAI config for OpenAI models */}
      {useOpenAIConfig ? (
        <OpenAIConfig 
          data={settings} 
          onChange={handleConfigChange} 
        />
      ) : (
        <GenericChatModelSettings config={config} settings={settings} onChange={onChange} />
      )}
    </div>
  );
}

// Generic chat model settings for non-OpenAI models
function GenericChatModelSettings({ 
  config, 
  settings, 
  onChange 
}: { 
  config: SubNodeConfig; 
  settings: Record<string, any>; 
  onChange: (settings: Record<string, any>) => void;
}) {
  const debouncedOnChange = useDebouncedCallback(onChange, 300);
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey || "");

  const modelOptions: Record<string, string[]> = {
    anthropicChatModel: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
    geminiChatModel: ["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro", "gemini-1.5-flash"],
    ollamaChatModel: ["llama2", "llama3", "mistral", "codellama", "mixtral"],
  };

  const models = modelOptions[config.type] || ["default"];

  return (
    <>
      {/* Model Selection */}
      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={settings.model || models[0]}
          onValueChange={(value) => onChange({ ...settings, model: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model} value={model}>{model}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* API Key (for non-Ollama) */}
      {config.type !== "ollamaChatModel" && (
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input
            type="password"
            placeholder={`${config.label.split(" ")[0]} API Key (or use env var)`}
            value={localApiKey}
            onChange={(e) => {
              setLocalApiKey(e.target.value);
              debouncedOnChange({ ...settings, apiKey: e.target.value });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use environment variable (ANTHROPIC_API_KEY, etc.)
          </p>
        </div>
      )}

      {/* Ollama Endpoint */}
      {config.type === "ollamaChatModel" && (
        <div className="space-y-2">
          <Label>Ollama Endpoint</Label>
          <Input
            placeholder="http://localhost:11434"
            value={settings.endpoint || ""}
            onChange={(e) => onChange({ ...settings, endpoint: e.target.value })}
          />
        </div>
      )}

      {/* Temperature */}
      <div className="space-y-2">
        <Label>Temperature</Label>
        <Input
          type="number"
          min={0}
          max={2}
          step={0.1}
          placeholder="0.7"
          value={settings.temperature || ""}
          onChange={(e) => onChange({ ...settings, temperature: parseFloat(e.target.value) || 0.7 })}
        />
        <p className="text-xs text-muted-foreground">0 = deterministic, 2 = creative (default: 0.7)</p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label>Max Tokens</Label>
        <Input
          type="number"
          min={100}
          max={128000}
          placeholder="4096"
          value={settings.maxTokens || ""}
          onChange={(e) => onChange({ ...settings, maxTokens: parseInt(e.target.value) || 4096 })}
        />
      </div>
    </>
  );
}

// ============================================================================
// Memory Configuration
// ============================================================================

function MemoryConfig({ 
  config, 
  onChange, 
  onBack 
}: { 
  config: SubNodeConfig;
  onChange: (settings: Record<string, any>) => void;
  onBack: () => void;
}) {
  const settings = config.settings || {};

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to AI Agent
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#60a5fa]/20 flex items-center justify-center">
          <Image src={config.icon} alt="" width={24} height={24} />
        </div>
        <div>
          <h3 className="font-semibold">{config.label}</h3>
          <p className="text-xs text-muted-foreground">Memory Configuration</p>
        </div>
      </div>

      {/* Memory Type Specific Settings */}
      {config.type === "windowBufferMemory" && (
        <>
          <div className="space-y-2">
            <Label>Window Size (messages)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              placeholder="5"
              value={settings.windowSize || ""}
              onChange={(e) => onChange({ ...settings, windowSize: parseInt(e.target.value) || 5 })}
            />
            <p className="text-xs text-muted-foreground">
              Number of recent messages to keep in context
            </p>
          </div>
        </>
      )}

      {config.type === "tokenBufferMemory" && (
        <>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              min={100}
              max={100000}
              placeholder="4000"
              value={settings.maxTokens || ""}
              onChange={(e) => onChange({ ...settings, maxTokens: parseInt(e.target.value) || 4000 })}
            />
            <p className="text-xs text-muted-foreground">
              Maximum tokens to keep in memory buffer
            </p>
          </div>
        </>
      )}

      {config.type === "summaryMemory" && (
        <>
          <div className="space-y-2">
            <Label>Summary Threshold (messages)</Label>
            <Input
              type="number"
              min={5}
              max={50}
              placeholder="10"
              value={settings.summaryThreshold || ""}
              onChange={(e) => onChange({ ...settings, summaryThreshold: parseInt(e.target.value) || 10 })}
            />
            <p className="text-xs text-muted-foreground">
              Summarize conversation after this many messages
            </p>
          </div>
        </>
      )}

      {/* Session ID */}
      <div className="space-y-2">
        <Label>Session ID (optional)</Label>
        <Input
          placeholder="auto-generated"
          value={settings.sessionId || ""}
          onChange={(e) => onChange({ ...settings, sessionId: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Use variables like {"{{userId}}"} for per-user memory
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Tool Configuration - REUSES existing node configs for full feature parity
// ============================================================================

function ToolConfig({ 
  config, 
  index,
  onChange, 
  onBack 
}: { 
  config: SubNodeConfig;
  index: number;
  onChange: (settings: Record<string, any>) => void;
  onBack: () => void;
}) {
  const settings = config.settings || {};

  // Map tool types to their corresponding node config components
  const toolTypeToNodeType: Record<string, string> = {
    httpRequestTool: "httpRequest",
    postgresTool: "postgres",
    gmailTool: "gmail",
    googleSheetsTool: "googleSheets",
    slackTool: "slack",
  };

  // Wrapper to convert onChange format
  const handleConfigChange = (updates: Record<string, unknown>) => {
    onChange({ ...settings, ...updates });
  };

  // Get the node type for this tool
  const nodeType = toolTypeToNodeType[config.type];

  // Check if we should use the real config component
  const useRealConfig = ["httpRequestTool", "postgresTool", "gmailTool"].includes(config.type);

  return (
    <div className="space-y-6">
      {/* Back button - always show */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to AI Agent
      </Button>

      {/* Header with tool info */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-[#a78bfa]/20 flex items-center justify-center">
          <Image src={config.icon} alt="" width={24} height={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{config.label}</h3>
          <p className="text-xs text-muted-foreground">Tool #{index + 1} for AI Agent</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">Tool</Badge>
      </div>

      {/* Tool Description (for LLM) - always show this */}
      <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <Label className="text-purple-400">Tool Description (for AI)</Label>
        <Textarea
          placeholder="Describe what this tool does so the AI knows when to use it..."
          value={settings.toolDescription || ""}
          onChange={(e) => onChange({ ...settings, toolDescription: e.target.value })}
          rows={2}
          className="bg-background/50"
        />
        <p className="text-[10px] text-muted-foreground">
          The AI agent reads this to decide when to invoke this tool
        </p>
      </div>

      {/* Use REAL config components for supported tools */}
      {config.type === "gmailTool" && (
        <GmailConfig 
          data={settings} 
          onChange={handleConfigChange} 
        />
      )}

      {config.type === "httpRequestTool" && (
        <HttpRequestConfig 
          data={settings} 
          onChange={handleConfigChange} 
        />
      )}

      {config.type === "postgresTool" && (
        <PostgresConfig 
          data={settings} 
          onChange={handleConfigChange} 
        />
      )}

      {/* Fallback for tools without real config components */}
      {config.type === "slackTool" && (
        <SlackToolSettings settings={settings} onChange={onChange} />
      )}

      {config.type === "googleSheetsTool" && (
        <GoogleSheetsToolSettings settings={settings} onChange={onChange} />
      )}

      {config.type === "customTool" && (
        <CustomToolSettings settings={settings} onChange={onChange} />
      )}
    </div>
  );
}

// ============================================================================
// Tool-Specific Settings Components
// ============================================================================

function HTTPRequestToolSettings({ settings, onChange }: { settings: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs">
        <p className="font-medium text-amber-600">⚡ HTTP Request Tool</p>
        <p className="text-muted-foreground mt-1">
          Allows the AI agent to make HTTP requests to external APIs.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Base URL (optional)</Label>
        <Input
          placeholder="https://api.example.com"
          value={settings.baseUrl || ""}
          onChange={(e) => onChange({ ...settings, baseUrl: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          If set, all requests will be relative to this URL
        </p>
      </div>

      <div className="space-y-2">
        <Label>Default Headers (JSON)</Label>
        <Textarea
          placeholder={'{\n  "Authorization": "Bearer {{apiKey}}"\n}'}
          value={settings.defaultHeaders || ""}
          onChange={(e) => onChange({ ...settings, defaultHeaders: e.target.value })}
          rows={3}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label>Allowed Methods</Label>
        <div className="flex flex-wrap gap-2">
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => {
            const allowedMethods = settings.allowedMethods || ["GET", "POST"];
            const isAllowed = allowedMethods.includes(method);
            return (
              <Badge
                key={method}
                variant={isAllowed ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const newMethods = isAllowed
                    ? allowedMethods.filter((m: string) => m !== method)
                    : [...allowedMethods, method];
                  onChange({ ...settings, allowedMethods: newMethods });
                }}
              >
                {method}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeout (seconds)</Label>
        <Input
          type="number"
          min={1}
          max={300}
          placeholder="30"
          value={settings.timeout || ""}
          onChange={(e) => onChange({ ...settings, timeout: parseInt(e.target.value) || 30 })}
        />
      </div>
    </>
  );
}

function PostgresToolSettings({ settings, onChange }: { settings: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
        <p className="font-medium text-blue-600">🗄️ PostgreSQL Tool</p>
        <p className="text-muted-foreground mt-1">
          Allows the AI agent to query your PostgreSQL database.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Connection String</Label>
        <Input
          type="password"
          placeholder="postgresql://user:pass@host:5432/db"
          value={settings.connectionString || ""}
          onChange={(e) => onChange({ ...settings, connectionString: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Or use POSTGRES_URL env var</p>
      </div>

      <div className="space-y-2">
        <Label>Allowed Tables (comma-separated)</Label>
        <Input
          placeholder="users, orders, products"
          value={settings.allowedTables || ""}
          onChange={(e) => onChange({ ...settings, allowedTables: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Restrict which tables the AI can query (security)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Read Only</Label>
        <Select
          value={settings.readOnly ? "true" : "false"}
          onValueChange={(v) => onChange({ ...settings, readOnly: v === "true" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes (SELECT only)</SelectItem>
            <SelectItem value="false">No (Allow INSERT/UPDATE/DELETE)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function GmailToolSettings({ settings, onChange }: { settings: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs">
        <p className="font-medium text-red-600">📧 Gmail Tool</p>
        <p className="text-muted-foreground mt-1">
          Allows the AI agent to send emails via Gmail.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Operations</Label>
        <div className="flex flex-wrap gap-2">
          {["send", "read", "list"].map((op) => {
            const allowedOps = settings.allowedOperations || ["send"];
            const isAllowed = allowedOps.includes(op);
            return (
              <Badge
                key={op}
                variant={isAllowed ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => {
                  const newOps = isAllowed
                    ? allowedOps.filter((o: string) => o !== op)
                    : [...allowedOps, op];
                  onChange({ ...settings, allowedOperations: newOps });
                }}
              >
                {op}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Default From Name</Label>
        <Input
          placeholder="My AI Assistant"
          value={settings.fromName || ""}
          onChange={(e) => onChange({ ...settings, fromName: e.target.value })}
        />
      </div>
    </>
  );
}

function SlackToolSettings({ settings, onChange }: { settings: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-xs">
        <p className="font-medium text-purple-600">💬 Slack Tool</p>
        <p className="text-muted-foreground mt-1">
          Allows the AI agent to send messages to Slack.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Bot Token</Label>
        <Input
          type="password"
          placeholder="xoxb-..."
          value={settings.botToken || ""}
          onChange={(e) => onChange({ ...settings, botToken: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Or use SLACK_BOT_TOKEN env var</p>
      </div>

      <div className="space-y-2">
        <Label>Default Channel</Label>
        <Input
          placeholder="#general"
          value={settings.defaultChannel || ""}
          onChange={(e) => onChange({ ...settings, defaultChannel: e.target.value })}
        />
      </div>
    </>
  );
}

function GoogleSheetsToolSettings({ settings, onChange }: { settings: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs">
        <p className="font-medium text-green-600">📊 Google Sheets Tool</p>
        <p className="text-muted-foreground mt-1">
          Allows the AI agent to read/write Google Sheets.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Spreadsheet ID</Label>
        <Input
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          value={settings.spreadsheetId || ""}
          onChange={(e) => onChange({ ...settings, spreadsheetId: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Found in the spreadsheet URL
        </p>
      </div>

      <div className="space-y-2">
        <Label>Default Sheet</Label>
        <Input
          placeholder="Sheet1"
          value={settings.defaultSheet || ""}
          onChange={(e) => onChange({ ...settings, defaultSheet: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Operations</Label>
        <div className="flex flex-wrap gap-2">
          {["read", "append", "update"].map((op) => {
            const allowedOps = settings.allowedOperations || ["read"];
            const isAllowed = allowedOps.includes(op);
            return (
              <Badge
                key={op}
                variant={isAllowed ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => {
                  const newOps = isAllowed
                    ? allowedOps.filter((o: string) => o !== op)
                    : [...allowedOps, op];
                  onChange({ ...settings, allowedOperations: newOps });
                }}
              >
                {op}
              </Badge>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CustomToolSettings({ settings, onChange }: { settings: Record<string, any>; onChange: (s: Record<string, any>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-gray-500/10 border border-gray-500/20 p-3 text-xs">
        <p className="font-medium text-gray-400">🔧 Custom Tool</p>
        <p className="text-muted-foreground mt-1">
          Define a custom tool with your own parameters.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tool Name</Label>
        <Input
          placeholder="my_custom_tool"
          value={settings.name || ""}
          onChange={(e) => onChange({ ...settings, name: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Lowercase with underscores (e.g., get_weather)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Parameters (JSON Schema)</Label>
        <Textarea
          placeholder={'{\n  "location": {\n    "type": "string",\n    "description": "City name"\n  }\n}'}
          value={settings.parameters || ""}
          onChange={(e) => onChange({ ...settings, parameters: e.target.value })}
          rows={5}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label>Webhook URL (for execution)</Label>
        <Input
          placeholder="https://your-api.com/tool-handler"
          value={settings.webhookUrl || ""}
          onChange={(e) => onChange({ ...settings, webhookUrl: e.target.value })}
        />
      </div>
    </>
  );
}
