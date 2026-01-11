"use client";

import { useState } from "react";
import { ListIcon, LayoutGridIcon } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisualWorkflowDiff } from "@/components/collaboration/visual-workflow-diff";
import type { NodeDiff, EdgeDiff } from "@/lib/collaboration/diff";

interface HistoryDiffTabsProps {
  oldContent: {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
  } | null;
  newContent: {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string }>;
  } | null;
  version: number;
  listDiffContent: React.ReactNode;
}

export function HistoryDiffTabs({ 
  oldContent, 
  newContent, 
  version, 
  listDiffContent 
}: HistoryDiffTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("visual");

  // Compute node diffs for visual highlighting
  const oldNodes = new Map((oldContent?.nodes || []).map((n) => [n.id, n]));
  const newNodes = new Map((newContent?.nodes || []).map((n) => [n.id, n]));

  const nodeDiffs: NodeDiff[] = [];
  
  // Check for added and modified nodes
  for (const [id, newNode] of newNodes) {
    const oldNode = oldNodes.get(id);
    if (!oldNode) {
      nodeDiffs.push({
        id,
        type: newNode.type,
        status: "added",
        data: newNode.data,
      });
    } else if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
      nodeDiffs.push({
        id,
        type: newNode.type,
        status: "modified",
      });
    }
  }

  // Check for removed nodes
  for (const [id, oldNode] of oldNodes) {
    if (!newNodes.has(id)) {
      nodeDiffs.push({
        id,
        type: oldNode.type,
        status: "removed",
        dataBefore: oldNode.data,
      });
    }
  }

  // Compute edge diffs
  const oldEdges = new Map((oldContent?.edges || []).map((e) => [`${e.source}-${e.target}`, e]));
  const newEdges = new Map((newContent?.edges || []).map((e) => [`${e.source}-${e.target}`, e]));

  const edgeDiffs: EdgeDiff[] = [];

  for (const [key, newEdge] of newEdges) {
    if (!oldEdges.has(key)) {
      edgeDiffs.push({
        id: newEdge.id,
        source: newEdge.source,
        target: newEdge.target,
        status: "added",
      });
    }
  }

  for (const [key, oldEdge] of oldEdges) {
    if (!newEdges.has(key)) {
      edgeDiffs.push({
        id: oldEdge.id,
        source: oldEdge.source,
        target: oldEdge.target,
        status: "removed",
      });
    }
  }

  // Transform to React Flow nodes/edges
  const sourceNodes: Node[] = (oldContent?.nodes || []).map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const sourceEdges: Edge[] = (oldContent?.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "animated",
  }));

  const targetNodes: Node[] = (newContent?.nodes || []).map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const targetEdges: Edge[] = (newContent?.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "animated",
  }));

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
            label: version > 1 ? `v${version - 1} (Previous)` : "Empty",
          }}
          targetWorkflow={{
            nodes: targetNodes,
            edges: targetEdges,
            label: `v${version} (Current)`,
          }}
          nodeDiffs={nodeDiffs}
          edgeDiffs={edgeDiffs}
        />
      </TabsContent>

      <TabsContent value="list" className="mt-0">
        {listDiffContent}
      </TabsContent>
    </Tabs>
  );
}
