/**
 * x402 Gate Configuration
 * 
 * Configuration panel for the 402 Payment Gate node.
 * Verifies payment proof before allowing workflow execution.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Coins, Info } from "lucide-react";

// Output field definitions for display
const OUTPUT_FIELDS = [
  { key: "txHash", label: "Transaction Hash" },
  { key: "payer", label: "Payer Address" },
  { key: "amount", label: "Amount Paid" },
  { key: "timestamp", label: "Payment Timestamp" },
  { key: "verified", label: "Verification Status" },
];

interface X402GateConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

export function X402GateConfig({ data, onChange, inputData }: X402GateConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-2 text-amber-600">
        <ShieldCheck className="h-5 w-5" />
        <span className="font-semibold">402 Payment Gate Configuration</span>
      </div>

      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs">
        <p className="font-medium text-amber-600 mb-1">⚡ Payment Required</p>
        <p className="text-muted-foreground">
          This node verifies payment proof before allowing workflow execution.
          Halts with HTTP 402 if payment is missing or invalid.
        </p>
      </div>

      {/* Required Amount */}
      <div className="space-y-2">
        <Label htmlFor="requiredAmount" className="flex items-center gap-2">
          Required Amount <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            id="requiredAmount"
            type="text"
            placeholder="10.0"
            value={(data.requiredAmount as string) || ""}
            onChange={(e) => handleChange("requiredAmount", e.target.value)}
          />
          <Coins className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Amount in CRO or token units. Supports {"{{trigger.amount}}"} variables.
        </p>
      </div>

      {/* Recipient Address */}
      <div className="space-y-2">
        <Label htmlFor="recipientAddress" className="flex items-center gap-2">
          Recipient Address (Cronos) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="recipientAddress"
          placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
          value={(data.recipientAddress as string) || ""}
          onChange={(e) => handleChange("recipientAddress", e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Your Cronos wallet address to receive payments
        </p>
      </div>

      {/* Token Contract */}
      <div className="space-y-2">
        <Label htmlFor="tokenContract">Token Contract (Optional)</Label>
        <Input
          id="tokenContract"
          placeholder="0x... (leave empty for native CRO)"
          value={(data.tokenContract as string) || ""}
          onChange={(e) => handleChange("tokenContract", e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          ERC20 token address. Leave empty to accept native CRO.
        </p>
      </div>

      {/* Replay Protection */}
      <div className="space-y-2">
        <Label htmlFor="replayWindowSeconds">Replay Protection (seconds)</Label>
        <Input
          id="replayWindowSeconds"
          type="number"
          placeholder="300"
          value={(data.replayWindowSeconds as number) || 300}
          onChange={(e) => handleChange("replayWindowSeconds", parseInt(e.target.value) || 300)}
        />
        <p className="text-xs text-muted-foreground">
          Payment proof expires after this time to prevent replay attacks
        </p>
      </div>

      {/* Allow Overpayment */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
        <div className="space-y-0.5">
          <Label htmlFor="allowOverpayment">Allow Overpayment</Label>
          <p className="text-xs text-muted-foreground">
            Accept payments greater than required amount
          </p>
        </div>
        <Switch
          id="allowOverpayment"
          checked={(data.allowOverpayment as boolean) ?? true}
          onCheckedChange={(checked) => handleChange("allowOverpayment", checked)}
        />
      </div>

      {/* Custom Message */}
      <div className="space-y-2">
        <Label htmlFor="customMessage">Custom 402 Message</Label>
        <Textarea
          id="customMessage"
          placeholder="Payment required to access this resource"
          value={(data.customMessage as string) || ""}
          onChange={(e) => handleChange("customMessage", e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Message displayed when payment is required
        </p>
      </div>

      {/* How It Works */}
      <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
        <p className="font-medium flex items-center gap-1">
          <Info className="h-3 w-3" /> How It Works:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Client sends request with <code className="bg-background px-1 rounded">x-payment-proof</code> header</li>
          <li>Node verifies transaction on Cronos blockchain</li>
          <li>Checks: amount, recipient, timestamp, replay</li>
          <li>✅ Valid → workflow continues</li>
          <li>❌ Invalid → returns HTTP 402 with payment details</li>
        </ol>
      </div>

      {/* Output Fields */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
        <p className="font-medium text-blue-600 mb-2">Output Fields:</p>
        {OUTPUT_FIELDS.map((output) => (
          <p key={output.key} className="text-muted-foreground">
            <span className="font-mono text-blue-600">{output.key}</span> - {output.label}
          </p>
        ))}
      </div>
    </div>
  );
}
