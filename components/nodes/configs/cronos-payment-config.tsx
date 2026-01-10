/**
 * Cronos Payment Configuration
 * 
 * Configuration panel for the Cronos Payment node.
 * Sends payment transactions on Cronos blockchain.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Coins, Info } from "lucide-react";

// Define confirmation options inline to avoid type issues
const CONFIRMATION_OPTIONS = [
  { value: "0", label: "0 (immediate)" },
  { value: "1", label: "1 confirmation (recommended)" },
  { value: "3", label: "3 confirmations" },
  { value: "6", label: "6 confirmations (safe)" },
  { value: "12", label: "12 confirmations (very safe)" },
];

interface CronosPaymentConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

export function CronosPaymentConfig({ data, onChange, inputData }: CronosPaymentConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-2 text-emerald-600">
        <Send className="h-5 w-5" />
        <span className="font-semibold">Cronos Payment Configuration</span>
      </div>

      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs">
        <p className="font-medium text-emerald-600 mb-1">💸 Execute Payment</p>
        <p className="text-muted-foreground">
          Sends a payment transaction on Cronos blockchain and waits for confirmation.
        </p>
      </div>

      {/* Recipient Address */}
      <div className="space-y-2">
        <Label htmlFor="toAddress" className="flex items-center gap-2">
          Recipient Address <span className="text-destructive">*</span>
        </Label>
        <Input
          id="toAddress"
          placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
          value={String(data.toAddress ?? "")}
          onChange={(e) => handleChange("toAddress", e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Cronos address to receive payment. Supports {"{{previous.address}}"} variables.
        </p>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="flex items-center gap-2">
          Amount <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            id="amount"
            type="text"
            placeholder="10.5"
            value={String(data.amount ?? "")}
            onChange={(e) => handleChange("amount", e.target.value)}
          />
          <Coins className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Amount to send in CRO or token units. Supports {"{{previous.amount}}"} variables.
        </p>
      </div>

      {/* Token Contract */}
      <div className="space-y-2">
        <Label htmlFor="tokenContract">Token Contract (Optional)</Label>
        <Input
          id="tokenContract"
          placeholder="0x... (leave empty for native CRO)"
          value={String(data.tokenContract ?? "")}
          onChange={(e) => handleChange("tokenContract", e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          ERC20 token contract address. Leave empty for native CRO.
        </p>
      </div>

      {/* Wait for Confirmations */}
      <div className="space-y-2">
        <Label htmlFor="waitForConfirmations">Wait for Confirmations</Label>
        <Select
          value={String((data.waitForConfirmations as number) ?? 1)}
          onValueChange={(value) => handleChange("waitForConfirmations", parseInt(value))}
        >
          <SelectTrigger id="waitForConfirmations">
            <SelectValue placeholder="Select confirmations" />
          </SelectTrigger>
          <SelectContent>
            {CONFIRMATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          More confirmations = more secure but slower
        </p>
      </div>

      {/* Gas Limit */}
      <div className="space-y-2">
        <Label htmlFor="gasLimit">Gas Limit (Optional)</Label>
        <Input
          id="gasLimit"
          placeholder="21000"
          value={String(data.gasLimit ?? "")}
          onChange={(e) => handleChange("gasLimit", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for automatic gas estimation
        </p>
      </div>

      {/* Auto Retry */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
        <div className="space-y-0.5">
          <Label htmlFor="autoRetry">Auto Retry on Failure</Label>
          <p className="text-xs text-muted-foreground">
            Automatically retry if transaction fails
          </p>
        </div>
        <Switch
          id="autoRetry"
          checked={(data.autoRetry as boolean) ?? false}
          onCheckedChange={(checked) => handleChange("autoRetry", checked)}
        />
      </div>

      {/* Max Retries - only show if auto retry is enabled */}
      {data.autoRetry && (
        <div className="space-y-2">
          <Label htmlFor="maxRetries">Max Retry Attempts</Label>
          <Input
            id="maxRetries"
            type="number"
            placeholder="3"
            value={(data.maxRetries as number) || 3}
            onChange={(e) => handleChange("maxRetries", parseInt(e.target.value) || 3)}
          />
        </div>
      )}

      {/* Memo */}
      <div className="space-y-2">
        <Label htmlFor="memo">Transaction Memo (Optional)</Label>
        <Textarea
          id="memo"
          placeholder="Payment for invoice #1234"
          value={String(data.memo ?? "")}
          onChange={(e) => handleChange("memo", e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Optional note attached to transaction
        </p>
      </div>

      {/* Output Fields */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
        <p className="font-medium text-blue-600 mb-2">Output Fields:</p>
        <p className="text-muted-foreground">
          <span className="font-mono text-blue-600">txHash</span> - Transaction Hash
        </p>
        <p className="text-muted-foreground">
          <span className="font-mono text-blue-600">blockNumber</span> - Block Number
        </p>
        <p className="text-muted-foreground">
          <span className="font-mono text-blue-600">gasUsed</span> - Gas Used
        </p>
        <p className="text-muted-foreground">
          <span className="font-mono text-blue-600">status</span> - Status
        </p>
        <p className="text-muted-foreground">
          <span className="font-mono text-blue-600">timestamp</span> - Confirmation Time
        </p>
      </div>
    </div>
  );
}
