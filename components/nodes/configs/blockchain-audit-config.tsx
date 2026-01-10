/**
 * Blockchain Audit Configuration
 * 
 * Configuration panel for the Blockchain Audit node.
 * Creates immutable audit trails on Cronos blockchain.
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Info } from "lucide-react";

// Output field definitions
const OUTPUT_FIELDS = [
  { key: "auditHash", label: "Audit Hash" },
  { key: "auditTxHash", label: "Blockchain Transaction Hash" },
  { key: "blockNumber", label: "Block Number" },
  { key: "timestamp", label: "Timestamp" },
  { key: "verifyUrl", label: "Cronoscan Verification URL" },
];

interface BlockchainAuditConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

export function BlockchainAuditConfig({ data, onChange, inputData }: BlockchainAuditConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-2 text-indigo-600">
        <Shield className="h-5 w-5" />
        <span className="font-semibold">Blockchain Audit Configuration</span>
      </div>

      <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs">
        <p className="font-medium text-indigo-600 mb-1">🔒 Immutable Audit Trail</p>
        <p className="text-muted-foreground">
          Creates tamper-proof audit records on Cronos blockchain for compliance and verification.
        </p>
      </div>

      {/* Data to Hash */}
      <div className="space-y-2">
        <Label htmlFor="dataToHash">Additional Fields to Hash</Label>
        <Textarea
          id="dataToHash"
          placeholder="previous.output, trigger.userId, gate.amount"
          value={(data.dataToHash as string) || ""}
          onChange={(e) => handleChange("dataToHash", e.target.value)}
          rows={2}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated field paths to include in audit hash
        </p>
      </div>

      {/* Custom Metadata */}
      <div className="space-y-2">
        <Label htmlFor="customMetadata">Custom Metadata (JSON)</Label>
        <Textarea
          id="customMetadata"
          placeholder={`{
  "department": "finance",
  "category": "payment"
}`}
          value={(data.customMetadata as string) || ""}
          onChange={(e) => handleChange("customMetadata", e.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Optional metadata stored with audit record
        </p>
      </div>

      {/* Storage Contract */}
      <div className="space-y-2">
        <Label htmlFor="storageContract">Audit Contract (Optional)</Label>
        <Input
          id="storageContract"
          placeholder="0x... (leave empty for default)"
          value={(data.storageContract as string) || ""}
          onChange={(e) => handleChange("storageContract", e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Custom audit storage contract address
        </p>
      </div>

      {/* Include Flags */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Include in Audit:</Label>
        
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
          <div className="space-y-0.5">
            <Label htmlFor="includeTimestamp" className="text-sm">Timestamp</Label>
          </div>
          <Switch
            id="includeTimestamp"
            checked={(data.includeTimestamp as boolean) ?? true}
            onCheckedChange={(checked) => handleChange("includeTimestamp", checked)}
          />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
          <div className="space-y-0.5">
            <Label htmlFor="includeWorkflowId" className="text-sm">Workflow ID</Label>
          </div>
          <Switch
            id="includeWorkflowId"
            checked={(data.includeWorkflowId as boolean) ?? true}
            onCheckedChange={(checked) => handleChange("includeWorkflowId", checked)}
          />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
          <div className="space-y-0.5">
            <Label htmlFor="includeExecutionId" className="text-sm">Execution ID</Label>
          </div>
          <Switch
            id="includeExecutionId"
            checked={(data.includeExecutionId as boolean) ?? true}
            onCheckedChange={(checked) => handleChange("includeExecutionId", checked)}
          />
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
          <div className="space-y-0.5">
            <Label htmlFor="includePaymentProof" className="text-sm">Payment Proof</Label>
          </div>
          <Switch
            id="includePaymentProof"
            checked={(data.includePaymentProof as boolean) ?? true}
            onCheckedChange={(checked) => handleChange("includePaymentProof", checked)}
          />
        </div>
      </div>

      {/* Attach to Response */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
        <div className="space-y-0.5">
          <Label htmlFor="attachToResponse">Attach to Response</Label>
          <p className="text-xs text-muted-foreground">
            Include audit hash in workflow response
          </p>
        </div>
        <Switch
          id="attachToResponse"
          checked={(data.attachToResponse as boolean) ?? true}
          onCheckedChange={(checked) => handleChange("attachToResponse", checked)}
        />
      </div>

      {/* How It Works */}
      <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
        <p className="font-medium flex items-center gap-1">
          <Info className="h-3 w-3" /> How It Works:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Collects data from specified fields</li>
          <li>Creates cryptographic hash of audit data</li>
          <li>Stores hash on Cronos blockchain</li>
          <li>Returns transaction hash for verification</li>
          <li>Audit can be verified on Cronoscan</li>
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
