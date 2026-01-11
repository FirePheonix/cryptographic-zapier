/**
 * Transform Node Component
 * 
 * PURELY DECLARATIVE - No API logic here.
 * This component only renders the UI based on the node schema.
 * All execution happens in the engine (lib/engine/adapters/transform.ts).
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { WrenchIcon, CodeIcon, TypeIcon, FilterIcon, ListIcon } from "lucide-react";
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
import { transformSchema } from "@/lib/engine/node-schemas";

// Operations from schema
const OPERATIONS = transformSchema.operations || [];

export type TransformNodeData = {
  operation?: string;
  input?: string;
  template?: string;
  filterPath?: string;
  filterValue?: string;
  mapExpression?: string;
};

type TransformNodeProps = NodeProps & {
  data: TransformNodeData;
};

const OperationIcon = ({ operation }: { operation?: string }) => {
  switch (operation) {
    case "transform.jsonParse":
    case "transform.jsonStringify":
      return <CodeIcon className="h-4 w-4" />;
    case "transform.textTemplate":
      return <TypeIcon className="h-4 w-4" />;
    case "transform.arrayFilter":
      return <FilterIcon className="h-4 w-4" />;
    case "transform.arrayMap":
      return <ListIcon className="h-4 w-4" />;
    default:
      return <WrenchIcon className="h-4 w-4" />;
  }
};

export const TransformNode = ({ id, data, type }: TransformNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const operation = data.operation || "transform.jsonParse";

  const handleChange = (field: keyof TransformNodeData, value: string) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title={transformSchema.name}>
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-purple-600">
          <WrenchIcon className="h-5 w-5" />
          <span className="font-semibold">{transformSchema.name}</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-operation`}>Operation</Label>
            <Select
              value={operation}
              onValueChange={(value) => handleChange("operation", value)}
            >
              <SelectTrigger id={`${id}-operation`}>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    <div className="flex items-center gap-2">
                      <OperationIcon operation={op.id} />
                      <span>{op.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* JSON Parse/Stringify input */}
          {(operation === "transform.jsonParse" || operation === "transform.jsonStringify") && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-input`}>Input</Label>
              <Textarea
                id={`${id}-input`}
                placeholder={
                  operation === "transform.jsonParse"
                    ? '{"key": "value"} or {{previous.output}}'
                    : "{{previous.output}}"
                }
                value={data.input || ""}
                onChange={(e) => handleChange("input", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {operation === "transform.jsonParse" 
                  ? "JSON string to parse into an object"
                  : "Object to convert to JSON string"
                }
              </p>
            </div>
          )}

          {/* Text Template */}
          {operation === "transform.textTemplate" && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-template`}>Template</Label>
              <Textarea
                id={`${id}-template`}
                placeholder="Hello {{trigger.name}}, your result is: {{previous.output}}"
                value={data.template || ""}
                onChange={(e) => handleChange("template", e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Text template with variable placeholders
              </p>
            </div>
          )}

          {/* Array Filter */}
          {operation === "transform.arrayFilter" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-input`}>Array Input</Label>
                <Input
                  id={`${id}-input`}
                  placeholder="{{previous.output}}"
                  value={data.input || ""}
                  onChange={(e) => handleChange("input", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-filterPath`}>Filter Path</Label>
                <Input
                  id={`${id}-filterPath`}
                  placeholder="status"
                  value={data.filterPath || ""}
                  onChange={(e) => handleChange("filterPath", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Path to the property to filter by (e.g., "status" or "user.active")
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-filterValue`}>Filter Value</Label>
                <Input
                  id={`${id}-filterValue`}
                  placeholder="active"
                  value={data.filterValue || ""}
                  onChange={(e) => handleChange("filterValue", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Value to match (items with matching value are kept)
                </p>
              </div>
            </>
          )}

          {/* Array Map */}
          {operation === "transform.arrayMap" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-input`}>Array Input</Label>
                <Input
                  id={`${id}-input`}
                  placeholder="{{previous.output}}"
                  value={data.input || ""}
                  onChange={(e) => handleChange("input", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-mapExpression`}>Map Expression</Label>
                <Input
                  id={`${id}-mapExpression`}
                  placeholder="item.name"
                  value={data.mapExpression || ""}
                  onChange={(e) => handleChange("mapExpression", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Property path to extract from each item (e.g., "email" or "user.name")
                </p>
              </div>
            </>
          )}
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

        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-xs">
          <p className="font-medium text-purple-600 mb-1">Output:</p>
          <p className="text-muted-foreground">
            Transformed data available as <span className="font-mono text-purple-600">output</span>
          </p>
        </div>
      </div>
    </NodeLayout>
  );
};


