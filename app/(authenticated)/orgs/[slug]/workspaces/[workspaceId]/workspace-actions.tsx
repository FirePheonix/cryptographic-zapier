"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitForkIcon,
  GitPullRequestIcon,
  GitCommitHorizontalIcon,
  MoreVerticalIcon,
  PlayIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cloneWorkspace, commitDirectlyToMain } from "@/app/actions/workspace";
import { createPullRequest } from "@/app/actions/pull-request";
import { handleError } from "@/lib/error/handle";
import { createPROnChain } from "@/lib/solana/blockchain-actions";

interface WorkspaceActionsProps {
  workspace: {
    id: string;
    name: string;
    parentWorkspaceId: string | null;
    currentVersion: number;
  };
  slug: string;
  isFork: boolean;
  canEdit: boolean;
  userRole: "owner" | "reviewer" | "contributor" | null;
}

export function WorkspaceActions({
  workspace,
  slug,
  isFork,
  canEdit,
  userRole,
}: WorkspaceActionsProps) {
  const router = useRouter();
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Clone form state
  const [cloneName, setCloneName] = useState(`${workspace.name} (Fork)`);

  // PR form state
  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");

  // Commit form state
  const [commitMessage, setCommitMessage] = useState("");

  // Permissions
  const canCommitDirectly = isFork && (userRole === "owner" || userRole === "reviewer");
  const canCreatePR = isFork; // Everyone with a fork can create PR
  const canFork = !isFork; // Can only fork main workspaces

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !cloneName.trim()) return;

    setIsLoading(true);
    try {
      const result = await cloneWorkspace({
        sourceWorkspaceId: workspace.id,
        name: cloneName.trim(),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setCloneDialogOpen(false);
      router.push(`/orgs/${slug}/workspaces/${result.data?.id}`);
    } catch (error) {
      handleError("Error cloning workspace", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !prTitle.trim()) return;

    setIsLoading(true);
    try {
      // Step 1: Create PR in database
      const result = await createPullRequest({
        title: prTitle.trim(),
        description: prDescription.trim() || undefined,
        sourceWorkspaceId: workspace.id,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Step 2: Register PR on blockchain (Phantom will open)
      await createPROnChain(
        slug,
        workspace.id,
        workspace.parentWorkspaceId!,
        result.data!.id,
        prTitle.trim(),
        JSON.stringify({ version: workspace.currentVersion }),
        JSON.stringify({ version: result.data?.targetVersion || 1 })
      );

      setPrDialogOpen(false);
      // Navigate to the PR page
      router.push(`/orgs/${slug}/workspaces/${workspace.parentWorkspaceId}/pr/${result.data?.id}`);
    } catch (error) {
      handleError("Error creating pull request", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !commitMessage.trim()) return;

    setIsLoading(true);
    try {
      const result = await commitDirectlyToMain({
        forkWorkspaceId: workspace.id,
        commitMessage: commitMessage.trim(),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setCommitDialogOpen(false);
      // Navigate to the main workspace
      router.push(`/orgs/${slug}/workspaces/${workspace.parentWorkspaceId}`);
    } catch (error) {
      handleError("Error committing changes", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button asChild>
            <Link href={`/orgs/${slug}/workspaces/${workspace.id}/edit`}>
              <PlayIcon className="size-4 mr-2" />
              Edit Workflow
            </Link>
          </Button>
        )}

        {/* Fork button - only on main workspaces */}
        {canFork && (
          <Button variant="outline" onClick={() => setCloneDialogOpen(true)}>
            <GitForkIcon className="size-4 mr-2" />
            Fork
          </Button>
        )}

        {/* Create PR button - on forks, everyone can create PR */}
        {canCreatePR && (
          <Button variant="outline" onClick={() => setPrDialogOpen(true)}>
            <GitPullRequestIcon className="size-4 mr-2" />
            Create Pull Request
          </Button>
        )}

        {/* Commit Directly button - on forks, only owners/reviewers */}
        {canCommitDirectly && (
          <Button variant="outline" onClick={() => setCommitDialogOpen(true)}>
            <GitCommitHorizontalIcon className="size-4 mr-2" />
            Commit to Main
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/orgs/${slug}/workspaces/${workspace.id}/secrets`}>
                Manage Credentials
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/orgs/${slug}/workspaces/${workspace.id}/settings`}>
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork Workspace</DialogTitle>
            <DialogDescription>
              {userRole === "owner" || userRole === "reviewer" ? (
                <>
                  Create a copy of this workspace to make changes. After editing,
                  you can either commit directly to main or create a pull request for review.
                </>
              ) : (
                <>
                  Create a copy of this workspace to make changes. After editing,
                  you can submit your changes for review via a pull request.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClone} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">Fork Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="My Fork"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloneDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !cloneName.trim()}>
                {isLoading ? "Creating..." : "Create Fork"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PR Dialog */}
      <Dialog open={prDialogOpen} onOpenChange={setPrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pull Request</DialogTitle>
            <DialogDescription>
              Submit your changes for review. A reviewer will compare your
              changes and can approve or reject them.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePR} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pr-title">Title</Label>
              <Input
                id="pr-title"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="Add new email automation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pr-description">Description (Optional)</Label>
              <Textarea
                id="pr-description"
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                placeholder="Describe your changes..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPrDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !prTitle.trim()}>
                {isLoading ? "Creating..." : "Create Pull Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Commit Directly Dialog */}
      <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit Changes to Main</DialogTitle>
            <DialogDescription>
              As an {userRole === "owner" ? "owner" : "reviewer"}, you can commit 
              your changes directly to the main workspace without creating a pull request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCommitDirectly} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commit-message">Commit Message</Label>
              <Textarea
                id="commit-message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCommitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !commitMessage.trim()}>
                {isLoading ? "Committing..." : "Commit to Main"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
