/**
 * Google Connection Component
 * 
 * Shows connection status and provides button to connect Google account.
 * Used in Gmail and Google Sheets nodes.
 */

"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, LinkIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type GoogleConnectionProps = {
  service: "gmail" | "sheets";
};

type CredentialInfo = {
  id: string;
  provider: string;
  name: string;
  email?: string;
};

export function GoogleConnection({ service }: GoogleConnectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [credential, setCredential] = useState<CredentialInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/credentials");
      if (response.ok) {
        const data = await response.json();
        const googleCred = data.credentials?.find(
          (c: CredentialInfo) => c.provider === "google"
        );
        setCredential(googleCred || null);
      }
    } catch (err) {
      setError("Failed to check connection status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to Google OAuth with current page as redirect
    const currentPath = window.location.pathname;
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(currentPath)}`;
  };

  const handleDisconnect = async () => {
    if (!credential) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/credentials?id=${credential.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setCredential(null);
      }
    } catch (err) {
      setError("Failed to disconnect");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
        <div className="flex items-center gap-2">
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking connection...</span>
        </div>
      </div>
    );
  }

  if (credential) {
    return (
      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-600">Connected</p>
              <p className="text-muted-foreground">
                {credential.email || credential.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <XCircleIcon className="h-4 w-4 text-amber-600" />
          <div>
            <p className="font-medium text-amber-600">Not Connected</p>
            <p className="text-muted-foreground">
              Connect Google to use {service === "gmail" ? "Gmail" : "Google Sheets"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleConnect}
        >
          <LinkIcon className="h-3 w-3" />
          Connect
        </Button>
      </div>
      {error && (
        <p className="text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}


