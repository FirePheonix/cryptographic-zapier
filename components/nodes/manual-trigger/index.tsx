/**
 * Manual Trigger Node
 * 
 * n8n-style trigger node that starts workflow execution manually.
 * This is an editor-only trigger - cannot be deployed.
 * 
 * How it works:
 * - User clicks "Execute Workflow" button
 * - Node emits {} (empty object) to start the workflow
 * - Downstream nodes receive this initial execution context
 */

"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import Image from "next/image";

export type ManualTriggerNodeData = {
  label?: string;
  lastTriggered?: string;
};

interface ManualTriggerNodeProps extends NodeProps {
  data: ManualTriggerNodeData;
}

export const ManualTriggerNode = memo(({ id, data, selected }: ManualTriggerNodeProps) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 cursor-pointer transition-all",
        "hover:scale-105",
        selected && "scale-105"
      )}
    >
      {/* Trigger bolt badge */}
      <div className="absolute -top-1 -left-1 z-20">
        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
          <Zap className="w-3 h-3 text-white fill-white" />
        </div>
      </div>

      {/* D-shaped node container (flipped horizontally - curved on right) */}
      <div
        className={cn(
          "relative w-20 h-20 transition-all",
          "bg-[#2d2d2d] border-2 border-[#404040]",
          // D-shape: flat left, curved right
          "rounded-l-lg rounded-r-[40px]",
          selected 
            ? "ring-2 ring-offset-2 ring-offset-background ring-primary shadow-lg border-primary" 
            : "shadow-md hover:shadow-lg hover:border-[#505050]"
        )}
      >
        {/* Inner content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/workflow-svgs/start-trigger.svg"
            alt="Manual Trigger"
            width={40}
            height={40}
            className="opacity-90"
          />
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 rounded-l-lg rounded-r-[40px] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      </div>

      {/* Node label */}
      <span className={cn(
        "text-[11px] font-medium text-center max-w-[100px] leading-tight",
        selected ? "text-foreground" : "text-muted-foreground"
      )}>
        {data.label || 'When clicking "Execute Workflow"'}
      </span>

      {/* Output handle - on the curved right side */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!w-3 !h-3 !bg-[#505050] !border-2 !border-[#2d2d2d]",
          "!right-0 !top-1/2 !-translate-y-1/2",
          "hover:!bg-primary transition-colors"
        )}
        style={{ right: -6, top: "50%" }}
      />

      {/* Connection line visual (the curved line coming out) */}
      <svg 
        className="absolute right-[-24px] top-1/2 -translate-y-1/2 pointer-events-none"
        width="24" 
        height="40" 
        viewBox="0 0 24 40"
      >
        <path
          d="M0 20 Q 12 20, 12 8 Q 12 0, 24 0"
          stroke="#505050"
          strokeWidth="2"
          fill="none"
          className="opacity-0"
        />
      </svg>
    </div>
  );
});

ManualTriggerNode.displayName = "ManualTriggerNode";

export default ManualTriggerNode;
