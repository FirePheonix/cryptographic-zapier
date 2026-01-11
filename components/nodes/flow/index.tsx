/**
 * Flow Node Component
 * 
 * A unified control-flow node that can transform into:
 * - Iterator: Splits array into multiple bundles (1 → N)
 * - Aggregator: Combines bundles into one (N → 1)
 * - Router: Duplicates bundles into conditional paths
 * - Filter: Allows/blocks bundles based on rules
 * 
 * DECLARATIVE - No execution logic here.
 * All execution happens in lib/engine/adapters/flow.ts
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import {
  SplitIcon,
  MergeIcon,
  GitBranchIcon,
  FilterIcon,
  WorkflowIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  Loader2Icon,
} from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { NodeLayout } from "../layout";
import { useNodeOutputs } from "@/providers/node-outputs";

// Flow modes
const FLOW_MODES = [
  {
    value: "iterator",
    label: "Iterator (Start)",
    description: "Split array into multiple bundles (1 → N)",
    icon: SplitIcon,
  },
  {
    value: "endIterator",
    label: "Iterator (End)",
    description: "Marks end of iteration loop",
    icon: MergeIcon,
  },
  {
    value: "aggregator",
    label: "Aggregator",
    description: "Combine bundles into one (N → 1)",
    icon: MergeIcon,
  },
  {
    value: "router",
    label: "Router",
    description: "Route to different paths based on conditions",
    icon: GitBranchIcon,
  },
  {
    value: "filter",
    label: "Filter",
    description: "Allow or block based on rules",
    icon: FilterIcon,
  },
] as const;

// Aggregation modes
const AGGREGATION_MODES = [
  { value: "array", label: "Collect as Array" },
  { value: "first", label: "First Item Only" },
  { value: "last", label: "Last Item Only" },
  { value: "concat", label: "Concatenate Strings" },
  { value: "sum", label: "Sum Numbers" },
  { value: "count", label: "Count Items" },
  { value: "custom", label: "Custom Expression" },
];

// Filter operators
const FILTER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Not Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater Than or Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less Than or Equal" },
  { value: "exists", label: "Exists" },
  { value: "notExists", label: "Not Exists" },
  { value: "isEmpty", label: "Is Empty" },
  { value: "isNotEmpty", label: "Is Not Empty" },
  { value: "regex", label: "Matches Regex" },
];

export type RouterCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
  targetPath: string; // Which output handle to route to
};

export type FlowNodeData = {
  // Common
  mode?: "iterator" | "endIterator" | "aggregator" | "router" | "filter";
  
  // Iterator mode
  arrayPath?: string; // Path to array (e.g., "data.items" or "{{previous.items}}")
  itemVariable?: string; // Name for current item (default: "item")
  indexVariable?: string; // Name for current index (default: "index")
  
  // End Iterator mode
  collectResults?: boolean; // Whether to collect all iteration results
  
  // Aggregator mode
  aggregationMode?: string;
  groupByField?: string; // Optional grouping
  targetField?: string; // Field to aggregate
  customExpression?: string; // For custom aggregation
  maxItems?: number; // Max items to collect
  
  // Router mode
  conditions?: RouterCondition[];
  defaultPath?: string; // Path when no conditions match
  
  // Filter mode
  filterField?: string;
  filterOperator?: string;
  filterValue?: string;
  filterLogic?: "and" | "or"; // For multiple conditions
  passThrough?: boolean; // Pass original or filtered
};

type FlowNodeProps = NodeProps & {
  data: FlowNodeData;
};

const ModeIcon = ({ mode }: { mode?: string }) => {
  switch (mode) {
    case "iterator":
      return <SplitIcon className="h-4 w-4" />;
    case "endIterator":
      return <MergeIcon className="h-4 w-4" />;
    case "aggregator":
      return <MergeIcon className="h-4 w-4" />;
    case "router":
      return <GitBranchIcon className="h-4 w-4" />;
    case "filter":
      return <FilterIcon className="h-4 w-4" />;
    default:
      return <WorkflowIcon className="h-4 w-4" />;
  }
};

export const FlowNode = ({ id, data, type }: FlowNodeProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const { outputs, addOutput } = useNodeOutputs();
  const [isTestingIteration, setIsTestingIteration] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const mode = data.mode || "iterator";

  const handleChange = (field: keyof FlowNodeData, value: unknown) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  const handleTestIteration = async () => {
    setIsTestingIteration(true);
    setTestResult(null);
    
    try {
      const allNodes = getNodes();
      const allEdges = getEdges();
      
      const response = await fetch("/api/workflows/test-iteration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iteratorNodeId: id,
          iteratorNodeData: data,
          nodes: allNodes.map(n => ({
            id: n.id,
            type: n.type,
            data: n.data,
          })),
          edges: allEdges.map(e => ({
            source: e.source,
            target: e.target,
          })),
          nodeOutputs: outputs.map(o => ({
            nodeId: o.nodeId,
            output: o.output,
          })),
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
      setShowResult(true);
      
      if (result.iteratorOutput) {
        addOutput(id, "flow", result.iteratorOutput);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Iteration test failed",
      });
      setShowResult(true);
    } finally {
      setIsTestingIteration(false);
    }
  };

  const handleConditionChange = (
    conditionId: string,
    field: keyof RouterCondition,
    value: string
  ) => {
    const conditions = data.conditions || [];
    const updated = conditions.map((c) =>
      c.id === conditionId ? { ...c, [field]: value } : c
    );
    updateNodeData(id, { ...data, conditions: updated });
  };

  const addCondition = () => {
    const conditions = data.conditions || [];
    const newCondition: RouterCondition = {
      id: crypto.randomUUID(),
      field: "",
      operator: "equals",
      value: "",
      targetPath: `path_${conditions.length + 1}`,
    };
    updateNodeData(id, { ...data, conditions: [...conditions, newCondition] });
  };

  const removeCondition = (conditionId: string) => {
    const conditions = data.conditions || [];
    updateNodeData(id, {
      ...data,
      conditions: conditions.filter((c) => c.id !== conditionId),
    });
  };

  const modeInfo = FLOW_MODES.find((m) => m.value === mode);

  return (
    <NodeLayout id={id} data={data} type="flow" title="Flow Control">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        {/* Header */}
        <div className="flex items-center gap-2 text-blue-600">
          <ModeIcon mode={mode} />
          <span className="font-semibold">Flow Control</span>
        </div>

        {/* Mode Selection */}
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-mode`}>Mode</Label>
          <Select
            value={mode}
            onValueChange={(value) => handleChange("mode", value)}
          >
            <SelectTrigger id={`${id}-mode`}>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {FLOW_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex items-center gap-2">
                    <m.icon className="h-4 w-4" />
                    <span>{m.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {modeInfo && (
            <p className="text-muted-foreground text-xs">
              {modeInfo.description}
            </p>
          )}
        </div>

        {/* Iterator Mode */}
        {mode === "iterator" && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-arrayPath`}>Array Path</Label>
              <Input
                id={`${id}-arrayPath`}
                placeholder="{{previous.items}} or data.results"
                value={data.arrayPath || ""}
                onChange={(e) => handleChange("arrayPath", e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Path to the array to iterate over
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-itemVariable`}>Item Variable Name</Label>
              <Input
                id={`${id}-itemVariable`}
                placeholder="item"
                value={data.itemVariable || ""}
                onChange={(e) => handleChange("itemVariable", e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Access as {"{{flow.item}}"} in downstream nodes
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-indexVariable`}>Index Variable Name</Label>
              <Input
                id={`${id}-indexVariable`}
                placeholder="index"
                value={data.indexVariable || ""}
                onChange={(e) => handleChange("indexVariable", e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Access as {"{{flow.index}}"} in downstream nodes
              </p>
            </div>
            
            <div className="mt-3 rounded-md bg-blue-500/10 p-3 text-xs text-blue-400">
              <strong>Tip:</strong> Add an "Iterator (End)" node after the nodes you want to loop.
              All nodes between Iterator Start and End will execute for each item.
            </div>

            {/* Test Iteration Button */}
            <Button
              onClick={handleTestIteration}
              disabled={isTestingIteration}
              className="w-full mt-2"
              variant="outline"
            >
              {isTestingIteration ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Running Iteration...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Test Iteration
                </>
              )}
            </Button>

            {/* Test Result */}
            {testResult && showResult && (
              <div className={`mt-3 rounded-md p-3 text-xs ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                <div className="flex items-center justify-between mb-2">
                  <strong>{testResult.success ? '✓ Success' : '✗ Error'}</strong>
                  <button 
                    onClick={() => setShowResult(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                {testResult.error && (
                  <p className="mb-2">{testResult.error}</p>
                )}
                {testResult.totalBundles !== undefined && (
                  <p>Processed {testResult.totalBundles} bundles</p>
                )}
                {testResult.iterationResults && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">View details</summary>
                    <pre className="mt-2 p-2 bg-black/50 rounded text-[10px] overflow-x-auto max-h-40">
                      {JSON.stringify(testResult.iterationResults, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* End Iterator Mode */}
        {mode === "endIterator" && (
          <div className="space-y-3 border-t pt-3">
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-400">
              <strong>Iterator End</strong>
              <p className="mt-1 text-xs opacity-80">
                This marks the end of the iteration loop. All nodes between 
                "Iterator (Start)" and this node will execute once per bundle.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.collectResults ?? true}
                  onChange={(e) => handleChange("collectResults", e.target.checked)}
                  className="rounded"
                />
                Collect all results as array
              </Label>
              <p className="text-muted-foreground text-xs">
                If enabled, outputs an array of all iteration results
              </p>
            </div>
          </div>
        )}

        {/* Aggregator Mode */}
        {mode === "aggregator" && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-aggregationMode`}>Aggregation Type</Label>
              <Select
                value={data.aggregationMode || "array"}
                onValueChange={(value) => handleChange("aggregationMode", value)}
              >
                <SelectTrigger id={`${id}-aggregationMode`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATION_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-targetField`}>Target Field</Label>
              <Input
                id={`${id}-targetField`}
                placeholder="{{previous.output}} or leave empty for whole bundle"
                value={data.targetField || ""}
                onChange={(e) => handleChange("targetField", e.target.value)}
              />
            </div>

            {data.aggregationMode === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-customExpression`}>
                  Custom Expression
                </Label>
                <Textarea
                  id={`${id}-customExpression`}
                  placeholder="items.reduce((a, b) => a + b.value, 0)"
                  value={data.customExpression || ""}
                  onChange={(e) =>
                    handleChange("customExpression", e.target.value)
                  }
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-maxItems`}>Max Items (Optional)</Label>
              <Input
                id={`${id}-maxItems`}
                type="number"
                placeholder="No limit"
                value={data.maxItems || ""}
                onChange={(e) =>
                  handleChange("maxItems", Number(e.target.value) || undefined)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-groupByField`}>Group By (Optional)</Label>
              <Input
                id={`${id}-groupByField`}
                placeholder="category"
                value={data.groupByField || ""}
                onChange={(e) => handleChange("groupByField", e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Group items by a field before aggregating
              </p>
            </div>
          </div>
        )}

        {/* Router Mode */}
        {mode === "router" && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>Conditions</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addCondition}
                className="h-7 text-xs"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Add Route
              </Button>
            </div>

            {(data.conditions || []).map((condition, index) => (
              <div
                key={condition.id}
                className="space-y-2 rounded-md border p-3 bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    Route {index + 1}: {condition.targetPath || "unnamed"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeCondition(condition.id)}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>

                <Input
                  placeholder="Field path (e.g., status)"
                  value={condition.field}
                  onChange={(e) =>
                    handleConditionChange(condition.id, "field", e.target.value)
                  }
                />

                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    handleConditionChange(condition.id, "operator", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) =>
                    handleConditionChange(condition.id, "value", e.target.value)
                  }
                />

                <Input
                  placeholder="Output path name"
                  value={condition.targetPath}
                  onChange={(e) =>
                    handleConditionChange(
                      condition.id,
                      "targetPath",
                      e.target.value
                    )
                  }
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-defaultPath`}>Default Path</Label>
              <Input
                id={`${id}-defaultPath`}
                placeholder="default"
                value={data.defaultPath || ""}
                onChange={(e) => handleChange("defaultPath", e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Path when no conditions match
              </p>
            </div>
          </div>
        )}

        {/* Filter Mode */}
        {mode === "filter" && (
          <div className="space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-filterField`}>Field</Label>
              <Input
                id={`${id}-filterField`}
                placeholder="{{previous.status}} or status"
                value={data.filterField || ""}
                onChange={(e) => handleChange("filterField", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-filterOperator`}>Condition</Label>
              <Select
                value={data.filterOperator || "equals"}
                onValueChange={(value) => handleChange("filterOperator", value)}
              >
                <SelectTrigger id={`${id}-filterOperator`}>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${id}-filterValue`}>Value</Label>
              <Input
                id={`${id}-filterValue`}
                placeholder="success"
                value={data.filterValue || ""}
                onChange={(e) => handleChange("filterValue", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.passThrough ?? true}
                  onChange={(e) =>
                    handleChange("passThrough", e.target.checked)
                  }
                  className="rounded"
                />
                Pass through original data when matched
              </Label>
            </div>
          </div>
        )}
      </div>
    </NodeLayout>
  );
};

export default FlowNode;


