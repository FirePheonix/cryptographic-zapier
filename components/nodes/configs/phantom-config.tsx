/**
 * Phantom/MetaMask Watch Node Configuration
 */

"use client";

import { useState } from "react";
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
import { Loader2, Zap, XCircle, CheckCircle2 } from "lucide-react";

const SOLANA_NETWORKS = [
  { value: "SOLANA_DEVNET", label: "Solana Devnet" },
  { value: "SOLANA_MAINNET", label: "Solana Mainnet" },
];

const EVM_NETWORKS = [
  { value: "ETH_MAINNET", label: "Ethereum Mainnet" },
  { value: "ETH_GOERLI", label: "Ethereum Goerli" },
  { value: "POLYGON_MAINNET", label: "Polygon" },
  { value: "ARB_MAINNET", label: "Arbitrum" },
  { value: "OPT_MAINNET", label: "Optimism" },
];

interface PhantomConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  nodeType: string;
}

export function PhantomConfig({ data, onChange, nodeType }: PhantomConfigProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const isPhantom = nodeType === "phantomWatch";
  const networks = isPhantom ? SOLANA_NETWORKS : EVM_NETWORKS;
  const defaultNetwork = isPhantom ? "SOLANA_DEVNET" : "ETH_MAINNET";
  
  // Extract typed values from data
  const address = typeof data.address === "string" ? data.address : "";
  const network = typeof data.network === "string" ? data.network : defaultNetwork;
  const webhookId = typeof data.webhookId === "string" ? data.webhookId : "";
  const webhookStatus = data.webhookStatus as string | undefined;
  const errorMessage = typeof data.errorMessage === "string" ? data.errorMessage : "";
  
  const isActive = webhookStatus === "active";
  const isError = webhookStatus === "error";

  const startWatching = async () => {
    if (!address) {
      onChange({ webhookStatus: "error", errorMessage: "Please enter a wallet address" });
      return;
    }

    setIsLoading(true);
    onChange({ webhookStatus: "pending" });

    try {
      const endpoint = isPhantom ? "/api/helius/watch" : "/api/alchemy/watch";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address,
          network: network,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to set up webhook");
      }

      onChange({
        webhookStatus: "active",
        webhookId: result.webhookId,
        errorMessage: undefined,
      });
    } catch (error) {
      onChange({
        webhookStatus: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopWatching = async () => {
    if (!webhookId) return;

    setIsLoading(true);

    try {
      const endpoint = isPhantom ? "/api/helius/watch" : "/api/alchemy/watch";
      await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: webhookId, network: network }),
      });

      onChange({
        webhookStatus: "idle",
        webhookId: undefined,
        errorMessage: undefined,
      });
    } catch (error) {
      console.error("Failed to stop watching:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Address */}
      <div className="space-y-2">
        <Label>Wallet Address</Label>
        <Input
          placeholder={isPhantom ? "Enter Solana address..." : "Enter EVM address (0x...)"}
          value={address}
          onChange={(e) => onChange({ address: e.target.value })}
          disabled={isActive}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          The wallet address to monitor for incoming transactions
        </p>
      </div>

      {/* Network */}
      <div className="space-y-2">
        <Label>Network</Label>
        <Select
          value={network}
          onValueChange={(value) => onChange({ network: value })}
          disabled={isActive}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select network" />
          </SelectTrigger>
          <SelectContent>
            {networks.map((net) => (
              <SelectItem key={net.value} value={net.value}>
                {net.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        {!isActive ? (
          <Button
            onClick={startWatching}
            disabled={isLoading || !address}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Start Watching
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopWatching}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Stop Watching
              </>
            )}
          </Button>
        )}
      </div>

      {/* Status */}
      {isActive && (
        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Watching for transactions</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Webhook ID: {webhookId}
          </p>
        </div>
      )}

      {isError && errorMessage && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Output Fields Info */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-2">Output Fields</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">amount</code>
            <span>Transaction amount in {isPhantom ? "SOL" : "ETH"}</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">from</code>
            <span>Sender address</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">to</code>
            <span>Recipient address</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">signature</code>
            <span>Transaction signature/hash</span>
          </div>
        </div>
      </div>
    </div>
  );
}


