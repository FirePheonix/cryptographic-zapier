/**
 * Node Output Panel
 * 
 * Shows execution results from previously run nodes.
 * Allows users to easily reference data in subsequent nodes.
 */

"use client";

import { useState } from "react";
import { 
  ChevronRightIcon, 
  ChevronDownIcon, 
  CopyIcon,
  CheckIcon,
  DatabaseIcon,
  XIcon
} from "lucide-react";
import { Panel } from "@xyflow/react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

type NodeOutput = {
  nodeId: string;
  nodeType: string;
  timestamp: string;
  output: unknown;
};

type NodeOutputPanelProps = {
  outputs: NodeOutput[];
  onClose?: () => void;
};

export const NodeOutputPanel = ({ outputs, onClose }: NodeOutputPanelProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const renderValue = (value: unknown, path: string, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return (
        <div className="flex items-center gap-2 group">
          <span className="text-sm font-mono">{String(value)}</span>
          <button
            onClick={() => copyPath(path)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            {copiedPath === path ? (
              <CheckIcon className="h-3 w-3 text-green-600" />
            ) : (
              <CopyIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className={cn("space-y-1", depth > 0 && "ml-4")}>
          <div className="text-xs text-muted-foreground">Array [{value.length} items]</div>
          {value.slice(0, 3).map((item, index) => (
            <div key={index} className="border-l-2 border-border pl-2">
              <div className="text-xs font-mono text-muted-foreground mb-1">[{index}]</div>
              {renderValue(item, `${path}[${index}]`, depth + 1)}
            </div>
          ))}
          {value.length > 3 && (
            <div className="text-xs text-muted-foreground italic">
              ... {value.length - 3} more items
            </div>
          )}
        </div>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value);
      return (
        <div className={cn("space-y-1", depth > 0 && "ml-4")}>
          {entries.slice(0, 5).map(([key, val]) => (
            <div key={key} className="border-l-2 border-border pl-2">
              <div className="text-xs font-mono text-muted-foreground mb-1">{key}:</div>
              {renderValue(val, `${path}.${key}`, depth + 1)}
            </div>
          ))}
          {entries.length > 5 && (
            <div className="text-xs text-muted-foreground italic">
              ... {entries.length - 5} more fields
            </div>
          )}
        </div>
      );
    }

    return <span className="text-xs text-muted-foreground">Unknown type</span>;
  };

  if (outputs.length === 0) {
    return (
      <Panel position="top-left" className="w-80 mt-16 ml-4">
        <div className="rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Node Outputs</h3>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground text-center py-8">
            Run or test a node to see outputs here
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel position="top-left" className="w-96 mt-16 ml-4">
      <div className="rounded-lg border bg-card shadow-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Available Data</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {outputs.map((nodeOutput) => {
              const isExpanded = expandedNodes.has(nodeOutput.nodeId);
              
              return (
                <div key={nodeOutput.nodeId} className="border rounded-lg">
                  <button
                    onClick={() => toggleNode(nodeOutput.nodeId)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                      <div className="text-left">
                        <div className="font-medium text-sm">{nodeOutput.nodeType}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {nodeOutput.nodeId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(nodeOutput.timestamp).toLocaleTimeString()}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3 pt-0 border-t bg-muted/20">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Click to copy variable path:
                      </div>
                      {renderValue(nodeOutput.output, `nodes.${nodeOutput.nodeId}.output`)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground">
          💡 Click the copy icon to insert variables into your nodes
        </div>
      </div>
    </Panel>
  );
};


