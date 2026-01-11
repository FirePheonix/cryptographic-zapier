"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BindSecretDialogProps {
  workspaceId: string;
  credentialRef: string;
  nodeType?: string;
}

// This would be fetched from the user's connected accounts
const MOCK_CONNECTED_ACCOUNTS = [
  { id: "google-1", name: "personal@gmail.com", provider: "google" },
  { id: "google-2", name: "work@company.com", provider: "google" },
  { id: "openai-1", name: "OpenAI API Key", provider: "openai" },
];

export function BindSecretDialog({
  workspaceId,
  credentialRef,
  nodeType,
}: BindSecretDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");

  // Filter accounts based on node type
  const availableAccounts = MOCK_CONNECTED_ACCOUNTS.filter((account) => {
    if (nodeType?.toLowerCase().includes("gmail")) {
      return account.provider === "google";
    }
    if (nodeType?.toLowerCase().includes("openai")) {
      return account.provider === "openai";
    }
    return true;
  });

  async function handleBind() {
    if (!selectedAccount) {
      toast.error("Please select an account");
      return;
    }

    setIsBinding(true);
    try {
      // In production, this would call a server action to bind the secret
      // await bindWorkspaceSecret(workspaceId, credentialRef, selectedAccount);
      
      // Simulated success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success("Credential bound successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to bind credential");
    } finally {
      setIsBinding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LinkIcon className="mr-2 size-3" />
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Credential</DialogTitle>
          <DialogDescription>
            Select one of your connected accounts to use for this{" "}
            {nodeType || "node"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account">Select Account</Label>
            <Select
              value={selectedAccount}
              onValueChange={setSelectedAccount}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.length > 0 ? (
                  availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No matching accounts
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {availableAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You don't have any connected accounts that match this credential
              type. Go to your profile settings to connect accounts.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isBinding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBind}
            disabled={isBinding || !selectedAccount}
          >
            {isBinding && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
