"use client";

import {
  Background,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import { nodeTypes } from "@/components/nodes";
import { edgeTypes } from "@/components/edges";
import { NodeOperationsProvider } from "@/providers/node-operations";
import { NodeOutputsProvider } from "@/providers/node-outputs";
import type { NodeDiff, EdgeDiff } from "@/lib/collaboration/diff";

interface VisualWorkflowDiffProps {
  sourceWorkflow: {
    nodes: Node[];
    edges: Edge[];
    label: string;
  };
  targetWorkflow: {
    nodes: Node[];
    edges: Edge[];
    label: string;
  };
  nodeDiffs: NodeDiff[];
  edgeDiffs: EdgeDiff[];
}

// Apply visual diff styling to nodes
function applyNodeDiffStyles(
  nodes: Node[],
  nodeDiffs: NodeDiff[],
  side: "source" | "target"
): Node[] {
  const diffMap = new Map(nodeDiffs.map((d) => [d.id, d.status]));

  return nodes.map((node) => {
    const status = diffMap.get(node.id);

    // Determine if this node should be highlighted on this side
    const showHighlight =
      (side === "source" && status === "removed") ||
      (side === "target" && status === "added") ||
      status === "modified";

    if (!showHighlight) return node;

    // Apply styling via className and style
    const borderColor =
      status === "added"
        ? "2px solid #22c55e"
        : status === "removed"
          ? "2px solid #ef4444"
          : status === "modified"
            ? "2px solid #3b82f6"
            : undefined;

    const backgroundColor =
      status === "added"
        ? "rgba(34, 197, 94, 0.1)"
        : status === "removed"
          ? "rgba(239, 68, 68, 0.1)"
          : status === "modified"
            ? "rgba(59, 130, 246, 0.1)"
            : undefined;

    return {
      ...node,
      style: {
        ...node.style,
        border: borderColor,
        backgroundColor,
        borderRadius: "8px",
      },
    };
  });
}

// Apply visual diff styling to edges
function applyEdgeDiffStyles(
  edges: Edge[],
  edgeDiffs: EdgeDiff[],
  side: "source" | "target"
): Edge[] {
  const diffMap = new Map(edgeDiffs.map((d) => [`${d.source}-${d.target}`, d.status]));

  return edges.map((edge) => {
    const status = diffMap.get(`${edge.source}-${edge.target}`);

    const showHighlight =
      (side === "source" && status === "removed") ||
      (side === "target" && status === "added") ||
      status === "modified";

    if (!showHighlight) return edge;

    return {
      ...edge,
      style: {
        ...edge.style,
        stroke:
          status === "added"
            ? "#22c55e"
            : status === "removed"
              ? "#ef4444"
              : status === "modified"
                ? "#3b82f6"
                : undefined,
        strokeWidth: 3,
      },
    };
  });
}

function DiffCanvas({
  nodes,
  edges,
  label,
  nodeDiffs,
  edgeDiffs,
  side,
}: {
  nodes: Node[];
  edges: Edge[];
  label: string;
  nodeDiffs: NodeDiff[];
  edgeDiffs: EdgeDiff[];
  side: "source" | "target";
}) {
  const styledNodes = applyNodeDiffStyles(nodes, nodeDiffs, side);
  const styledEdges = applyEdgeDiffStyles(edges, edgeDiffs, side);

  return (
    <div className="relative h-full w-full border rounded-lg overflow-hidden bg-background">
      {/* Label */}
      <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-background/90 backdrop-blur border rounded-md shadow-sm">
        <span className="text-sm font-medium">{label}</span>
      </div>

      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} className="bg-muted/30" />
      </ReactFlow>
    </div>
  );
}

export function VisualWorkflowDiff({
  sourceWorkflow,
  targetWorkflow,
  nodeDiffs,
  edgeDiffs,
}: VisualWorkflowDiffProps) {
  // Legend items
  const legendItems = [
    { label: "Added", color: "bg-green-500" },
    { label: "Removed", color: "bg-red-500" },
    { label: "Modified", color: "bg-blue-500" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex items-center gap-4 px-2">
        <span className="text-sm text-muted-foreground">Legend:</span>
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={cn("size-3 rounded-full", item.color)} />
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Side by side canvases */}
      <div className="grid grid-cols-2 gap-4 h-[500px]">
        <ReactFlowProvider>
          <NodeOutputsProvider>
            <NodeOperationsProvider 
              addNode={() => ""} 
              duplicateNode={() => {}}
            >
              <DiffCanvas
                nodes={sourceWorkflow.nodes}
                edges={sourceWorkflow.edges}
                label={sourceWorkflow.label}
                nodeDiffs={nodeDiffs}
                edgeDiffs={edgeDiffs}
                side="source"
              />
            </NodeOperationsProvider>
          </NodeOutputsProvider>
        </ReactFlowProvider>

        <ReactFlowProvider>
          <NodeOutputsProvider>
            <NodeOperationsProvider 
              addNode={() => ""} 
              duplicateNode={() => {}}
            >
              <DiffCanvas
                nodes={targetWorkflow.nodes}
                edges={targetWorkflow.edges}
                label={targetWorkflow.label}
                nodeDiffs={nodeDiffs}
                edgeDiffs={edgeDiffs}
                side="target"
              />
            </NodeOperationsProvider>
          </NodeOutputsProvider>
        </ReactFlowProvider>
      </div>
    </div>
  );
}


