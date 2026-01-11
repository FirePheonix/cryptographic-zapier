"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, XIcon, GitMergeIcon, Loader2Icon, ShieldCheck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approvePullRequest, rejectPullRequest, mergePullRequest } from "@/app/actions/pull-request";
import { toast } from "sonner";
import { approvePROnChain, mergePROnChain } from "@/lib/solana/blockchain-actions";

interface PRActionsProps {
  prId: string;
  slug: string;
  workspaceId: string;
  showMerge?: boolean;
  sourceWorkspaceId?: string;
  mergeContent?: any;
  targetVersion?: number;
}

export function PRActions({ prId, slug, workspaceId, showMerge, sourceWorkspaceId, mergeContent, targetVersion = 1 }: PRActionsProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  async function handleApprove() {
    setIsApproving(true);
    try {
      // Step 1: Record approval on blockchain
      await approvePROnChain(
        slug,
        sourceWorkspaceId || workspaceId,
        workspaceId,
        prId
      );

      // Step 2: Approve in database
      const result = await approvePullRequest(prId);
      if (result.success) {
        toast.success("Pull request approved");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to approve pull request");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsRejecting(true);
    try {
      const result = await rejectPullRequest(prId, rejectReason);
      if (result.success) {
        toast.success("Pull request rejected");
        setRejectDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reject pull request");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleMerge() {
    setIsMerging(true);
    
    try {
      // Step 1: Record merge on blockchain
      await mergePROnChain(
        slug,
        sourceWorkspaceId || workspaceId,
        workspaceId,
        prId,
        JSON.stringify(mergeContent || {}),
        `Merge PR #${prId}`,
        targetVersion + 1
      );

      // Step 2: Merge in database
      const result = await mergePullRequest(prId);
      if (result.success) {
        toast.success("Pull request merged successfully!");
        router.push(`/orgs/${slug}/workspaces/${workspaceId}`);
      } else {
        toast.error(result.error || "Failed to merge pull request");
      }
    } catch (error: any) {
      console.error("Merge error:", error);
      if (error?.message?.includes("User rejected") || error?.code === 4001) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error("Failed to record merge on blockchain");
      }
    } finally {
      setIsMerging(false);
    }
  }

  if (showMerge) {
    return (
      <Button 
        className="gap-2" 
        onClick={handleMerge}
        disabled={isMerging}
      >
        {isMerging ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <GitMergeIcon className="size-4" />
        )}
        {isMerging ? "Signing..." : "Merge"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="gap-2"
        onClick={handleApprove}
        disabled={isApproving}
      >
        {isApproving ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <CheckIcon className="size-4" />
        )}
        Approve
      </Button>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 text-destructive">
            <XIcon className="size-4" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Pull Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this pull request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this pull request is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
