/**
 * HTTP Request Configuration
 * 
 * Configuration panel for the HTTP Request node.
 * Makes HTTP requests to external APIs.
 */

"use client";

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
import { Globe, Info } from "lucide-react";

// Define method options inline
const METHOD_OPTIONS = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

// Output field definitions
const OUTPUT_FIELDS = [
  { key: "status", label: "HTTP Status Code" },
  { key: "statusText", label: "Status Text" },
  { key: "data", label: "Response Data" },
  { key: "headers", label: "Response Headers" },
];

interface HttpRequestConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

export function HttpRequestConfig({ data, onChange, inputData }: HttpRequestConfigProps) {
  const handleChange = (key: string, value: unknown) => {
    onChange({ [key]: value });
  };

  const method = (data.method as string) || "GET";
  const showBody = ["POST", "PUT", "PATCH"].includes(method);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-2 text-blue-600">
        <Globe className="h-5 w-5" />
        <span className="font-semibold">HTTP Request Configuration</span>
      </div>

      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs">
        <p className="font-medium text-blue-600 mb-1">🌐 Make HTTP Request</p>
        <p className="text-muted-foreground">
          Send HTTP requests to external APIs and services.
        </p>
      </div>

      {/* Method */}
      <div className="space-y-2">
        <Label htmlFor="method">Method</Label>
        <Select
          value={method}
          onValueChange={(value) => handleChange("method", value)}
        >
          <SelectTrigger id="method">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="font-mono">{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="url" className="flex items-center gap-2">
          URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="url"
          placeholder="https://api.example.com/endpoint"
          value={(data.url as string) || ""}
          onChange={(e) => handleChange("url", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Supports variables: {"{{previous.output}}"}, {"{{trigger.fieldName}}"}
        </p>
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <Label htmlFor="headers">Headers (JSON)</Label>
        <Textarea
          id="headers"
          placeholder={`{
  "Authorization": "Bearer {{trigger.token}}",
  "Content-Type": "application/json"
}`}
          value={(data.headers as string) || ""}
          onChange={(e) => handleChange("headers", e.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
      </div>

      {/* Body - only for POST/PUT/PATCH */}
      {showBody && (
        <div className="space-y-2">
          <Label htmlFor="body">Request Body (JSON)</Label>
          <Textarea
            id="body"
            placeholder={`{
  "name": "{{trigger.name}}",
  "data": "{{previous.output}}"
}`}
            value={(data.body as string) || ""}
            onChange={(e) => handleChange("body", e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
        </div>
      )}

      {/* Timeout */}
      <div className="space-y-2">
        <Label htmlFor="timeout">Timeout (ms)</Label>
        <Input
          id="timeout"
          type="number"
          placeholder="30000"
          value={(data.timeout as number) || ""}
          onChange={(e) => handleChange("timeout", parseInt(e.target.value) || 30000)}
        />
        <p className="text-xs text-muted-foreground">
          Request timeout in milliseconds (default: 30000)
        </p>
      </div>

      {/* Variable Interpolation Help */}
      <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
        <p className="font-medium flex items-center gap-1">
          <Info className="h-3 w-3" /> Variable Interpolation:
        </p>
        <p className="text-muted-foreground font-mono">
          {"{{previous.output}}"} - Output from previous node
        </p>
        <p className="text-muted-foreground font-mono">
          {"{{trigger.fieldName}}"} - Field from trigger payload
        </p>
        <p className="text-muted-foreground font-mono">
          {"{{gate.verified}}"} - x402 gate verification status
        </p>
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
