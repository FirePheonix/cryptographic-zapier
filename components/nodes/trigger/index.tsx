"use client";

import type { NodeProps } from "@xyflow/react";
import { CopyIcon, WebhookIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkflow } from "@/providers/workflow";
import { NodeLayout } from "../layout";

export type TriggerNodeData = {
  webhookUrl?: string;
  lastTriggered?: string;
  samplePayload?: Record<string, unknown>;
};

type TriggerNodeProps = NodeProps & {
  data: TriggerNodeData;
};

export const TriggerNode = ({ id, data, type }: TriggerNodeProps) => {
  const workflow = useWorkflow();
  const [copied, setCopied] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/trigger/${workflow?.id}`
      : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeLayout id={id} data={data} type={type} title="Trigger (Webhook)">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-primary">
          <WebhookIcon className="h-5 w-5" />
          <span className="font-semibold">HTTP Webhook</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy URL"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-green-600">Copied to clipboard!</p>
          )}
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs">
          <p className="font-medium mb-1">How to use:</p>
          <p className="text-muted-foreground">
            Send a POST request with JSON body to this URL to trigger the
            workflow. The JSON payload will be passed to the next node.
          </p>
        </div>

        {data.lastTriggered && (
          <p className="text-xs text-muted-foreground">
            Last triggered: {new Date(data.lastTriggered).toLocaleString()}
          </p>
        )}

        <div className="space-y-2">
          <Label>Sample Payload</Label>
          <pre className="rounded-lg bg-muted p-2 text-xs overflow-auto max-h-32">
            {JSON.stringify(
              data.samplePayload || { message: "Hello, World!" },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </NodeLayout>
  );
};


