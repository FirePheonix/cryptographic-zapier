/**
 * Gmail/Email Node Configuration
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { CheckCircle2, Link, Unlink } from "lucide-react";
import { DroppableInput, DroppableTextarea } from "../droppable-input";

const OPERATIONS = [
  { value: "send", label: "Send Email", description: "Send a new email" },
  { value: "draft", label: "Create Draft", description: "Create an email draft" },
  { value: "reply", label: "Reply to Email", description: "Reply to an existing thread" },
];

interface GmailConfigProps {
  data: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  inputData?: Record<string, any>;
}

// Debounce hook for text inputs
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

export function GmailConfig({ data, onChange, inputData }: GmailConfigProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [credentialEmail, setCredentialEmail] = useState<string | null>(null);
  
  // Local state for text inputs (for smooth typing)
  const [localTo, setLocalTo] = useState((data.to as string) || "");
  const [localCc, setLocalCc] = useState((data.cc as string) || "");
  const [localBcc, setLocalBcc] = useState((data.bcc as string) || "");
  const [localSubject, setLocalSubject] = useState((data.subject as string) || "");
  const [localBody, setLocalBody] = useState((data.body as string) || "");
  
  // Sync local state when data changes from external source
  useEffect(() => { setLocalTo((data.to as string) || ""); }, [data.to]);
  useEffect(() => { setLocalCc((data.cc as string) || ""); }, [data.cc]);
  useEffect(() => { setLocalBcc((data.bcc as string) || ""); }, [data.bcc]);
  useEffect(() => { setLocalSubject((data.subject as string) || ""); }, [data.subject]);
  useEffect(() => { setLocalBody((data.body as string) || ""); }, [data.body]);
  
  // Debounced onChange for text inputs (300ms delay)
  const debouncedOnChange = useDebouncedCallback(onChange, 300);

  // Check for existing Google credentials on mount
  useEffect(() => {
    checkGoogleCredentials();
  }, []);

  const checkGoogleCredentials = async () => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      const response = await fetch("/api/credentials");
      if (response.ok) {
        const result = await response.json();
        const googleCred = result.credentials?.find(
          (c: { provider: string; email?: string; name?: string }) => c.provider === "google"
        );
        if (googleCred) {
          setCredentialEmail(googleCred.email || googleCred.name || "Connected");
          onChange({ connected: true, email: googleCred.email || googleCred.name });
        } else {
          onChange({ connected: false, email: undefined });
        }
      }
    } catch (err) {
      setConnectionError("Failed to check connection");
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = data.connected === true;
  const operation = (data.operation as string) || "send";

  const connectGmail = () => {
    setIsConnecting(true);
    setConnectionError(null);
    // Redirect to Google OAuth - the callback will redirect back to this page
    const currentPath = window.location.pathname;
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(currentPath)}`;
  };

  const disconnectGmail = async () => {
    try {
      setIsLoading(true);
      // Get credential ID first
      const response = await fetch("/api/credentials");
      if (response.ok) {
        const result = await response.json();
        const googleCred = result.credentials?.find(
          (c: { provider: string; id: string }) => c.provider === "google"
        );
        if (googleCred) {
          await fetch(`/api/credentials?id=${googleCred.id}`, { method: "DELETE" });
        }
      }
      setCredentialEmail(null);
      onChange({ connected: false, email: undefined });
    } catch (err) {
      setConnectionError("Failed to disconnect");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Error */}
      {connectionError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-destructive">
            <Unlink className="h-4 w-4" />
            <span className="text-sm font-medium">Connection Failed</span>
          </div>
          <p className="text-xs text-destructive/80 mt-1">{connectionError}</p>
        </div>
      )}

      {/* Connection Status */}
      <div className="rounded-md border p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Checking connection...</span>
          </div>
        ) : isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnectGmail}>
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {credentialEmail || (data.email as string) || "Google account connected"}
            </p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account to send emails
            </p>
            <Button onClick={connectGmail} disabled={isConnecting}>
              <Link className="h-4 w-4 mr-2" />
              {isConnecting ? "Redirecting to Google..." : "Connect Gmail"}
            </Button>
          </div>
        )}
      </div>

      {/* Operation */}
      <div className="space-y-2">
        <Label>Operation</Label>
        <Select
          value={operation}
          onValueChange={(value) => onChange({ operation: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            {OPERATIONS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                <div className="flex flex-col">
                  <span>{op.label}</span>
                  <span className="text-xs text-muted-foreground">{op.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* To */}
      <div className="space-y-2">
        <Label>
          To
          <Badge variant="secondary" className="ml-2 text-xs">
            Required
          </Badge>
        </Label>
        <DroppableInput
          placeholder="recipient@example.com"
          value={localTo}
          onValueChange={(value) => {
            setLocalTo(value);
            debouncedOnChange({ to: value });
          }}
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5" />
          <span>
            Drag fields from INPUT panel or use <code className="bg-muted px-1 rounded">{"{{input.email}}"}</code>
          </span>
        </div>
      </div>

      {/* CC */}
      <div className="space-y-2">
        <Label>CC</Label>
        <DroppableInput
          placeholder="cc@example.com"
          value={localCc}
          onValueChange={(value) => {
            setLocalCc(value);
            debouncedOnChange({ cc: value });
          }}
        />
      </div>

      {/* BCC */}
      <div className="space-y-2">
        <Label>BCC</Label>
        <DroppableInput
          placeholder="bcc@example.com"
          value={localBcc}
          onValueChange={(value) => {
            setLocalBcc(value);
            debouncedOnChange({ bcc: value });
          }}
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label>
          Subject
          <Badge variant="secondary" className="ml-2 text-xs">
            Supports variables
          </Badge>
        </Label>
        <DroppableInput
          placeholder="Payment received: {{input.amount}} SOL"
          value={localSubject}
          onValueChange={(value) => {
            setLocalSubject(value);
            debouncedOnChange({ subject: value });
          }}
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label>
          Message Body
          <Badge variant="secondary" className="ml-2 text-xs">
            Supports variables
          </Badge>
        </Label>
        <DroppableTextarea
          placeholder={`Hi,

You received a payment of {{input.amount}} SOL from {{input.from}}.

Transaction: {{input.signature}}

Best regards`}
          value={localBody}
          onValueChange={(value) => {
            setLocalBody(value);
            debouncedOnChange({ body: value });
          }}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      {/* HTML Mode */}
      <div className="flex items-center justify-between">
        <div>
          <Label>HTML Mode</Label>
          <p className="text-xs text-muted-foreground">
            Send as HTML email
          </p>
        </div>
        <input
          type="checkbox"
          checked={(data.htmlMode as boolean) || false}
          onChange={(e) => onChange({ htmlMode: e.target.checked })}
          className="h-4 w-4"
        />
      </div>

      {/* Output Fields Info */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-2">Output Fields</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">messageId</code>
            <span>Gmail message ID</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">threadId</code>
            <span>Email thread ID</span>
          </div>
          <div className="flex justify-between">
            <code className="bg-muted px-1.5 py-0.5 rounded">success</code>
            <span>Whether email was sent</span>
          </div>
        </div>
      </div>
    </div>
  );
}


