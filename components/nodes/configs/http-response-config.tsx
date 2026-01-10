/**
 * HTTP Response Configuration
 * 
 * Configuration panel for the HTTP Response node.
 * Returns custom HTTP responses with specific status codes.
 */

"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MailCheck, Info } from "lucide-react";

// Define status codes inline
const STATUS_OPTIONS = [
  { value: "200", label: "200 OK" },
  { value: "201", label: "201 Created" },
  { value: "202", label: "202 Accepted" },
  { value: "400", label: "400 Bad Request" },
  { value: "401", label: "401 Unauthorized" },
  { value: "402", label: "402 Payment Required" },
  { value: "403", label: "403 Forbidden" },
  { value: "404", label: "404 Not Found" },
  { value: "429", label: "429 Too Many Requests" },
  { value: "500", label: "500 Internal Server Error" },
  { value: "503", label: "503 Service Unavailable" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "application/json", label: "JSON" },
  { value: "text/plain", label: "Plain Text" },
  { value: "text/html", label: "HTML" },
  { value: "application/xml", label: "XML" },
];

// Output field definitions
const OUTPUT_FIELDS = [
  { key: "sent", label: "Response Sent" },
  { key: "statusCode", label: "Status Code" },
];

interface HttpResponseConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

const STATUS_COLORS: Record<number, string> = {
  200: "text-green-600",
  201: "text-green-600",
  202: "text-green-600",
  400: "text-red-600",
  401: "text-orange-600",
  402: "text-amber-600",
  403: "text-red-600",
  404: "text-red-600",
  429: "text-orange-600",
  500: "text-red-600",
  503: "text-orange-600",
};

export function HttpResponseConfig({ data, onChange, inputData }: HttpResponseConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ [key]: value });
  };

  const statusCode = (data.statusCode as number) || 200;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-2 text-purple-600">
        <MailCheck className="h-5 w-5" />
        <span className="font-semibold">HTTP Response Configuration</span>
      </div>

      <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-xs">
        <p className="font-medium text-purple-600 mb-1">📨 Custom Response</p>
        <p className="text-muted-foreground">
          Return custom HTTP status codes, headers, and body. Essential for x402 flow.
        </p>
      </div>

      {/* Status Code */}
      <div className="space-y-2">
        <Label htmlFor="statusCode">Status Code</Label>
        <Select
          value={String(statusCode)}
          onValueChange={(value) => handleChange("statusCode", parseInt(value))}
        >
          <SelectTrigger id="statusCode" className={STATUS_COLORS[statusCode]}>
            <SelectValue placeholder="Select status code" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem 
                key={opt.value} 
                value={opt.value}
                className={STATUS_COLORS[Number(opt.value)]}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusCode === 402 && (
          <p className="text-xs text-amber-600 font-medium">
            ⚡ 402 Payment Required - Standard x402 response
          </p>
        )}
      </div>

      {/* Content Type */}
      <div className="space-y-2">
        <Label htmlFor="contentType">Content Type</Label>
        <Select
          value={(data.contentType as string) || "application/json"}
          onValueChange={(value) => handleChange("contentType", value)}
        >
          <SelectTrigger id="contentType">
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Response Body */}
      <div className="space-y-2">
        <Label htmlFor="body">Response Body</Label>
        <Textarea
          id="body"
          placeholder={statusCode === 402 
            ? `{
  "error": "Payment Required",
  "paymentAddress": "{{gate.recipientAddress}}",
  "amount": "{{gate.requiredAmount}}",
  "currency": "CRO"
}`
            : '{"success": true, "message": "Operation completed"}'}
          value={(data.body as string) || ""}
          onChange={(e) => handleChange("body", e.target.value)}
          rows={6}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Response body. Supports variable interpolation like {"{{previous.output}}"}
        </p>
      </div>

      {/* Custom Headers */}
      <div className="space-y-2">
        <Label htmlFor="headers">Custom Headers (JSON)</Label>
        <Textarea
          id="headers"
          placeholder={statusCode === 402
            ? `{
  "X-Payment-Address": "{{gate.recipientAddress}}",
  "X-Payment-Amount": "{{gate.requiredAmount}}",
  "X-Payment-Network": "cronos"
}`
            : '{"X-Custom-Header": "value"}'}
          value={(data.headers as string) || ""}
          onChange={(e) => handleChange("headers", e.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Optional custom headers as JSON object
        </p>
      </div>

      {/* x402 Flow Info */}
      {statusCode === 402 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs space-y-2">
          <p className="font-medium text-amber-600 flex items-center gap-1">
            <Info className="h-3 w-3" /> x402 Payment Flow:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Client requests resource without payment</li>
            <li>Server returns 402 with payment details</li>
            <li>Client makes payment on Cronos</li>
            <li>Client retries with <code className="bg-background px-1 rounded">x-payment-proof</code> header</li>
            <li>Server verifies payment and grants access</li>
          </ol>
        </div>
      )}

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
