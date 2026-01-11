/**
 * Phantom Wallet Watch Node Component
 * 
 * A trigger node that watches a Solana wallet address for incoming payments
 * Styled like n8n with clean UI and brand-accurate Phantom icon
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Loader2Icon, CheckCircle2Icon, XCircleIcon, ZapIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PhantomIcon } from "@/components/icons/crypto";

export type PhantomNodeData = {
  address?: string;
  network?: string;
  webhookId?: string;
  webhookStatus?: "idle" | "pending" | "active" | "error";
  errorMessage?: string;
  // Output data from webhook
  lastOutput?: {
    amount: number;
    from: string;
    to: string;
    signature: string;
    timestamp: string;
  };
  lastTriggeredAt?: string;
};

type PhantomNodeProps = NodeProps & {
  data: PhantomNodeData;
};

const NETWORKS = [
  { value: "SOLANA_DEVNET", label: "Devnet" },
  { value: "SOLANA_MAINNET", label: "Mainnet" },
];

export const PhantomWatchNode = ({ id, data, selected }: PhantomNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const [isWatching, setIsWatching] = useState(false);

  const handleChange = (field: keyof PhantomNodeData, value: string) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  const startWatching = async () => {
    if (!data.address) {
      updateNodeData(id, { ...data, webhookStatus: "error", errorMessage: "Please enter a wallet address" });
      return;
    }

    setIsWatching(true);
    updateNodeData(id, { ...data, webhookStatus: "pending" });

    try {
      // Use Helius for Solana webhooks
      const response = await fetch("/api/helius/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: data.address,
          network: data.network || "SOLANA_DEVNET",
          nodeId: id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to set up webhook");
      }

      updateNodeData(id, { 
        ...data, 
        webhookStatus: "active", 
        webhookId: result.webhookId,
        errorMessage: undefined,
      });
    } catch (error) {
      updateNodeData(id, { 
        ...data, 
        webhookStatus: "error", 
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsWatching(false);
    }
  };

  const stopWatching = async () => {
    if (!data.webhookId) return;

    setIsWatching(true);

    try {
      await fetch("/api/helius/watch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: data.webhookId, network: data.network }),
      });

      updateNodeData(id, { 
        ...data, 
        webhookStatus: "idle", 
        webhookId: undefined,
        errorMessage: undefined,
      });
    } catch (error) {
      console.error("Failed to stop watching:", error);
    } finally {
      setIsWatching(false);
    }
  };

  const isActive = data.webhookStatus === "active";
  const isError = data.webhookStatus === "error";

  return (
    <div
      className={cn(
        "relative bg-background rounded-lg border-2 shadow-lg min-w-[280px] transition-all",
        selected ? "border-purple-500 shadow-purple-500/20" : "border-border",
        isActive && "border-green-500/50",
        isError && "border-red-500/50"
      )}
    >
      {/* Trigger Badge */}
      <div className="absolute -top-3 left-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
        <ZapIcon className="h-3 w-3" />
        TRIGGER
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-gradient-to-r from-purple-500/10 to-transparent rounded-t-lg">
        <div className="p-1.5 rounded-lg bg-[#AB9FF2]/20">
          <PhantomIcon size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">Phantom Wallet</h3>
          <p className="text-[11px] text-muted-foreground">Watch for payments</p>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 text-green-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Wallet Address */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Wallet Address</Label>
          <Input
            placeholder="Enter Solana address..."
            value={data.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            className="nodrag h-8 text-xs font-mono bg-muted/50"
            disabled={isActive}
          />
        </div>

        {/* Network */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Network</Label>
          <Select
            value={data.network || "SOLANA_DEVNET"}
            onValueChange={(value) => handleChange("network", value)}
            disabled={isActive}
          >
            <SelectTrigger className="nodrag h-8 text-xs bg-muted/50">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map((network) => (
                <SelectItem key={network.value} value={network.value} className="text-xs">
                  {network.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Button */}
        {!isActive ? (
          <Button
            onClick={startWatching}
            disabled={isWatching || !data.address}
            size="sm"
            className="w-full nodrag bg-purple-600 hover:bg-purple-700 text-white h-8"
          >
            {isWatching ? (
              <>
                <Loader2Icon className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ZapIcon className="h-3.5 w-3.5 mr-1.5" />
                Start Watching
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopWatching}
            disabled={isWatching}
            variant="outline"
            size="sm"
            className="w-full nodrag h-8 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {isWatching ? (
              <>
                <Loader2Icon className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <XCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                Stop Watching
              </>
            )}
          </Button>
        )}

        {/* Status */}
        {isActive && (
          <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Watching for transactions</span>
            </div>
          </div>
        )}

        {isError && data.errorMessage && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircleIcon className="h-3.5 w-3.5" />
              <span className="text-[11px]">{data.errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Output Footer */}
      <div className="px-3 py-2 bg-muted/30 border-t rounded-b-lg">
        <p className="text-[10px] text-muted-foreground font-medium mb-1">Output</p>
        
        {data.lastOutput ? (
          // Show actual output data
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono font-medium text-green-500">{data.lastOutput.amount} SOL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">From:</span>
              <span className="font-mono truncate max-w-[140px]" title={data.lastOutput.from}>
                {data.lastOutput.from?.slice(0, 8)}...{data.lastOutput.from?.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">To:</span>
              <span className="font-mono truncate max-w-[140px]" title={data.lastOutput.to}>
                {data.lastOutput.to?.slice(0, 8)}...{data.lastOutput.to?.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Signature:</span>
              <span className="font-mono truncate max-w-[140px]" title={data.lastOutput.signature}>
                {data.lastOutput.signature?.slice(0, 8)}...
              </span>
            </div>
            {data.lastTriggeredAt && (
              <div className="text-[9px] text-muted-foreground mt-1 text-right">
                Last triggered: {new Date(data.lastTriggeredAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          // Show expected output fields
          <div className="flex flex-wrap gap-1">
            <code className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono">
              amount
            </code>
            <code className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono">
              from
            </code>
            <code className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono">
              to
            </code>
            <code className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-mono">
              signature
            </code>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
      />
    </div>
  );
};


