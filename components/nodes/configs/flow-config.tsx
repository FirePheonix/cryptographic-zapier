/**
 * Flow Control Node Configuration
 * 
 * For iterator, aggregator, router, and filter operations.
 */

"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch, Filter, Layers, Split } from "lucide-react";

const FLOW_MODES = [
  { value: "iterator", label: "Iterator", description: "Loop through array items", icon: Layers },
  { value: "endIterator", label: "End Iterator", description: "End loop and collect results", icon: Layers },
  { value: "aggregator", label: "Aggregator", description: "Collect results into array", icon: Layers },
  { value: "router", label: "Router", description: "Route to different paths", icon: Split },
  { value: "filter", label: "Filter", description: "Filter items by condition", icon: Filter },
];

interface FlowConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

export function FlowConfig({ data, onChange, inputData }: FlowConfigProps) {
  const mode = (data.mode as string) || "iterator";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        <h3 className="font-medium">Flow Control</h3>
      </div>
      
      {/* Mode Selection */}
      <div className="space-y-2">
        <Label htmlFor="mode">Mode</Label>
        <Select
          value={mode}
          onValueChange={(value) => onChange({ mode: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {FLOW_MODES.map((m) => {
              const Icon = m.icon;
              return (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3 w-3" />
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
      {/* Info Box */}
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <h4 className="text-sm font-medium">How it works</h4>
        <p className="text-xs text-muted-foreground">
          {mode === "iterator" && "Processes each item in an array through downstream nodes. Each item flows through the entire branch before processing the next."}
          {mode === "endIterator" && "Marks the end of an iterator loop. Collects all results from the loop iterations and passes them as an array to the next node."}
          {mode === "aggregator" && "Collects all outputs from an iterator branch and combines them into a single array for the next node."}
          {mode === "router" && "Routes execution to different branches based on conditions. Use to create conditional workflows."}
          {mode === "filter" && "Filters items from an array based on a condition. Only matching items proceed to the next node."}
        </p>
      </div>
    </div>
  );
}


