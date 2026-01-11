/**
 * Alchemy Connection Component
 * 
 * Allows users to add and manage their Alchemy API key
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function AlchemyConnection() {
  const [credential, setCredential] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCredential();
  }, []);

  const fetchCredential = async () => {
    try {
      const response = await fetch("/api/credentials?provider=alchemy");
      const data = await response.json();
      if (data.length > 0) {
        setCredential(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch Alchemy credential:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "alchemy",
          name: "Alchemy API Key",
          credentials: {
            type: "api_key",
            apiKey: apiKey.trim(),
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save API key");

      await fetchCredential();
      setApiKey("");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save API key:", error);
      alert("Failed to save API key. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!credential?.id) return;

    try {
      const response = await fetch(`/api/credentials/${credential.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete credential");

      setCredential(null);
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert("Failed to disconnect. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (credential) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium">Alchemy Connected</p>
            <p className="text-xs text-muted-foreground">
              API Key: {credential.credentials.apiKey.substring(0, 8)}...
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3 mb-3">
        <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">Alchemy Not Connected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your Alchemy account to watch crypto wallet addresses
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="w-full">
            Connect Alchemy
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Alchemy</DialogTitle>
            <DialogDescription>
              Enter your Alchemy API key to monitor blockchain addresses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                placeholder="Your Alchemy API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-2">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to dashboard.alchemy.com</li>
                <li>Create a free account</li>
                <li>Create a new app</li>
                <li>Copy the API key</li>
              </ol>
              <Button
                variant="link"
                size="sm"
                className="mt-2 p-0 h-auto"
                onClick={() => window.open("https://dashboard.alchemy.com", "_blank")}
              >
                Open Alchemy Dashboard
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={saveApiKey}
              disabled={!apiKey.trim() || saving}
            >
              {saving ? "Saving..." : "Save API Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


