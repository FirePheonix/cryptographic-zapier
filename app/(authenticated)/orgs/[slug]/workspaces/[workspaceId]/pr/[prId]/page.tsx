import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  GitPullRequestIcon,
  CheckCircleIcon,
  XCircleIcon,
  GitMergeIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getPullRequest } from "@/app/actions/pull-request";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRActions } from "./pr-actions";
import { PRComments } from "./pr-comments";
import { PRDiffTabs } from "./pr-diff-tabs";

interface PRPageProps {
  params: Promise<{ slug: string; workspaceId: string; prId: string }>;
}

export async function generateMetadata({ params }: PRPageProps): Promise<Metadata> {
  return {
    title: "Pull Request - Veriflow",
    description: "Review workflow changes",
  };
}

export default async function PullRequestPage({ params }: PRPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug, workspaceId, prId } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  const prResult = await getPullRequest(prId);
  if (!prResult.success || !prResult.data) {
    return notFound();
  }

  const pr = prResult.data;

  const statusColors = {
    open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    merged: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  const statusIcons = {
    open: <GitPullRequestIcon className="size-4" />,
    approved: <CheckCircleIcon className="size-4" />,
    rejected: <XCircleIcon className="size-4" />,
    merged: <GitMergeIcon className="size-4" />,
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/orgs/${slug}/workspaces/${workspaceId}`}>
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{pr.title}</h1>
                  <Badge className={statusColors[pr.status]}>
                    {statusIcons[pr.status]}
                    <span className="ml-1 capitalize">{pr.status}</span>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {pr.sourceWorkspace?.name} v{pr.sourceVersion} →{" "}
                  {pr.targetWorkspace?.name} v{pr.targetVersion}
                </p>
              </div>
            </div>
            {pr.canReview && pr.status === "open" && (
              <PRActions prId={prId} slug={slug} workspaceId={workspaceId} />
            )}
            {pr.canMerge && pr.status === "approved" && (
              <PRActions
                prId={prId}
                slug={slug}
                workspaceId={workspaceId}
                showMerge
                sourceWorkspaceId={pr.sourceWorkspaceId}
                mergeContent={pr.sourceWorkflowContent}
              />
            )}
            {/* View source workflow button */}
            <Button variant="outline" size="sm" asChild>
              <Link 
                href={`/orgs/${slug}/workspaces/${pr.sourceWorkspaceId}/edit`}
                target="_blank"
              >
                <ExternalLinkIcon className="size-4 mr-2" />
                View Source Workflow
              </Link>
            </Button>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Description */}
              {pr.description && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm">{pr.description}</p>
                </div>
              )}

              {/* Diff View */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Changes</h2>
                <PRDiffTabs 
                  diff={pr.diff}
                  sourceWorkflow={{
                    nodes: pr.sourceWorkflowContent?.nodes || [],
                    edges: pr.sourceWorkflowContent?.edges || [],
                    name: pr.sourceWorkspace?.name || "Source",
                    version: pr.sourceVersion,
                  }}
                  targetWorkflow={{
                    nodes: pr.targetWorkflowContent?.nodes || [],
                    edges: pr.targetWorkflowContent?.edges || [],
                    name: pr.targetWorkspace?.name || "Target",
                    version: pr.targetVersion,
                  }}
                />
              </div>

              {/* Comments */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquareIcon className="size-5" />
                  Comments ({pr.comments?.length || 0})
                </h2>
                <PRComments prId={prId} comments={pr.comments || []} />
              </div>

              {/* Timeline */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(pr.createdAt).toLocaleString()} by{" "}
                  {pr.createdByUserId}
                </p>
                {pr.reviewedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reviewed {new Date(pr.reviewedAt).toLocaleString()} by{" "}
                    {pr.reviewedByUserId}
                  </p>
                )}
                {pr.mergedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Merged {new Date(pr.mergedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
