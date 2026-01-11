/**
 * Deploy Toggle Compact Component
 * 
 * Compact version for the unified header bar.
 */

"use client";

import { useState, useEffect } from "react";
import { useWorkflow } from "@/providers/workflow";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DeployStatus {
  deployed: boolean;
  activeWebhooks: number;
  watchedAddresses: Array<{
    nodeId: string;
    address: string;
    network: string;
  }>;
}

export function DeployToggleCompact() {
  const workflow = useWorkflow();
  const [isDeploying, setIsDeploying] = useState(false);
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current deployment status
  useEffect(() => {
    if (!workflow?.id) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/workflows/deploy?workflowId=${workflow.id}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to fetch deploy status:", err);
      }
    };

    fetchStatus();
  }, [workflow?.id]);

  const handleToggle = async () => {
    if (!workflow?.id || isDeploying) return;

    setIsDeploying(true);
    setError(null);

    try {
      const isCurrentlyDeployed = status?.deployed;
      const method = isCurrentlyDeployed ? "DELETE" : "POST";

      const response = await fetch("/api/workflows/deploy", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to toggle deployment");
        return;
      }

      // Update status
      setStatus({
        deployed: data.deployed,
        activeWebhooks: data.webhooks?.length || 0,
        watchedAddresses: data.webhooks?.map((w: any) => ({
          nodeId: w.nodeId,
          address: w.address,
          network: "solana",
        })) || [],
      });

      // Refresh the page to update node states
      if (data.deployed) {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDeploying(false);
    }
  };

  const isDeployed = status?.deployed ?? false;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-2 rounded-full border bg-background/50 px-3 transition-all",
            isDeployed && "border-green-500/50 text-green-600",
            error && "border-red-500/50"
          )}
          disabled={isDeploying}
        >
          {isDeploying ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">{isDeployed ? "Stopping..." : "Deploying..."}</span>
            </>
          ) : isDeployed ? (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs">Active</span>
            </>
          ) : (
            <>
              <Rocket className="h-3 w-3" />
              <span className="text-xs">Deploy</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Workflow Deployment</h4>
              <p className="text-xs text-muted-foreground">
                {isDeployed 
                  ? "Your workflow is live and listening for transactions" 
                  : "Deploy to start watching for transactions"}
              </p>
            </div>
            <Switch
              checked={isDeployed}
              onCheckedChange={handleToggle}
              disabled={isDeploying}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/50 rounded-md text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          {isDeployed && status && status.activeWebhooks > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">
                Watching {status.activeWebhooks} address(es)
              </h5>
              <div className="space-y-1">
                {status.watchedAddresses.map((addr) => (
                  <div 
                    key={addr.nodeId}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs font-mono"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="truncate">{addr.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isDeployed && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">What happens when deployed:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Webhooks are registered with Helius</li>
                <li>Your workflow runs on every transaction</li>
                <li>Emails, AI analysis, etc. trigger automatically</li>
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
