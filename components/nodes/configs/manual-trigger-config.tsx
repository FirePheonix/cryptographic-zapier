/**
 * Manual Trigger Configuration Panel
 * 
 * Shows information about how the manual trigger works.
 * This trigger has no configuration - it simply starts when user clicks Execute.
 */

"use client";

import { memo } from "react";
import { MousePointerClick, Info, Zap, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ManualTriggerConfigProps {
  nodeId: string;
  data: {
    label?: string;
    lastTriggered?: string;
  };
  onUpdate: (data: Record<string, unknown>) => void;
}

export const ManualTriggerConfig = memo(({ nodeId, data }: ManualTriggerConfigProps) => {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <MousePointerClick className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Manual Trigger</h3>
          <p className="text-sm text-muted-foreground">Starts the workflow when you click Execute</p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="w-4 h-4" />
          How It Works
        </div>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Click the <strong>"Execute Workflow"</strong> button in the editor</li>
          <li>This node emits an empty object <code className="px-1 py-0.5 rounded bg-muted text-xs">{'{}'}</code></li>
          <li>The workflow starts executing from this node</li>
          <li>Downstream nodes receive the execution context</li>
        </ol>
      </div>

      {/* Output info */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="w-4 h-4 text-amber-500" />
          Output
        </div>
        <pre className="text-xs bg-muted rounded p-2 overflow-auto">
{`{
  // Empty initial payload
  // Use this to start workflows that don't need external data
}`}
        </pre>
      </div>

      {/* Warning about deployment */}
      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-sm">
          <strong>Editor-only trigger.</strong> This node cannot be deployed or activated.
          Use Webhook, Payment, or Schedule triggers for production workflows.
        </AlertDescription>
      </Alert>

      {/* Last triggered */}
      {data.lastTriggered && (
        <div className="text-xs text-muted-foreground">
          Last triggered: {new Date(data.lastTriggered).toLocaleString()}
        </div>
      )}
    </div>
  );
});

ManualTriggerConfig.displayName = "ManualTriggerConfig";

export default ManualTriggerConfig;
