/**
 * Deploy Toggle Component
 * 
 * n8n-style one-click deploy toggle for workflows.
 * Shows deploy status, toggles deployment on/off.
 */

"use client";

import { useState, useEffect } from "react";
import { useWorkflow } from "@/providers/workflow";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Power, AlertCircle, CheckCircle2, History, ExternalLink } from "lucide-react";
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
  executionCount?: number;
  lastExecution?: string;
}

export function DeployToggle() {
  const workflow = useWorkflow();
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
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

  const handleTest = async () => {
    if (!workflow?.id || isTesting) return;

    setIsTesting(true);
    setError(null);

    try {
      const response = await fetch("/api/workflows/test-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to test workflow");
        return;
      }

      // Refresh status to get new execution count
      const statusResponse = await fetch(`/api/workflows/deploy?workflowId=${workflow.id}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);
      }

      // Show success message
      alert(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsTesting(false);
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
            "h-8 gap-2 rounded-full border bg-card/90 px-3 drop-shadow-xs backdrop-blur-sm transition-all",
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
                
                {/* Execution stats and link */}
                <div className="pt-2 border-t">
                  <Link 
                    href={`/workflows/${workflow?.id}/executions`}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <History className="h-3.5 w-3.5" />
                      <span>
                        {status.executionCount !== undefined 
                          ? `${status.executionCount} execution(s)` 
                          : "View executions"}
                      </span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </Link>
                  {status.lastExecution && (
                    <p className="text-[10px] text-muted-foreground px-2">
                      Last run: {new Date(status.lastExecution).toLocaleString()}
                    </p>
                  )}
                  
                  {/* Test button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Running test...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-3 w-3 mr-2" />
                        Test workflow
                      </>
                    )}
                  </Button>
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
                
                {/* Test button for non-deployed workflows too */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={handleTest}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Running test...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-3 w-3 mr-2" />
                      Test workflow
                    </>
                  )}
                </Button>
