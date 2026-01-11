/**
 * OpenAI Node Configuration
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
import { Info } from "lucide-react";
import { DroppableInput, DroppableTextarea } from "../droppable-input";

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", description: "Most capable, multimodal" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast and affordable" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "High intelligence" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "Fast, good for most tasks" },
];

const OPERATIONS = [
  { value: "chat", label: "Chat / Complete", description: "Generate text responses" },
  { value: "analyze", label: "Analyze Data", description: "Parse and analyze input data" },
  { value: "summarize", label: "Summarize", description: "Create summaries" },
  { value: "extract", label: "Extract Information", description: "Extract specific fields" },
];

interface OpenAIConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

// Debounce hook for text inputs
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

export function OpenAIConfig({ data, onChange, inputData }: OpenAIConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Local state for text inputs (for smooth typing)
  const [localSystemPrompt, setLocalSystemPrompt] = useState((data.systemPrompt as string) || "");
  const [localPrompt, setLocalPrompt] = useState((data.prompt as string) || "");
  
  // Sync local state when data changes from external source
  useEffect(() => {
    setLocalSystemPrompt((data.systemPrompt as string) || "");
  }, [data.systemPrompt]);
  
  useEffect(() => {
    setLocalPrompt((data.prompt as string) || "");
  }, [data.prompt]);
  
  // Debounced onChange for text inputs (300ms delay)
  const debouncedOnChange = useDebouncedCallback(onChange, 300);

  const operation = (data.operation as string) || "chat";
  const model = (data.model as string) || "gpt-4o-mini";
  const temperature = (data.temperature as number) ?? 0.7;
  const maxTokens = (data.maxTokens as number) ?? 1000;

  return (
    <div className="space-y-6">
      {/* Operation */}
      <div className="space-y-2">
        <Label>Operation</Label>
        <Select
          value={operation}
          onValueChange={(value) => onChange({ operation: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            {OPERATIONS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                <div className="flex flex-col">
                  <span>{op.label}</span>
                  <span className="text-xs text-muted-foreground">{op.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model */}
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
            {MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <div className="flex items-center gap-2">
                  <span>{m.label}</span>
                  <span className="text-xs text-muted-foreground">- {m.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label>System Prompt</Label>
        <DroppableTextarea
          placeholder="You are a helpful assistant that..."
          value={localSystemPrompt}
          onValueChange={(value) => {
            setLocalSystemPrompt(value);
            debouncedOnChange({ systemPrompt: value });
          }}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Sets the behavior and context for the AI
        </p>
      </div>

      {/* User Prompt */}
      <div className="space-y-2">
        <Label>
          User Prompt
          <Badge variant="secondary" className="ml-2 text-xs">
            Supports variables
          </Badge>
        </Label>
        <DroppableTextarea
          placeholder="Analyze this transaction: {{input.amount}} {{input.from}}"
          value={localPrompt}
          onValueChange={(value) => {
            setLocalPrompt(value);
            debouncedOnChange({ prompt: value });
          }}
          rows={4}
          className="font-mono text-sm"
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5" />
          <span>
            Drag fields from INPUT panel or use <code className="bg-muted px-1 rounded">{"{{input.fieldName}}"}</code> syntax
          </span>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? "Hide" : "Show"} advanced settings
      </button>

      {showAdvanced && (
        <div className="space-y-6 border-t pt-4">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex justify-between">
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
              Higher = more creative, Lower = more focused
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 1000 })}
              min={1}
              max={4096}
            />
            <p className="text-xs text-muted-foreground">
              Maximum length of the response
            </p>
          </div>

          {/* JSON Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label>JSON Mode</Label>
              <p className="text-xs text-muted-foreground">
                Force output to be valid JSON
              </p>
            </div>
            <input
              type="checkbox"
              checked={(data.jsonMode as boolean) || false}
              onChange={(e) => onChange({ jsonMode: e.target.checked })}
              className="h-4 w-4"
            />
          </div>
        </div>
      )}

      {/* Output Fields Info */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-2">Output Fields</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">response</code>
            <span>AI generated text</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">model</code>
            <span>Model used</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">tokens</code>
            <span>Tokens used</span>
          </div>
        </div>
      </div>
    </div>
  );
}


