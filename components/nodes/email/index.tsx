"use client";

import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { MailIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NodeLayout } from "../layout";

export type EmailNodeData = {
  to?: string;
  subject?: string;
  body?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
};

type EmailNodeProps = NodeProps & {
  data: EmailNodeData;
};

export const EmailNode = ({ id, data, type }: EmailNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (field: keyof EmailNodeData, value: string) => {
    updateNodeData(id, { ...data, [field]: value });
  };

  return (
    <NodeLayout id={id} data={data} type={type} title="Email (SMTP)">
      <div className="flex flex-col gap-4 p-4 min-w-80">
        <div className="flex items-center gap-2 text-primary">
          <MailIcon className="h-5 w-5" />
          <span className="font-semibold">Send Email</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-to`}>To</Label>
            <Input
              id={`${id}-to`}
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
              placeholder="Email body... Use {{previous.output}} for interpolation"
              value={data.body || ""}
              onChange={(e) => handleChange("body", e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-xs">
          <p className="font-medium mb-1">Variable Interpolation:</p>
          <p className="text-muted-foreground font-mono">
            {"{{previous.output}}"} - Output from previous node
          </p>
          <p className="text-muted-foreground font-mono">
            {"{{trigger.fieldName}}"} - Field from trigger payload
          </p>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer font-medium">SMTP Settings (Optional)</summary>
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`${id}-smtp-host`}>Host</Label>
                <Input
                  id={`${id}-smtp-host`}
                  placeholder="smtp.gmail.com"
                  value={data.smtpHost || ""}
                  onChange={(e) => handleChange("smtpHost", e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`${id}-smtp-port`}>Port</Label>
                <Input
                  id={`${id}-smtp-port`}
                  placeholder="587"
                  value={data.smtpPort || ""}
                  onChange={(e) => handleChange("smtpPort", e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${id}-smtp-user`}>Username</Label>
              <Input
                id={`${id}-smtp-user`}
                placeholder="user@gmail.com"
                value={data.smtpUser || ""}
                onChange={(e) => handleChange("smtpUser", e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`${id}-smtp-pass`}>Password</Label>
              <Input
                id={`${id}-smtp-pass`}
                type="password"
                placeholder="App password"
                value={data.smtpPass || ""}
                onChange={(e) => handleChange("smtpPass", e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </details>
      </div>
    </NodeLayout>
  );
};


