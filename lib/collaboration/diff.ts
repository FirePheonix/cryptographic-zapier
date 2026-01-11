/**
 * Workflow Diff Computation
 * 
 * Computes structural differences between two workflow versions.
 * Used for Pull Request visual diffs.
 */

import type { WorkflowContent } from "./secrets";

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface NodeDiff {
  id: string;
  type: string;
  status: DiffStatus;
  position?: { x: number; y: number };
  positionBefore?: { x: number; y: number };
  data?: Record<string, unknown>;
  dataBefore?: Record<string, unknown>;
  dataChanges?: Array<{
    key: string;
    before: unknown;
    after: unknown;
  }>;
}

export interface EdgeDiff {
  id: string;
  status: DiffStatus;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  sourceBefore?: string;
  targetBefore?: string;
}

export interface WorkflowDiff {
  nodes: NodeDiff[];
  edges: EdgeDiff[];
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    nodesUnchanged: number;
    edgesAdded: number;
    edgesRemoved: number;
    edgesModified: number;
    edgesUnchanged: number;
  };
}

/**
 * Compute the diff between two workflow versions
 * @param before - The base version (e.g., main workspace)
 * @param after - The new version (e.g., fork with changes)
 */
export function computeWorkflowDiff(
  before: WorkflowContent | null | undefined,
  after: WorkflowContent | null | undefined
): WorkflowDiff {
  const beforeNodes = before?.nodes || [];
  const afterNodes = after?.nodes || [];
  const beforeEdges = before?.edges || [];
  const afterEdges = after?.edges || [];

  const nodeDiffs = computeNodeDiffs(beforeNodes, afterNodes);
  const edgeDiffs = computeEdgeDiffs(beforeEdges, afterEdges);

  return {
    nodes: nodeDiffs,
    edges: edgeDiffs,
    summary: {
      nodesAdded: nodeDiffs.filter((n) => n.status === "added").length,
      nodesRemoved: nodeDiffs.filter((n) => n.status === "removed").length,
      nodesModified: nodeDiffs.filter((n) => n.status === "modified").length,
      nodesUnchanged: nodeDiffs.filter((n) => n.status === "unchanged").length,
      edgesAdded: edgeDiffs.filter((e) => e.status === "added").length,
      edgesRemoved: edgeDiffs.filter((e) => e.status === "removed").length,
      edgesModified: edgeDiffs.filter((e) => e.status === "modified").length,
      edgesUnchanged: edgeDiffs.filter((e) => e.status === "unchanged").length,
    },
  };
}

function computeNodeDiffs(
  beforeNodes: WorkflowContent["nodes"],
  afterNodes: WorkflowContent["nodes"]
): NodeDiff[] {
  const diffs: NodeDiff[] = [];
  const beforeMap = new Map(beforeNodes.map((n) => [n.id, n]));
  const afterMap = new Map(afterNodes.map((n) => [n.id, n]));

  // Check for added and modified nodes
  for (const afterNode of afterNodes) {
    const beforeNode = beforeMap.get(afterNode.id);

    if (!beforeNode) {
      // Node was added
      diffs.push({
        id: afterNode.id,
        type: afterNode.type,
        status: "added",
        position: afterNode.position,
        data: afterNode.data,
      });
    } else {
      // Check if node was modified
      const changes = getDataChanges(beforeNode.data, afterNode.data);
      const positionChanged =
        beforeNode.position.x !== afterNode.position.x ||
        beforeNode.position.y !== afterNode.position.y;
      const typeChanged = beforeNode.type !== afterNode.type;

      if (changes.length > 0 || positionChanged || typeChanged) {
        diffs.push({
          id: afterNode.id,
          type: afterNode.type,
          status: "modified",
          position: afterNode.position,
          positionBefore: beforeNode.position,
          data: afterNode.data,
          dataBefore: beforeNode.data,
          dataChanges: changes,
        });
      } else {
        diffs.push({
          id: afterNode.id,
          type: afterNode.type,
          status: "unchanged",
          position: afterNode.position,
          data: afterNode.data,
        });
      }
    }
  }

  // Check for removed nodes
  for (const beforeNode of beforeNodes) {
    if (!afterMap.has(beforeNode.id)) {
      diffs.push({
        id: beforeNode.id,
        type: beforeNode.type,
        status: "removed",
        positionBefore: beforeNode.position,
        dataBefore: beforeNode.data,
      });
    }
  }

  return diffs;
}

function computeEdgeDiffs(
  beforeEdges: WorkflowContent["edges"],
  afterEdges: WorkflowContent["edges"]
): EdgeDiff[] {
  const diffs: EdgeDiff[] = [];
  const beforeMap = new Map(beforeEdges.map((e) => [e.id, e]));
  const afterMap = new Map(afterEdges.map((e) => [e.id, e]));

  // Check for added and modified edges
  for (const afterEdge of afterEdges) {
    const beforeEdge = beforeMap.get(afterEdge.id);

    if (!beforeEdge) {
      diffs.push({
        id: afterEdge.id,
        status: "added",
        source: afterEdge.source,
        target: afterEdge.target,
        sourceHandle: afterEdge.sourceHandle,
        targetHandle: afterEdge.targetHandle,
      });
    } else {
      const modified =
        beforeEdge.source !== afterEdge.source ||
        beforeEdge.target !== afterEdge.target ||
        beforeEdge.sourceHandle !== afterEdge.sourceHandle ||
        beforeEdge.targetHandle !== afterEdge.targetHandle;

      if (modified) {
        diffs.push({
          id: afterEdge.id,
          status: "modified",
          source: afterEdge.source,
          target: afterEdge.target,
          sourceHandle: afterEdge.sourceHandle,
          targetHandle: afterEdge.targetHandle,
          sourceBefore: beforeEdge.source,
          targetBefore: beforeEdge.target,
        });
      } else {
        diffs.push({
          id: afterEdge.id,
          status: "unchanged",
          source: afterEdge.source,
          target: afterEdge.target,
          sourceHandle: afterEdge.sourceHandle,
          targetHandle: afterEdge.targetHandle,
        });
      }
    }
  }

  // Check for removed edges
  for (const beforeEdge of beforeEdges) {
    if (!afterMap.has(beforeEdge.id)) {
      diffs.push({
        id: beforeEdge.id,
        status: "removed",
        source: beforeEdge.source,
        target: beforeEdge.target,
        sourceBefore: beforeEdge.source,
        targetBefore: beforeEdge.target,
      });
    }
  }

  return diffs;
}

function getDataChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Array<{ key: string; before: unknown; after: unknown }> {
  const changes: Array<{ key: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    // Skip credential-related fields (they're handled separately)
    if (key === "credentialRef" || key === "credentialId" || key === "credentialBound") {
      continue;
    }

    const beforeVal = before[key];
    const afterVal = after[key];

    if (!deepEqual(beforeVal, afterVal)) {
      changes.push({ key, before: beforeVal, after: afterVal });
    }
  }

  return changes;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

/**
 * Apply a diff to merge changes into a target content
 */
export function applyDiff(
  targetContent: WorkflowContent,
  diff: WorkflowDiff
): WorkflowContent {
  const nodeMap = new Map(targetContent.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(targetContent.edges.map((e) => [e.id, e]));

  // Apply node changes
  for (const nodeDiff of diff.nodes) {
    if (nodeDiff.status === "added" && nodeDiff.data && nodeDiff.position) {
      nodeMap.set(nodeDiff.id, {
        id: nodeDiff.id,
        type: nodeDiff.type,
        position: nodeDiff.position,
        data: nodeDiff.data,
      });
    } else if (nodeDiff.status === "removed") {
      nodeMap.delete(nodeDiff.id);
    } else if (nodeDiff.status === "modified" && nodeDiff.data && nodeDiff.position) {
      nodeMap.set(nodeDiff.id, {
        id: nodeDiff.id,
        type: nodeDiff.type,
        position: nodeDiff.position,
        data: nodeDiff.data,
      });
    }
  }

  // Apply edge changes
  for (const edgeDiff of diff.edges) {
    if (edgeDiff.status === "added") {
      edgeMap.set(edgeDiff.id, {
        id: edgeDiff.id,
        source: edgeDiff.source,
        target: edgeDiff.target,
        sourceHandle: edgeDiff.sourceHandle,
        targetHandle: edgeDiff.targetHandle,
      });
    } else if (edgeDiff.status === "removed") {
      edgeMap.delete(edgeDiff.id);
    } else if (edgeDiff.status === "modified") {
      edgeMap.set(edgeDiff.id, {
        id: edgeDiff.id,
        source: edgeDiff.source,
        target: edgeDiff.target,
        sourceHandle: edgeDiff.sourceHandle,
        targetHandle: edgeDiff.targetHandle,
      });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}


