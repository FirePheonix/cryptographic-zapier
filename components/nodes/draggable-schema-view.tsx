/**
 * Draggable Schema View
 * 
 * n8n-style schema tree with draggable blocks that can be dropped
 * into configuration inputs to create variable references
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDrag } from "./drag-context";
import { ChevronRight, GripVertical, Hash, Type, ToggleLeft, List, Braces } from "lucide-react";

interface DraggableSchemaViewProps {
  data: any;
  sourceNodeId?: string;
  sourceNodeName?: string;
  basePath?: string;
}

// Get icon and color based on value type
function getTypeInfo(value: any): { icon: typeof Type; color: string; label: string } {
  if (value === null || value === undefined) {
    return { icon: Type, color: "text-gray-400", label: "null" };
  }
  if (typeof value === "string") {
    return { icon: Type, color: "text-green-500", label: "string" };
  }
  if (typeof value === "number") {
    return { icon: Hash, color: "text-blue-500", label: "number" };
  }
  if (typeof value === "boolean") {
    return { icon: ToggleLeft, color: "text-purple-500", label: "boolean" };
  }
  if (Array.isArray(value)) {
    return { icon: List, color: "text-orange-500", label: `Array(${value.length})` };
  }
  if (typeof value === "object") {
    return { icon: Braces, color: "text-yellow-500", label: "Object" };
  }
  return { icon: Type, color: "text-gray-500", label: typeof value };
}

// Format value for display
function formatValue(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > 30 ? `"${value.slice(0, 30)}..."` : `"${value}"`;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") return "Object";
  return String(value);
}

interface SchemaNodeProps {
  keyName: string | number;
  value: any;
  path: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  depth?: number;
  isArrayItem?: boolean;
}

function SchemaNode({
  keyName,
  value,
  path,
  sourceNodeId,
  sourceNodeName,
  depth = 0,
  isArrayItem = false,
}: SchemaNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const { startDrag, endDrag, isDragging } = useDrag();
  const typeInfo = getTypeInfo(value);
  const Icon = typeInfo.icon;
  const isExpandable = typeof value === "object" && value !== null;
  const hasChildren = isExpandable && Object.keys(value).length > 0;

  const handleDragStart = (e: React.DragEvent) => {
    // Format: {{nodes.nodeId.field}} for node outputs
    // The path already contains the nodeId as the first segment
    e.dataTransfer.setData("text/plain", `{{nodes.${path}}}`);
    e.dataTransfer.effectAllowed = "copy";
    startDrag({
      path: `nodes.${path}`,
      value,
      sourceNodeId,
      sourceNodeName,
    });
  };

  const handleDragEnd = () => {
    endDrag();
  };

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "group flex items-center gap-1 py-1 px-1 rounded-md cursor-grab active:cursor-grabbing",
          "hover:bg-muted/80 transition-colors",
          "border border-transparent hover:border-border"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Drag Handle */}
        <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />

        {/* Type Icon */}
        <Icon className={cn("h-3.5 w-3.5", typeInfo.color)} />

        {/* Key Name */}
        <span className="text-xs font-medium text-foreground">
          {isArrayItem ? `[${keyName}]` : keyName}
        </span>

        {/* Value Preview (for primitives) */}
        {!isExpandable && (
          <span className={cn("text-xs ml-1 truncate max-w-[120px]", typeInfo.color)}>
            {formatValue(value)}
          </span>
        )}

        {/* Type Label (for objects/arrays) */}
        {isExpandable && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {typeInfo.label}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {Array.isArray(value)
            ? value.map((item, index) => (
                <SchemaNode
                  key={index}
                  keyName={index}
                  value={item}
                  path={`${path}[${index}]`}
                  sourceNodeId={sourceNodeId}
                  sourceNodeName={sourceNodeName}
                  depth={depth + 1}
                  isArrayItem
                />
              ))
            : Object.entries(value).map(([key, val]) => (
                <SchemaNode
                  key={key}
                  keyName={key}
                  value={val}
                  path={path ? `${path}.${key}` : key}
                  sourceNodeId={sourceNodeId}
                  sourceNodeName={sourceNodeName}
                  depth={depth + 1}
                />
              ))}
        </div>
      )}
    </div>
  );
}

export function DraggableSchemaView({
  data,
  sourceNodeId,
  sourceNodeName,
  basePath = "",
}: DraggableSchemaViewProps) {
  if (data === null || data === undefined) {
    return <span className="text-muted-foreground text-xs">null</span>;
  }

  if (typeof data !== "object") {
    return (
      <SchemaNode
        keyName="value"
        value={data}
        path={basePath || "value"}
        sourceNodeId={sourceNodeId}
        sourceNodeName={sourceNodeName}
      />
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);

  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <SchemaNode
          key={key}
          keyName={key}
          value={value}
          path={basePath ? `${basePath}.${key}` : String(key)}
          sourceNodeId={sourceNodeId}
          sourceNodeName={sourceNodeName}
          isArrayItem={isArray}
        />
      ))}
    </div>
  );
}


