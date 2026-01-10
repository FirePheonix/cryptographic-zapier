/**
 * Blockchain Audit Node
 * 
 * Optional but powerful node for x402 workflows.
 * 
 * Responsibility:
 * "Record payment proof and execution data to blockchain for immutability"
 * 
 * What it does:
 * - Hashes workflow execution data
 * - Stores transaction hash on-chain
 * - Attaches metadata to response
 * - Creates immutable audit trail
 * 
 * Use cases:
 * - Compliance / regulatory requirements
 * - Dispute resolution
 * - Transparent payment records
 * - Multi-party verification
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { ShieldIcon, FileTextIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NodeLayout } from "../layout";

export type BlockchainAuditNodeData = {
  dataToHash?: string; // Fields to include in audit hash
  storageContract?: string; // Optional: Custom audit contract address
  includeTimestamp?: boolean;
  includeWorkflowId?: boolean;
  includeExecutionId?: boolean;
  includePaymentProof?: boolean;
  customMetadata?: string; // Additional metadata as JSON
  attachToResponse?: boolean; // Include audit hash in workflow response
};

type BlockchainAuditNodeProps = NodeProps & {
  data: BlockchainAuditNodeData;
};

export const BlockchainAuditNode = ({ id, data, type }: BlockchainAuditNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (field: keyof BlockchainAuditNodeData, value: string | boolean) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title="Blockchain Audit">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-indigo-600">
          <ShieldIcon className="h-5 w-5" />
          <span className="font-semibold">Blockchain Audit</span>
        </div>

        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs">
          <p className="font-medium text-indigo-600 mb-1">🔒 Immutable Record</p>
          <p className="text-muted-foreground">
            Creates verifiable, tamper-proof audit trail on Cronos blockchain.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Audit Data to Record</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="space-y-0.5">
                  <Label htmlFor={`${id}-timestamp`} className="text-xs">
                    Timestamp
                  </Label>
                </div>
                <Switch
                  id={`${id}-timestamp`}
                  checked={data.includeTimestamp ?? true}
                  onCheckedChange={(checked) => handleChange("includeTimestamp", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="space-y-0.5">
                  <Label htmlFor={`${id}-workflow`} className="text-xs">
                    Workflow ID
                  </Label>
                </div>
                <Switch
                  id={`${id}-workflow`}
                  checked={data.includeWorkflowId ?? true}
                  onCheckedChange={(checked) => handleChange("includeWorkflowId", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="space-y-0.5">
                  <Label htmlFor={`${id}-execution`} className="text-xs">
                    Execution ID
                  </Label>
                </div>
                <Switch
                  id={`${id}-execution`}
                  checked={data.includeExecutionId ?? true}
                  onCheckedChange={(checked) => handleChange("includeExecutionId", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="space-y-0.5">
                  <Label htmlFor={`${id}-payment`} className="text-xs">
                    Payment Proof (txHash)
                  </Label>
                </div>
                <Switch
                  id={`${id}-payment`}
                  checked={data.includePaymentProof ?? true}
                  onCheckedChange={(checked) => handleChange("includePaymentProof", checked)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-data`}>Additional Fields to Hash</Label>
            <Textarea
              id={`${id}-data`}
              placeholder="previous.output, trigger.userId, gate.amount"
              value={data.dataToHash || ""}
              onChange={(e) => handleChange("dataToHash", e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated field paths. Example: previous.email, trigger.amount
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-metadata`}>Custom Metadata (JSON)</Label>
            <Textarea
              id={`${id}-metadata`}
              placeholder='{"department": "finance", "approver": "{{trigger.approver}}"}'
              value={data.customMetadata || ""}
              onChange={(e) => handleChange("customMetadata", e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Optional metadata stored with audit record
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-contract`}>Audit Contract (Optional)</Label>
            <Input
              id={`${id}-contract`}
              placeholder="0x... (leave empty for default)"
              value={data.storageContract || ""}
              onChange={(e) => handleChange("storageContract", e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Custom audit storage contract. Uses default Zynthex Audit Contract if empty.
            </p>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
            <div className="space-y-0.5">
              <Label htmlFor={`${id}-attach`}>Attach to Response</Label>
              <p className="text-xs text-muted-foreground">
                Include audit hash in workflow response
              </p>
            </div>
            <Switch
              id={`${id}-attach`}
              checked={data.attachToResponse ?? true}
              onCheckedChange={(checked) => handleChange("attachToResponse", checked)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
          <p className="font-medium">How It Works:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Collects specified fields from workflow execution</li>
            <li>Creates SHA-256 hash of combined data</li>
            <li>Stores hash + metadata on Cronos blockchain</li>
            <li>Returns audit transaction hash</li>
            <li>Data becomes immutable and verifiable forever</li>
          </ol>
        </div>

        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs space-y-2">
          <p className="font-medium text-indigo-600">Use Cases:</p>
          <p className="text-muted-foreground">
            <FileTextIcon className="h-3 w-3 inline mr-1" />
            <strong>Compliance:</strong> Regulatory audit trails for financial transactions
          </p>
          <p className="text-muted-foreground">
            <FileTextIcon className="h-3 w-3 inline mr-1" />
            <strong>Disputes:</strong> Verifiable proof of payment and execution
          </p>
          <p className="text-muted-foreground">
            <FileTextIcon className="h-3 w-3 inline mr-1" />
            <strong>Transparency:</strong> Public or partner verification of operations
          </p>
          <p className="text-muted-foreground">
            <FileTextIcon className="h-3 w-3 inline mr-1" />
            <strong>Multi-party:</strong> Trustless collaboration and record-keeping
          </p>
        </div>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
          <p className="font-medium text-blue-600 mb-1">Output Fields:</p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">auditHash</span> - SHA-256 hash of audit data
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">auditTxHash</span> - Blockchain transaction hash
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">blockNumber</span> - Block number on Cronos
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">timestamp</span> - Unix timestamp
          </p>
          <p className="text-muted-foreground">
            <span className="font-mono text-blue-600">verifyUrl</span> - Cronoscan link for verification
          </p>
        </div>
      </div>
    </NodeLayout>
  );
};
