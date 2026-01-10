/**
 * Cronos Payment Node
 * 
 * SEPARATE from 402 Gate - This is the execution layer.
 * 
 * Responsibility:
 * "Send a payment transaction on Cronos blockchain"
 * 
 * What it does:
 * - Sends payment to specified address
 * - Waits for confirmation
 * - Outputs transaction hash
 * 
 * Used by:
 * - AI agents (autonomous payments)
 * - Retry logic
 * - Automated workflows
 * 
 * This mirrors: Auth node ≠ Action node separation
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { SendIcon, CoinsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeLayout } from "../layout";

export type CronosPaymentNodeData = {
  toAddress?: string; // Recipient Cronos address
  amount?: string; // Amount to send
  tokenContract?: string; // ERC20 token (optional, default native CRO)
  gasLimit?: string; // Gas limit (optional)
  waitForConfirmations?: number; // Number of confirmations to wait for
  autoRetry?: boolean; // Retry on failure
  maxRetries?: number; // Max retry attempts
  memo?: string; // Transaction memo/note
};

type CronosPaymentNodeProps = NodeProps & {
  data: CronosPaymentNodeData;
};

export const CronosPaymentNode = ({ id, data, type }: CronosPaymentNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (field: keyof CronosPaymentNodeData, value: string | number | boolean) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title="Cronos Payment">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-emerald-600">
          <SendIcon className="h-5 w-5" />
          <span className="font-semibold">Send Payment (Cronos)</span>
        </div>

        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs">
          <p className="font-medium text-emerald-600 mb-1">💸 Execute Payment</p>
          <p className="text-muted-foreground">
            Sends a payment transaction on Cronos blockchain and waits for confirmation.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-to`}>Recipient Address</Label>
            <Input
              id={`${id}-to`}
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              value={data.toAddress || ""}
              onChange={(e) => handleChange("toAddress", e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Cronos address to receive payment. Supports {"{{previous.address}}"} variables.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-amount`}>Amount</Label>
            <div className="flex gap-2 items-center">
              <Input
                id={`${id}-amount`}
                type="text"
                placeholder="10.5"
                value={data.amount || ""}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
              <CoinsIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Amount to send. Can use variables like {"{{trigger.amount}}"} or {"{{ai.calculated_amount}}"}
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
              ERC20 token contract address. Leave empty to send native CRO.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-confirmations`}>Wait for Confirmations</Label>
            <Select
              value={String(data.waitForConfirmations || 1)}
              onValueChange={(value) => handleChange("waitForConfirmations", Number.parseInt(value))}
            >
              <SelectTrigger id={`${id}-confirmations`}>
                <SelectValue placeholder="Select confirmations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 (immediate)</SelectItem>
                <SelectItem value="1">1 confirmation (recommended)</SelectItem>
                <SelectItem value="3">3 confirmations</SelectItem>
                <SelectItem value="6">6 confirmations (safe)</SelectItem>
                <SelectItem value="12">12 confirmations (very safe)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher confirmations = more secure but slower
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-gas`}>Gas Limit (Optional)</Label>
            <Input
              id={`${id}-gas`}
              type="number"
              placeholder="21000"
              value={data.gasLimit || ""}
              onChange={(e) => handleChange("gasLimit", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for automatic gas estimation
            </p>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
            <div className="space-y-0.5">
              <Label htmlFor={`${id}-retry`}>Auto Retry on Failure</Label>
              <p className="text-xs text-muted-foreground">
                Automatically retry if transaction fails
              </p>
            </div>
            <Switch
              id={`${id}-retry`}
              checked={data.autoRetry ?? false}
              onCheckedChange={(checked) => handleChange("autoRetry", checked)}
            />
          </div>

          {data.autoRetry && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-max-retries`}>Max Retry Attempts</Label>
              <Input
                id={`${id}-max-retries`}
                type="number"
                placeholder="3"
                value={data.maxRetries || 3}
                onChange={(e) => handleChange("maxRetries", Number.parseInt(e.target.value) || 3)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-memo`}>Transaction Memo (Optional)</Label>
            <Input
              id={`${id}-memo`}
              placeholder="Payment for invoice #1234"
              value={data.memo || ""}
              onChange={(e) => handleChange("memo", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional note attached to transaction
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
          <p className="font-medium">Execution Flow:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Connect to user's Cronos wallet (MetaMask/CDC Wallet)</li>
            <li>Build and sign transaction</li>
            <li>Submit to Cronos network</li>
            <li>Wait for specified confirmations</li>
            <li>Return transaction hash and status</li>
          </ol>
        </div>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
          <p className="font-medium text-blue-600 mb-1">Output Fields:</p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">txHash</span> - Transaction hash on Cronos
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">blockNumber</span> - Block number
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">gasUsed</span> - Gas consumed
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">status</span> - Success/Failed
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">timestamp</span> - Confirmation time
          </p>
        </div>
      </div>
    </NodeLayout>
  );
};
