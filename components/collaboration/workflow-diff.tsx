"use client";

import { useMemo } from "react";
import {
  GitMergeIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  EditIcon,
  ArrowRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowDiff, NodeDiff, EdgeDiff, DiffStatus } from "@/lib/collaboration/diff";

// Re-export types for use in visual-workflow-diff
export type { NodeDiff, EdgeDiff, DiffStatus, WorkflowDiff };

interface WorkflowDiffViewProps {
  diff: WorkflowDiff;
  className?: string;
}

const statusColors: Record<DiffStatus, { bg: string; text: string; border: string }> = {
  added: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-300 dark:border-green-700",
  },
  removed: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-300 dark:border-red-700",
  },
  modified: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-700",
  },
  unchanged: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-muted",
  },
};

const statusIcons: Record<DiffStatus, React.ReactNode> = {
  added: <PlusCircleIcon className="size-4" />,
  removed: <MinusCircleIcon className="size-4" />,
  modified: <EditIcon className="size-4" />,
  unchanged: null,
};

export function WorkflowDiffView({ diff, className }: WorkflowDiffViewProps) {
  const { nodes, edges, summary } = diff;

  // Filter out unchanged items for display
  const changedNodes = useMemo(
    () => nodes.filter((n) => n.status !== "unchanged"),
    [nodes]
  );
  const changedEdges = useMemo(
    () => edges.filter((e) => e.status !== "unchanged"),
    [edges]
  );

  const hasChanges = changedNodes.length > 0 || changedEdges.length > 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <GitMergeIcon className="size-5 text-primary" />
          <span className="font-medium">Changes Summary</span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {summary.nodesAdded > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{summary.nodesAdded} node{summary.nodesAdded !== 1 ? "s" : ""}
            </span>
          )}
          {summary.nodesRemoved > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{summary.nodesRemoved} node{summary.nodesRemoved !== 1 ? "s" : ""}
            </span>
          )}
          {summary.nodesModified > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              ~{summary.nodesModified} node{summary.nodesModified !== 1 ? "s" : ""} modified
            </span>
          )}
          {summary.edgesAdded > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{summary.edgesAdded} connection{summary.edgesAdded !== 1 ? "s" : ""}
            </span>
          )}
          {summary.edgesRemoved > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{summary.edgesRemoved} connection{summary.edgesRemoved !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {!hasChanges && (
        <div className="text-center py-8 text-muted-foreground">
          No changes detected between versions
        </div>
      )}

      {/* Node Changes */}
      {changedNodes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Node Changes
          </h3>
          <div className="space-y-2">
            {changedNodes.map((node) => (
              <NodeDiffItem key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Edge Changes */}
      {changedEdges.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Connection Changes
          </h3>
          <div className="space-y-2">
            {changedEdges.map((edge) => (
              <EdgeDiffItem key={edge.id} edge={edge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodeDiffItem({ node }: { node: NodeDiff }) {
  const colors = statusColors[node.status];

  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={colors.text}>{statusIcons[node.status]}</span>
          <span className="font-medium">{node.type}</span>
          <span className="text-xs text-muted-foreground">({node.id})</span>
        </div>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            colors.bg,
            colors.text
          )}
        >
          {node.status}
        </span>
      </div>

      {/* Show data changes for modified nodes */}
      {node.status === "modified" && node.dataChanges && node.dataChanges.length > 0 && (
        <div className="mt-3 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Changed properties:
          </span>
          <div className="space-y-1">
            {node.dataChanges.map((change) => (
              <div
                key={change.key}
                className="text-xs pl-4 border-l-2 border-blue-300 dark:border-blue-700"
              >
                <span className="font-mono font-medium">{change.key}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-red-600 dark:text-red-400 line-through">
                    {formatValue(change.before)}
                  </span>
                  <ArrowRightIcon className="size-3 text-muted-foreground" />
                  <span className="text-green-600 dark:text-green-400">
                    {formatValue(change.after)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show data for added nodes */}
      {node.status === "added" && node.data && (
        <div className="mt-3">
          <span className="text-xs font-medium text-muted-foreground">
            Configuration:
          </span>
          <pre className="mt-1 text-xs bg-green-100 dark:bg-green-900/30 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(filterDisplayData(node.data), null, 2)}
          </pre>
        </div>
      )}

      {/* Show data for removed nodes */}
      {node.status === "removed" && node.dataBefore && (
        <div className="mt-3">
          <span className="text-xs font-medium text-muted-foreground">
            Removed configuration:
          </span>
          <pre className="mt-1 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto max-h-32 line-through">
            {JSON.stringify(filterDisplayData(node.dataBefore), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function EdgeDiffItem({ edge }: { edge: EdgeDiff }) {
  const colors = statusColors[edge.status];

  return (
    <div
      className={cn(
        "p-3 rounded-lg border flex items-center gap-3",
        colors.bg,
        colors.border
      )}
    >
      <span className={colors.text}>{statusIcons[edge.status]}</span>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono">{edge.source}</span>
        <ArrowRightIcon className="size-4 text-muted-foreground" />
        <span className="font-mono">{edge.target}</span>
      </div>
      <span
        className={cn(
          "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
          colors.bg,
          colors.text
        )}
      >
        {edge.status}
      </span>
    </div>
  );
}

// Helper to format values for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") {
    if (value.length > 50) return `"${value.substring(0, 47)}..."`;
    return `"${value}"`;
  }
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    if (str.length > 50) return str.substring(0, 47) + "...";
    return str;
  }
  return String(value);
}

// Filter out sensitive/internal fields from display
function filterDisplayData(data: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  const skipFields = ["credentialRef", "credentialId", "credentialBound"];

  for (const [key, value] of Object.entries(data)) {
    if (!skipFields.includes(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}


