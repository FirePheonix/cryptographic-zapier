/**
 * HTTP Response Node
 * 
 * Used for x402 retry/resume pattern.
 * 
 * Responsibility:
 * "Return custom HTTP responses with specific status codes"
 * 
 * What it does:
 * - Returns custom status codes (200, 402, 404, 500, etc.)
 * - Attaches custom headers
 * - Formats response body
 * - Enables proper x402 flow:
 *   Client → 402 Gate → (halts) → Returns 402
 *   Client pays → Retries → 402 Gate → (passes) → Business Logic
 * 
 * This is how you do x402 properly:
 * You do NOT auto-resume magically.
 * You let the client retry with proof.
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { MailCheckIcon, AlertCircleIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeLayout } from "../layout";

export type HttpResponseNodeData = {
  statusCode?: number;
  body?: string; // JSON or plain text response body
  headers?: string; // Custom headers as JSON
  contentType?: string;
};

type HttpResponseNodeProps = NodeProps & {
  data: HttpResponseNodeData;
};

const STATUS_CODES = [
  { value: 200, label: "200 OK", color: "text-green-600" },
  { value: 201, label: "201 Created", color: "text-green-600" },
  { value: 202, label: "202 Accepted", color: "text-green-600" },
  { value: 400, label: "400 Bad Request", color: "text-red-600" },
  { value: 401, label: "401 Unauthorized", color: "text-orange-600" },
  { value: 402, label: "402 Payment Required", color: "text-amber-600" },
  { value: 403, label: "403 Forbidden", color: "text-red-600" },
  { value: 404, label: "404 Not Found", color: "text-red-600" },
  { value: 429, label: "429 Too Many Requests", color: "text-orange-600" },
  { value: 500, label: "500 Internal Server Error", color: "text-red-600" },
  { value: 503, label: "503 Service Unavailable", color: "text-orange-600" },
];

const CONTENT_TYPES = [
  { value: "application/json", label: "JSON" },
  { value: "text/plain", label: "Plain Text" },
  { value: "text/html", label: "HTML" },
  { value: "application/xml", label: "XML" },
];

export const HttpResponseNode = ({ id, data, type }: HttpResponseNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (field: keyof HttpResponseNodeData, value: string | number) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  const statusCode = data.statusCode || 200;
  const selectedStatus = STATUS_CODES.find((s) => s.value === statusCode);

  return (
    <NodeLayout id={id} data={data} type={type} title="HTTP Response">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-purple-600">
          <MailCheckIcon className="h-5 w-5" />
          <span className="font-semibold">HTTP Response</span>
        </div>

        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-xs">
          <p className="font-medium text-purple-600 mb-1">📨 Custom Response</p>
          <p className="text-muted-foreground">
            Return custom HTTP status codes, headers, and body. Essential for x402 flow.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-status`}>Status Code</Label>
            <Select
              value={String(statusCode)}
              onValueChange={(value) => handleChange("statusCode", Number.parseInt(value))}
            >
              <SelectTrigger id={`${id}-status`}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CODES.map((status) => (
                  <SelectItem key={status.value} value={String(status.value)}>
                    <span className={status.color}>{status.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusCode === 402 && (
              <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <AlertCircleIcon className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600">
                  402 requires payment info in response body. Include payment address and amount.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-content-type`}>Content Type</Label>
            <Select
              value={data.contentType || "application/json"}
              onValueChange={(value) => handleChange("contentType", value)}
            >
              <SelectTrigger id={`${id}-content-type`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-body`}>Response Body</Label>
            <Textarea
              id={`${id}-body`}
              placeholder={
                statusCode === 402
                  ? '{"message": "Payment required", "amount": "10.0", "recipient": "0x...", "token": "CRO"}'
                  : '{"success": true, "message": "Operation completed", "data": {{previous.output}}}'
              }
              value={data.body || ""}
              onChange={(e) => handleChange("body", e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Response body. Supports variable interpolation like {"{{previous.txHash}}"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-headers`}>Custom Headers (JSON)</Label>
            <Textarea
              id={`${id}-headers`}
              placeholder='{"X-Payment-Address": "0x...", "X-Required-Amount": "10.0"}'
              value={data.headers || ""}
              onChange={(e) => handleChange("headers", e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Optional custom headers as JSON object
            </p>
          </div>
        </div>

        {statusCode === 402 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs space-y-2">
            <p className="font-medium text-amber-600">x402 Payment Flow:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Client sends request without payment proof</li>
              <li>402 Gate halts workflow</li>
              <li><strong>This node returns 402 with payment details</strong></li>
              <li>Client makes payment on Cronos</li>
              <li>Client retries request with <code className="bg-background px-1 rounded">x-payment-proof</code> header</li>
              <li>402 Gate validates and passes execution forward</li>
            </ol>
          </div>
        )}

        <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
          <p className="font-medium">Variable Interpolation:</p>
          <p className="text-muted-foreground font-mono">
            {"{{previous.output}}"} - Data from previous node
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{trigger.fieldName}}"} - Field from webhook trigger
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{gate.txHash}}"} - Transaction hash from 402 gate
          </p>
        </div>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
          <p className="font-medium text-blue-600 mb-1">Use Cases:</p>
          <p className="text-muted-foreground">• Return 402 when payment is required</p>
          <p className="text-muted-foreground">• Return 200 with success data</p>
          <p className="text-muted-foreground">• Return 429 for rate limiting</p>
          <p className="text-muted-foreground">• Custom error responses</p>
        </div>
      </div>
    </NodeLayout>
  );
};
