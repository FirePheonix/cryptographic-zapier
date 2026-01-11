/**
 * MetaMask Wallet Watch Node Component
 * 
 * A trigger node that watches an EVM wallet address for incoming payments
 * Styled like n8n with clean UI and brand-accurate MetaMask icon
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
import { MetaMaskIcon } from "@/components/icons/crypto";

export type MetaMaskNodeData = {
  address?: string;
  network?: string;
  webhookId?: string;
  webhookStatus?: "idle" | "pending" | "active" | "error";
  errorMessage?: string;
};

type MetaMaskNodeProps = NodeProps & {
  data: MetaMaskNodeData;
};

const NETWORKS = [
  { value: "ETH_SEPOLIA", label: "Sepolia (Testnet)" },
  { value: "ETH_MAINNET", label: "Ethereum" },
  { value: "POLYGON_MAINNET", label: "Polygon" },
  { value: "ARBITRUM_MAINNET", label: "Arbitrum" },
  { value: "OPTIMISM_MAINNET", label: "Optimism" },
];

export const MetaMaskWatchNode = ({ id, data, selected }: MetaMaskNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const [isWatching, setIsWatching] = useState(false);

  const handleChange = (field: keyof MetaMaskNodeData, value: string) => {
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
      const response = await fetch("/api/alchemy/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: data.address,
          network: data.network || "ETH_SEPOLIA",
          nodeId: id,
          chain: "ethereum",
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
      await fetch("/api/alchemy/watch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: data.webhookId }),
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
        selected ? "border-orange-500 shadow-orange-500/20" : "border-border",
        isActive && "border-green-500/50",
        isError && "border-red-500/50"
      )}
    >
      {/* Trigger Badge */}
      <div className="absolute -top-3 left-4 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
        <ZapIcon className="h-3 w-3" />
        TRIGGER
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-gradient-to-r from-orange-500/10 to-transparent rounded-t-lg">
        <div className="p-1 rounded-lg bg-orange-500/10">
          <MetaMaskIcon size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">MetaMask Wallet</h3>
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
            placeholder="0x..."
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
            value={data.network || "ETH_SEPOLIA"}
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
            className="w-full nodrag bg-orange-500 hover:bg-orange-600 text-white h-8"
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
        <div className="flex flex-wrap gap-1">
          <code className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-mono">
            value
          </code>
          <code className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-mono">
            from
          </code>
          <code className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-mono">
            to
          </code>
          <code className="text-[9px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded font-mono">
            txHash
          </code>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-background"
      />
    </div>
  );
};


