"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GitForkIcon,
  GitPullRequestIcon,
  GitCommitHorizontalIcon,
  ArrowLeftIcon,
  HistoryIcon,
  SettingsIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useOrgWorkflow } from "@/providers/org-workflow";
import { cloneWorkspace, commitDirectlyToMain } from "@/app/actions/workspace";
import { createPullRequest } from "@/app/actions/pull-request";
import { handleError } from "@/lib/error/handle";
import { toast } from "sonner";

export const OrgGitControls = () => {
  const router = useRouter();
  const { workspace, slug, isFork, canCommitDirectly } = useOrgWorkflow();
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [forkName, setForkName] = useState(`${workspace?.name || "Workspace"} (Fork)`);
  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");
  const [commitMessage, setCommitMessage] = useState("");

  const handleFork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !forkName.trim() || !workspace) return;

    setIsLoading(true);
    try {
      const result = await cloneWorkspace({
        sourceWorkspaceId: workspace.id,
        name: forkName.trim(),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setForkDialogOpen(false);
      toast.success("Fork created successfully!");
      router.push(`/orgs/${slug}/workspaces/${result.data?.id}/edit`);
    } catch (error) {
      handleError("Error creating fork", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !prTitle.trim() || !workspace) return;

    setIsLoading(true);
    try {
      const result = await createPullRequest({
        title: prTitle.trim(),
        description: prDescription.trim() || undefined,
        sourceWorkspaceId: workspace.id,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setPrDialogOpen(false);
      toast.success("Pull request created!");
      router.push(`/orgs/${slug}/workspaces/${workspace.parentWorkspaceId}/pr/${result.data?.id}`);
    } catch (error) {
      handleError("Error creating pull request", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !commitMessage.trim() || !workspace) return;

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
      toast.success("Changes committed to main!");
      router.push(`/orgs/${slug}/workspaces/${workspace.parentWorkspaceId}/edit`);
    } catch (error) {
      handleError("Error committing changes", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!workspace) return null;

  return (
    <>
      {/* Top Left - Back & Workspace Info */}
      <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:right-auto">
        <div className="flex flex-1 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" asChild>
                <Link href={`/orgs/${slug}`}>
                  <ArrowLeftIcon size={16} />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Organization</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2 px-3">
            {isFork && <GitForkIcon size={14} className="text-muted-foreground" />}
            <span className="text-sm font-medium">{workspace.name}</span>
            <Badge variant="outline" className="text-xs">
              v{workspace.currentVersion}
            </Badge>
            {isFork && (
              <Badge variant="secondary" className="text-xs">
                Fork
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" asChild>
                <Link href={`/orgs/${slug}/workspaces/${workspace.id}/history`}>
                  <HistoryIcon size={16} />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Version History</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Top Right - Git Actions */}
      <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:left-auto">
        <div className="flex items-center gap-1 rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
          {/* Fork button - only on main workspaces */}
          {!isFork && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full gap-2 px-3"
                  onClick={() => setForkDialogOpen(true)}
                >
                  <GitForkIcon size={14} />
                  <span className="hidden sm:inline">Fork</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a fork to make changes</TooltipContent>
            </Tooltip>
          )}

          {/* PR button - on forks */}
          {isFork && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full gap-2 px-3"
                  onClick={() => setPrDialogOpen(true)}
                >
                  <GitPullRequestIcon size={14} />
                  <span className="hidden sm:inline">Create PR</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Submit changes for review</TooltipContent>
            </Tooltip>
          )}

          {/* Commit directly - on forks, for owners/reviewers */}
          {isFork && canCommitDirectly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full gap-2 px-3"
                  onClick={() => setCommitDialogOpen(true)}
                >
                  <GitCommitHorizontalIcon size={14} />
                  <span className="hidden sm:inline">Commit to Main</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Commit changes directly to main</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" asChild>
                <Link href={`/orgs/${slug}/workspaces/${workspace.id}/settings`}>
                  <SettingsIcon size={16} />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Workspace Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Fork Dialog */}
      <Dialog open={forkDialogOpen} onOpenChange={setForkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fork Workspace</DialogTitle>
            <DialogDescription>
              {canCommitDirectly ? (
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
          <form onSubmit={handleFork} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fork-name">Fork Name</Label>
              <Input
                id="fork-name"
                value={forkName}
                onChange={(e) => setForkName(e.target.value)}
                placeholder="My Fork"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !forkName.trim()}>
                {isLoading ? (
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                ) : (
                  <GitForkIcon className="size-4 mr-2" />
                )}
                Create Fork
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
                {isLoading ? (
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                ) : (
                  <GitPullRequestIcon className="size-4 mr-2" />
                )}
                Create Pull Request
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
              As an {workspace.userRole === "owner" ? "owner" : "reviewer"}, you can commit
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
                {isLoading ? (
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                ) : (
                  <GitCommitHorizontalIcon className="size-4 mr-2" />
                )}
                Commit to Main
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};


