import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  GitCommitHorizontalIcon,
  GitForkIcon,
  ClockIcon,
  UserIcon,
} from "lucide-react";
import { currentUserProfile, currentUser } from "@/lib/auth";
import { getWorkspace, getWorkspaceHistory } from "@/app/actions/workspace";
import { getOrganizationBySlug } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface WorkspaceHistoryPageProps {
  params: Promise<{ slug: string; workspaceId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Version History - Zynthex",
    description: "View workspace version history",
  };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function WorkspaceHistoryPage({ params }: WorkspaceHistoryPageProps) {
  const profile = await currentUserProfile();
  const user = await currentUser();
  const { slug, workspaceId } = await params;

  if (!profile || !user) {
    return redirect("/auth/login");
  }

  const orgResult = await getOrganizationBySlug(slug);
  if (!orgResult.success || !orgResult.data) {
    return notFound();
  }

  const workspaceResult = await getWorkspace(workspaceId);
  if (!workspaceResult.success || !workspaceResult.data) {
    return notFound();
  }

  const historyResult = await getWorkspaceHistory(workspaceId);
  const history = historyResult.success ? historyResult.data : [];

  const workspace = workspaceResult.data;
  const isFork = !!workspace.parentWorkspaceId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}/workspaces/${workspaceId}/edit`}>
              <ArrowLeftIcon className="size-4 mr-2" />
              Back to Editor
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {isFork && <GitForkIcon className="size-4 text-muted-foreground" />}
            <span className="font-medium">{workspace.name}</span>
            <Badge variant="outline">v{workspace.currentVersion}</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClockIcon className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Version History</h1>
              <p className="text-muted-foreground">
                {history?.length || 0} commit{(history?.length || 0) !== 1 ? "s" : ""} in this workspace
              </p>
            </div>
          </div>

          {/* Git Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-border" />

            {/* Commits */}
            <div className="space-y-0">
              {history?.map((version, index) => {
                const isLatest = index === 0;
                const isFirst = index === (history?.length || 0) - 1;

                return (
                  <div key={version.id} className="relative pl-12 pb-8 group">
                    {/* Commit dot */}
                    <div
                      className={cn(
                        "absolute left-[11px] top-1 size-[18px] rounded-full border-2 flex items-center justify-center",
                        isLatest
                          ? "bg-primary border-primary"
                          : "bg-background border-border group-hover:border-primary/50"
                      )}
                    >
                      {isLatest && (
                        <GitCommitHorizontalIcon className="size-3 text-primary-foreground" />
                      )}
                    </div>

                    {/* Commit card */}
                    <div
                      className={cn(
                        "rounded-lg border p-4 transition-colors",
                        isLatest
                          ? "border-primary/30 bg-primary/5"
                          : "hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium text-muted-foreground">
                              v{version.version}
                            </span>
                            {isLatest && (
                              <Badge variant="default" className="text-xs">
                                HEAD
                              </Badge>
                            )}
                            {isFirst && (
                              <Badge variant="outline" className="text-xs">
                                Initial
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-foreground truncate">
                            {version.message || `Version ${version.version}`}
                          </p>
                        </div>

                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/orgs/${slug}/workspaces/${workspaceId}/history/${version.version}`}
                          >
                            View
                          </Link>
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="size-5">
                            <AvatarFallback className="text-[10px]">
                              <UserIcon className="size-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[150px]">
                            {version.createdByUserId?.slice(0, 8) || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="size-3.5" />
                          <time
                            dateTime={new Date(version.createdAt).toISOString()}
                            title={formatDate(version.createdAt)}
                          >
                            {formatTimeAgo(version.createdAt)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {(!history || history.length === 0) && (
                <div className="text-center py-12">
                  <GitCommitHorizontalIcon className="size-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-1">No commits yet</h3>
                  <p className="text-muted-foreground">
                    Start editing to create your first version.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
