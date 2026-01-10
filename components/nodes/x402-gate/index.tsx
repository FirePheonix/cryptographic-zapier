/**
 * 402 Payment Gate Node
 * 
 * THE KEY NODE for x402 implementation.
 * 
 * Single Responsibility:
 * "Has valid payment proof been provided for this request?"
 * 
 * What it does:
 * - Checks x-payment-proof header
 * - Verifies on-chain (Cronos)
 * - Enforces amount / recipient
 * - Prevents replay attacks
 * - Either halts workflow with 402 status
 * - Or passes execution forward
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { ShieldCheckIcon, CoinsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NodeLayout } from "../layout";
import Image from "next/image";

export type X402GateNodeData = {
  requiredAmount?: string; // Amount in CRO or CDC
  recipientAddress?: string; // Cronos address
  tokenContract?: string; // ERC20 token contract (optional, defaults to native CRO)
  allowOverpayment?: boolean; // Allow payment > required amount
  replayWindowSeconds?: number; // How long is payment proof valid (prevents replay)
  customMessage?: string; // Message returned with 402 status
};

type X402GateNodeProps = NodeProps & {
  data: X402GateNodeData;
};

export const X402GateNode = ({ id, data, type }: X402GateNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (field: keyof X402GateNodeData, value: string | number | boolean) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title="402 Payment Gate">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-amber-600">
          <Image
            src="/workflow-svgs/x402.svg"
            alt="x402 Protocol"
            width={20}
            height={20}
            className="opacity-90"
          />
          <span className="font-semibold">402 Payment Gate</span>
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs">
          <p className="font-medium text-amber-600 mb-1">⚡ Payment Required</p>
          <p className="text-muted-foreground">
            This node verifies payment proof before allowing workflow execution.
            Halts with HTTP 402 if payment is missing or invalid.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-amount`}>Required Amount</Label>
            <div className="flex gap-2 items-center">
              <Input
                id={`${id}-amount`}
                type="number"
                step="0.001"
                placeholder="10.0"
                value={data.requiredAmount || ""}
                onChange={(e) => handleChange("requiredAmount", e.target.value)}
              />
              <CoinsIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Amount in CRO or token units. Supports {"{{trigger.amount}}"} variables.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-recipient`}>Recipient Address (Cronos)</Label>
            <Input
              id={`${id}-recipient`}
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              value={data.recipientAddress || ""}
              onChange={(e) => handleChange("recipientAddress", e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Your Cronos wallet address to receive payments
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-token`}>Token Contract (Optional)</Label>
            <Input
              id={`${id}-token`}
              placeholder="0x... (leave empty for native CRO)"
              value={data.tokenContract || ""}
              onChange={(e) => handleChange("tokenContract", e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              ERC20 token address. Leave empty to accept native CRO.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-replay`}>Replay Protection (seconds)</Label>
            <Input
              id={`${id}-replay`}
              type="number"
              placeholder="300"
              value={data.replayWindowSeconds || 300}
              onChange={(e) => handleChange("replayWindowSeconds", Number.parseInt(e.target.value) || 300)}
            />
            <p className="text-xs text-muted-foreground">
              Payment proof expires after this time to prevent replay attacks
            </p>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
            <div className="space-y-0.5">
              <Label htmlFor={`${id}-overpay`}>Allow Overpayment</Label>
              <p className="text-xs text-muted-foreground">
                Accept payments greater than required amount
              </p>
            </div>
            <Switch
              id={`${id}-overpay`}
              checked={data.allowOverpayment ?? true}
              onCheckedChange={(checked) => handleChange("allowOverpayment", checked)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-message`}>Custom 402 Message</Label>
            <Input
              id={`${id}-message`}
              placeholder="Payment required to access this resource"
              value={data.customMessage || ""}
              onChange={(e) => handleChange("customMessage", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Message displayed when payment is required
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
          <p className="font-medium">How It Works:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Client sends request with <code className="bg-background px-1 rounded">x-payment-proof</code> header</li>
            <li>Node verifies transaction on Cronos blockchain</li>
            <li>Checks: amount, recipient, timestamp, replay</li>
            <li>✅ Valid → workflow continues</li>
            <li>❌ Invalid → returns HTTP 402 with payment details</li>
          </ol>
        </div>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
          <p className="font-medium text-blue-600 mb-1">Output Fields:</p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">txHash</span> - Transaction hash
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">payer</span> - Payer's address
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">amount</span> - Actual amount paid
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">timestamp</span> - Payment timestamp
          </p>
        </div>
      </div>
    </NodeLayout>
  );
};
