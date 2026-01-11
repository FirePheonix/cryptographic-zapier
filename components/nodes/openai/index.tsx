/**
 * OpenAI Chat Node Component
 * 
 * PURELY DECLARATIVE - No API logic here.
 * This component only renders the UI based on the node schema.
 * All execution happens in the engine (lib/engine/adapters/openai.ts).
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { BrainCircuitIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NodeLayout } from "../layout";
import { openaiChatSchema } from "@/lib/engine/node-schemas";

// Extract schema information
const MODELS = openaiChatSchema.inputs
  .find(i => i.key === "model")
  ?.options || [];

export type OpenAINodeData = {
  model?: string;
  prompt?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
};

type OpenAINodeProps = NodeProps & {
  data: OpenAINodeData;
};

export const OpenAINode = ({ id, data, type }: OpenAINodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (field: keyof OpenAINodeData, value: string | number) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title={openaiChatSchema.name}>
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-primary">
          <BrainCircuitIcon className="h-5 w-5" />
          <span className="font-semibold">{openaiChatSchema.name}</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-model`}>Model</Label>
            <Select
              value={data.model || "gpt-4o-mini"}
              onValueChange={(value) => handleChange("model", value)}
            >
              <SelectTrigger id={`${id}-model`}>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-system`}>System Prompt (Optional)</Label>
            <Textarea
              id={`${id}-system`}
              placeholder="You are a helpful assistant..."
              value={data.systemPrompt || ""}
              onChange={(e) => handleChange("systemPrompt", e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-prompt`}>Prompt</Label>
            <Textarea
              id={`${id}-prompt`}
              placeholder="Summarize this: {{previous.output}}"
              value={data.prompt || ""}
              onChange={(e) => handleChange("prompt", e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-max-tokens`}>Max Tokens</Label>
              <Input
                id={`${id}-max-tokens`}
                type="number"
                placeholder="1000"
                value={data.maxTokens || ""}
                onChange={(e) =>
                  handleChange("maxTokens", Number.parseInt(e.target.value) || 1000)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-temperature`}>Temperature</Label>
              <Input
                id={`${id}-temperature`}
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                value={data.temperature ?? ""}
                onChange={(e) =>
                  handleChange("temperature", Number.parseFloat(e.target.value) || 0.7)
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs">
          <p className="font-medium mb-1">Variable Interpolation:</p>
          <p className="text-muted-foreground font-mono">
            {"{{previous.output}}"} - Output from previous node
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{trigger.fieldName}}"} - Field from trigger payload
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{nodes.nodeId.field}}"} - Output from specific node
          </p>
        </div>
        
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs">
          <p className="font-medium text-emerald-600 mb-1">Output Fields:</p>
          {openaiChatSchema.outputs.map(output => (
            <p key={output.key} className="text-muted-foreground">
              <span className="font-mono text-emerald-600">{output.key}</span> - {output.label}
            </p>
          ))}
        </div>
      </div>
    </NodeLayout>
  );
};


