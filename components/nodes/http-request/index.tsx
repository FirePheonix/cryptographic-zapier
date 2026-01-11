/**
 * HTTP Request Node Component
 * 
 * PURELY DECLARATIVE - No API logic here.
 * This component only renders the UI based on the node schema.
 * All execution happens in the engine (lib/engine/adapters/webhook.ts).
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
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
import { httpRequestSchema } from "@/lib/engine/node-schemas";

// Extract options from schema
const METHODS = httpRequestSchema.inputs.find(i => i.key === "method")?.options || [];

export type HttpRequestNodeData = {
  url?: string;
  method?: string;
  headers?: string;
  body?: string;
  timeout?: number;
};

type HttpRequestNodeProps = NodeProps & {
  data: HttpRequestNodeData;
};

export const HttpRequestNode = ({ id, data, type }: HttpRequestNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const method = data.method || "GET";

  const handleChange = (field: keyof HttpRequestNodeData, value: string | number) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title={httpRequestSchema.name}>
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-blue-600">
          <GlobeIcon className="h-5 w-5" />
          <span className="font-semibold">{httpRequestSchema.name}</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-method`}>Method</Label>
            <Select
              value={method}
              onValueChange={(value) => handleChange("method", value)}
            >
              <SelectTrigger id={`${id}-method`}>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="font-mono">{m.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-url`}>URL</Label>
            <Input
              id={`${id}-url`}
              placeholder="https://api.example.com/endpoint"
              value={data.url || ""}
              onChange={(e) => handleChange("url", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Supports variables: {"{{previous.output}}"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-headers`}>Headers (JSON)</Label>
            <Textarea
              id={`${id}-headers`}
              placeholder='{"Authorization": "Bearer {{trigger.token}}", "Content-Type": "application/json"}'
              value={data.headers || ""}
              onChange={(e) => handleChange("headers", e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
          </div>

          {/* Body only shown for methods that support it */}
          {(method === "POST" || method === "PUT" || method === "PATCH") && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-body`}>Request Body (JSON)</Label>
              <Textarea
                id={`${id}-body`}
                placeholder='{"name": "{{trigger.name}}", "data": "{{previous.output}}"}'
                value={data.body || ""}
                onChange={(e) => handleChange("body", e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-timeout`}>Timeout (ms)</Label>
            <Input
              id={`${id}-timeout`}
              type="number"
              placeholder="30000"
              value={data.timeout || ""}
              onChange={(e) => handleChange("timeout", Number.parseInt(e.target.value) || 30000)}
            />
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
        </div>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
          <p className="font-medium text-blue-600 mb-1">Output Fields:</p>
          {httpRequestSchema.outputs.map(output => (
            <p key={output.key} className="text-muted-foreground">
              <span className="font-mono text-blue-600">{output.key}</span> - {output.label}
            </p>
          ))}
        </div>
      </div>
    </NodeLayout>
  );
};


