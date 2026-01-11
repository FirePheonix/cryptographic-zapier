"use client";

import { useState } from "react";
import { ListIcon, LayoutGridIcon } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkflowDiffView, type WorkflowDiff, type NodeDiff, type EdgeDiff } from "@/components/collaboration/workflow-diff";
import { VisualWorkflowDiff } from "@/components/collaboration/visual-workflow-diff";

interface PRDiffTabsProps {
  diff: WorkflowDiff;
  sourceWorkflow: {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
    name: string;
    version: number;
  };
  targetWorkflow: {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
    name: string;
    version: number;
  };
}

export function PRDiffTabs({ diff, sourceWorkflow, targetWorkflow }: PRDiffTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("visual");

  // Transform nodes to React Flow format
  const sourceNodes: Node[] = sourceWorkflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const sourceEdges: Edge[] = sourceWorkflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "animated",
  }));

  const targetNodes: Node[] = targetWorkflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const targetEdges: Edge[] = targetWorkflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "animated",
  }));

  // Get node and edge diffs
  const nodeDiffs: NodeDiff[] = diff.nodes.filter((n) => n.status !== "unchanged");
  const edgeDiffs: EdgeDiff[] = diff.edges.filter((e) => e.status !== "unchanged");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="visual" className="gap-2">
          <LayoutGridIcon className="size-4" />
          Visual
        </TabsTrigger>
        <TabsTrigger value="list" className="gap-2">
          <ListIcon className="size-4" />
          List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="visual" className="mt-0">
        <VisualWorkflowDiff
          sourceWorkflow={{
            nodes: sourceNodes,
            edges: sourceEdges,
            label: `${sourceWorkflow.name} (v${sourceWorkflow.version})`,
          }}
          targetWorkflow={{
            nodes: targetNodes,
            edges: targetEdges,
            label: `${targetWorkflow.name} (v${targetWorkflow.version})`,
          }}
          nodeDiffs={nodeDiffs}
          edgeDiffs={edgeDiffs}
        />
      </TabsContent>

      <TabsContent value="list" className="mt-0">
        <WorkflowDiffView diff={diff} />
      </TabsContent>
    </Tabs>
  );
}
