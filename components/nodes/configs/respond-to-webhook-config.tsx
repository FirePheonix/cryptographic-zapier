/**
 * Respond to Webhook Configuration Panel
 * 
 * Configuration for the Respond to Webhook node.
 * Sets HTTP response status, headers, and body.
 * Matches n8n's respond to webhook configuration UI.
 */

"use client";

import { memo, useState } from "react";
import { Reply, Info, Plus, Trash2, AlertCircle, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RespondToWebhookConfigProps {
  nodeId: string;
  data: {
    label?: string;
    statusCode?: number | string;
    contentType?: string;
    responseBody?: string;
    headers?: Array<{ key: string; value: string }>;
    respondWith?: string;
  };
  onUpdate: (data: Record<string, unknown>) => void;
}

const RESPOND_WITH_OPTIONS = [
  { value: "allInputs", label: "All Incoming Items" },
  { value: "firstInput", label: "First Item Only" },
  { value: "lastInput", label: "Last Item Only" },
  { value: "noData", label: "No Response Body" },
];

export const RespondToWebhookConfig = memo(({ nodeId, data, onUpdate }: RespondToWebhookConfigProps) => {
  const respondWith = data.respondWith || "allInputs";
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Warning Alert */}
      <Alert className="bg-orange-500/10 border-orange-500/30">
        <AlertCircle className="h-4 w-4 text-orange-400" />
        <AlertDescription className="text-xs text-orange-200">
          Verify that the "Webhook" node's "Respond" parameter is set to "Using Respond to Webhook Node".{" "}
          <a href="#" className="text-orange-400 hover:underline">More details</a>
        </AlertDescription>
      </Alert>

      {/* Respond With */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            Respond With
            <Info className="w-3 h-3" />
          </Label>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#333]">Fixed</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-400 border-orange-400/50">Expression</Badge>
          </div>
        </div>
        <Select
          value={respondWith}
          onValueChange={(value) => onUpdate({ respondWith: value })}
        >
          <SelectTrigger className="bg-[#1a1a1a] border-[#333]">
            <SelectValue placeholder="Select response data" />
          </SelectTrigger>
          <SelectContent>
            {RESPOND_WITH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
    </div>
  );
});

RespondToWebhookConfig.displayName = "RespondToWebhookConfig";

export default RespondToWebhookConfig;
