/**
 * Webhook Trigger Configuration Panel
 * 
 * Configuration for the Webhook Trigger node.
 * Sets up HTTP endpoint, method, and response mode.
 * Matches n8n's webhook configuration UI.
 */

"use client";

import { memo, useState } from "react";
import { Webhook, Info, Copy, Check, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflow } from "@/providers/workflow";
import { cn } from "@/lib/utils";

interface WebhookTriggerConfigProps {
  nodeId: string;
  data: {
    label?: string;
    httpMethod?: string;
    path?: string;
    responseMode?: string;
    authentication?: string;
    lastTriggered?: string;
    testData?: any;
  };
  onUpdate: (data: Record<string, unknown>) => void;
}

const HTTP_METHODS = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
  { value: "PATCH", label: "PATCH" },
  { value: "HEAD", label: "HEAD" },
  { value: "OPTIONS", label: "OPTIONS" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-600",
  POST: "bg-blue-600",
  PUT: "bg-orange-500",
  DELETE: "bg-red-600",
  PATCH: "bg-purple-600",
  HEAD: "bg-gray-600",
  OPTIONS: "bg-gray-500",
};

const RESPONSE_MODES = [
  { value: "onReceived", label: "Immediately" },
  { value: "lastNode", label: "Using 'Respond to Webhook' Node" },
];

const AUTH_OPTIONS = [
  { value: "none", label: "None" },
  { value: "headerAuth", label: "Header Auth" },
  { value: "basicAuth", label: "Basic Auth" },
];

export const WebhookTriggerConfig = memo(({ nodeId, data, onUpdate }: WebhookTriggerConfigProps) => {
  const workflow = useWorkflow();
  const [copied, setCopied] = useState(false);
  const [urlTab, setUrlTab] = useState<"test" | "production">("test");
  const [optionsOpen, setOptionsOpen] = useState(false);

  const httpMethod = data.httpMethod || "GET";
  const responseMode = data.responseMode || "onReceived";
  // Always use nodeId as the webhook path for consistency
  // This ensures the URL matches what the listener polls for
  const path = nodeId;
  const authentication = data.authentication || "none";

  // Generate webhook URLs - using localhost:3000 for local development
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const testUrl = `${baseUrl}/api/webhook-test/${path}`;
  const productionUrl = `${baseUrl}/api/webhook/${path}`;
  const currentUrl = urlTab === "test" ? testUrl : productionUrl;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Webhook URLs Section */}
      <div className="space-y-3">
        <button
          type="button"
          className="flex items-center gap-2 text-orange-400 text-sm font-medium"
          onClick={() => {}}
        >
          <ChevronDown className="w-4 h-4" />
          Webhook URLs
        </button>

        {/* URL Tabs */}
        <Tabs value={urlTab} onValueChange={(v) => setUrlTab(v as "test" | "production")}>
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="test" className="text-xs">Test URL</TabsTrigger>
            <TabsTrigger value="production" className="text-xs">Production URL</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* URL Display */}
        <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-md p-2 border border-[#333]">
          <Badge className={cn("text-[10px] px-1.5 py-0.5 font-bold", METHOD_COLORS[httpMethod])}>
            {httpMethod}
          </Badge>
          <span className="flex-1 font-mono text-xs text-muted-foreground truncate">
            {currentUrl}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* HTTP Method */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">HTTP Method</Label>
        <Select
          value={httpMethod}
          onValueChange={(value) => onUpdate({ httpMethod: value })}
        >
          <SelectTrigger className="bg-[#1a1a1a] border-[#333]">
            <SelectValue placeholder="Select HTTP method" />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Path */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            Path
            <Info className="w-3 h-3" />
          </Label>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#333]">Fixed</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-400 border-orange-400/50">Expression</Badge>
          </div>
        </div>
        <Input
          value={path}
          onChange={(e) => onUpdate({ path: e.target.value })}
          className="font-mono text-sm bg-[#1a1a1a] border-[#333]"
          placeholder="webhook-path"
        />
      </div>

      {/* Authentication */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Authentication</Label>
        <Select
          value={authentication}
          onValueChange={(value) => onUpdate({ authentication: value })}
        >
          <SelectTrigger className="bg-[#1a1a1a] border-[#333]">
            <SelectValue placeholder="Select authentication" />
          </SelectTrigger>
          <SelectContent>
            {AUTH_OPTIONS.map((auth) => (
              <SelectItem key={auth.value} value={auth.value}>
                {auth.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Respond */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Respond</Label>
        <Select
          value={responseMode}
          onValueChange={(value) => onUpdate({ responseMode: value })}
        >
          <SelectTrigger className="bg-[#1a1a1a] border-[#333]">
            <SelectValue placeholder="Select response mode" />
          </SelectTrigger>
          <SelectContent>
            {RESPONSE_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Options Section */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
        <div className="text-xs text-muted-foreground/70 py-2">No properties</div>
        <Button 
          variant="outline" 
          className="w-full justify-between bg-[#1a1a1a] border-[#333] text-muted-foreground"
          onClick={() => setOptionsOpen(!optionsOpen)}
        >
          Add option
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Last triggered */}
      {data.lastTriggered && (
        <div className="text-xs text-muted-foreground pt-2 border-t border-[#333]">
          Last triggered: {new Date(data.lastTriggered).toLocaleString()}
        </div>
      )}
    </div>
  );
});

WebhookTriggerConfig.displayName = "WebhookTriggerConfig";

export default WebhookTriggerConfig;
