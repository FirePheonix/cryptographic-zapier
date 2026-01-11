/**
 * Gmail Node Component
 * 
 * PURELY DECLARATIVE - No API logic here.
 * This component only renders the UI based on the node schema.
 * All execution happens in the engine (lib/engine/adapters/google.ts).
 */

"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { MailIcon, SendIcon, InboxIcon, FileTextIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NodeLayout } from "../layout";
import { gmailSchema } from "@/lib/engine/node-schemas";
import { GoogleConnection } from "@/components/google-connection";

// Operations from schema
const OPERATIONS = gmailSchema.operations?.filter(op => op.id !== "gmail.watchInbox") || [];

export type GmailNodeData = {
  operation?: string;
  to?: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  messageId?: string;
  query?: string;
  maxResults?: number;
  credentialId?: string;
};

type GmailNodeProps = NodeProps & {
  data: GmailNodeData;
};

const OperationIcon = ({ operation }: { operation?: string }) => {
  switch (operation) {
    case "gmail.send":
      return <SendIcon className="h-4 w-4" />;
    case "gmail.read":
      return <InboxIcon className="h-4 w-4" />;
    case "gmail.createDraft":
      return <FileTextIcon className="h-4 w-4" />;
    default:
      return <MailIcon className="h-4 w-4" />;
  }
};

export const GmailNode = ({ id, data, type }: GmailNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const operation = data.operation || "gmail.send";

  const handleChange = (field: keyof GmailNodeData, value: string | number) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title={gmailSchema.name}>
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-red-600">
          <MailIcon className="h-5 w-5" />
          <span className="font-semibold">{gmailSchema.name}</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-operation`}>Operation</Label>
            <Select
              value={operation}
              onValueChange={(value) => handleChange("operation", value)}
            >
              <SelectTrigger id={`${id}-operation`}>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                {OPERATIONS.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    <div className="flex items-center gap-2">
                      <OperationIcon operation={op.id} />
                      <span>{op.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Send/Draft fields */}
          {(operation === "gmail.send" || operation === "gmail.createDraft") && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-to`}>To</Label>
                <Input
                  id={`${id}-to`}
                  type="email"
                  placeholder="recipient@example.com"
                  value={data.to || ""}
                  onChange={(e) => handleChange("to", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${id}-subject`}>Subject</Label>
                <Input
                  id={`${id}-subject`}
                  placeholder="Email subject..."
                  value={data.subject || ""}
                  onChange={(e) => handleChange("subject", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${id}-body`}>Body</Label>
                <Textarea
                  id={`${id}-body`}
                  placeholder="Email content... Use {{previous.output}} for variables"
                  value={data.body || ""}
                  onChange={(e) => handleChange("body", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-cc`}>CC (Optional)</Label>
                  <Input
                    id={`${id}-cc`}
                    type="email"
                    placeholder="cc@example.com"
                    value={data.cc || ""}
                    onChange={(e) => handleChange("cc", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-bcc`}>BCC (Optional)</Label>
                  <Input
                    id={`${id}-bcc`}
                    type="email"
                    placeholder="bcc@example.com"
                    value={data.bcc || ""}
                    onChange={(e) => handleChange("bcc", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Read message field */}
          {operation === "gmail.read" && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-messageId`}>Message ID</Label>
              <Input
                id={`${id}-messageId`}
                placeholder="Message ID from trigger..."
                value={data.messageId || ""}
                onChange={(e) => handleChange("messageId", e.target.value)}
              />
            </div>
          )}

          {/* Search fields */}
          {operation === "gmail.search" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-query`}>Search Query</Label>
                <Input
                  id={`${id}-query`}
                  placeholder="from:example@email.com is:unread"
                  value={data.query || ""}
                  onChange={(e) => handleChange("query", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-maxResults`}>Max Results</Label>
                <Input
                  id={`${id}-maxResults`}
                  type="number"
                  placeholder="10"
                  value={data.maxResults || ""}
                  onChange={(e) => handleChange("maxResults", Number.parseInt(e.target.value) || 10)}
                />
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs">
          <p className="font-medium mb-1">Variable Interpolation:</p>
          <p className="text-muted-foreground font-mono">
            {"{{trigger.from}}"} - Sender from trigger email
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{previous.output}}"} - Output from previous node
          </p>
        </div>

        {/* Google Connection Status */}
        <GoogleConnection service="gmail" />
      </div>
    </NodeLayout>
  );
};


