/**
 * Agent Connection Edge
 * 
 * Dashed line edge used to connect AI Agent to its sub-nodes
 * (Chat Model, Memory, Tools)
 */

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export function AgentConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        strokeWidth: 1.5,
        strokeDasharray: "6,4",
      }}
      markerEnd={markerEnd}
    />
  );
}
